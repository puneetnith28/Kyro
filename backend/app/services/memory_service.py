from dotenv import load_dotenv
import cognee

load_dotenv()

async def setup_cognee():
    """Initialize Cognee with Gemini LLM provider"""
    # Note: Currently assumes Gemini API key is in environment variables.
    cognee.config.set_llm_provider("gemini")
    cognee.config.set_llm_model("gemini-1.5-pro")
    
    # We use local LanceDB/NetworkX by default in Cognee for MVP
    # Later we can configure PostgreSQL here.
    
    # Ensure system is ready
    await cognee.prune.prune_system(metadata=True)
    print("Cognee Initialized with Gemini")

def semantic_chunk_text(text: str, max_chunk_size: int = 1000) -> list[str]:
    """
    Intelligently splits long text into semantically coherent chunks.
    It attempts to split by paragraphs first, then by single newlines, and finally by periods.
    """
    if not text:
        return []
        
    if len(text) <= max_chunk_size:
        return [text]
        
    chunks = []
    
    # 1. Split by paragraphs (double newlines)
    paragraphs = text.split("\n\n")
    
    current_chunk = ""
    
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
            
        if len(current_chunk) + len(p) + 2 <= max_chunk_size:
            current_chunk += p + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            
            # If a single paragraph is STILL larger than max_chunk_size, split by sentences
            if len(p) > max_chunk_size:
                sentences = p.replace(". ", ".[SPLIT]").split("[SPLIT]")
                temp_chunk = ""
                for sentence in sentences:
                    if len(temp_chunk) + len(sentence) + 1 <= max_chunk_size:
                        temp_chunk += sentence + " "
                    else:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                        temp_chunk = sentence + " "
                if temp_chunk:
                    current_chunk = temp_chunk
            else:
                current_chunk = p + "\n\n"
                
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

async def add_memory(context_data: dict):
    """
    Ingest text into Cognee to build the knowledge graph using Semantic Chunking.
    """
    text = context_data.get("text", "")
    url = context_data.get("url", "")
    title = context_data.get("title", "")
    domain = context_data.get("domain", "")

    
    if not text:
        text = f"Visited: {title} at {url}"
        
    dataset_name = "kyro_memories"
    
    # Run Semantic Chunking algorithm
    chunks = semantic_chunk_text(text, max_chunk_size=1000)
    
    # Smart Source Formatting
    source_parts = []
    if title:
        source_parts.append(f"Source: {title}")
    if domain:
        source_parts.append(f"Domain: {domain}")
    if url:
        source_parts.append(f"URL: {url}")
    source_tag = f"[{' | '.join(source_parts)}]" if source_parts else "[Source: Unknown]"
    
    # Add chunks to cognee memory graph
    # By adding them to the same dataset with same metadata context, they remain linked
    for i, chunk in enumerate(chunks):
        chunk_text = f"{source_tag} (Part {i+1}/{len(chunks)})\n{chunk}"
        await cognee.add(chunk_text, dataset_name=dataset_name)
    
    # Trigger cognitify to process added information into graph
    await cognee.cognitify()
    
    return True

# Simple in-memory cache for RLHF weights. In production, this would be stored in the DB.
MEMORY_WEIGHTS = {}

def adjust_memory_weights(memory_ids: list[str], rating: int):
    """
    Adjust the ranking weights of specific memories based on user feedback.
    Thumbs Up (1) boosts the score, Thumbs Down (-1) penalizes it.
    """
    weight_modifier = 0.2 * rating
    for mem_id in memory_ids:
        if mem_id not in MEMORY_WEIGHTS:
            MEMORY_WEIGHTS[mem_id] = 1.0
        # Prevent weights from dropping below 0.1 to avoid completely silencing memories
        MEMORY_WEIGHTS[mem_id] = max(0.1, MEMORY_WEIGHTS[mem_id] + weight_modifier)
    return True

async def search_memories(query: str):
    """
    Search the graph using a Hybrid Search Model (Vector Similarity + BM25 Keyword Search).
    Fuses the results using Reciprocal Rank Fusion (RRF) and applies RLHF weights.
    """
    from rank_bm25 import BM25Okapi
    
    # 1. Vector Search Pass (Semantic Similarity)
    try:
        vector_results = await cognee.search(query, search_type="SIMILARITY")
    except Exception as e:
        print(f"Vector search error: {e}")
        vector_results = []
        
    # Format vector results to standardize them
    v_results = []
    if isinstance(vector_results, list):
        for item in vector_results:
            # Cognee search results structure can vary depending on adapter
            if isinstance(item, dict) and "text" in item:
                v_results.append(item)
            elif hasattr(item, "text"):
                v_results.append({"text": item.text, "id": getattr(item, "id", str(item.text))})
            else:
                v_results.append({"text": str(item), "id": str(item)})
                
    # 2. BM25 Keyword Pass (Sparse Search)
    keyword_results = []
    try:
        graph_data = await get_graph_data()
        if graph_data and graph_data.get("nodes"):
            corpus_nodes = graph_data["nodes"]
            corpus_texts = []
            
            for node in corpus_nodes:
                if isinstance(node, dict):
                    corpus_texts.append(str(node.get("id", "")))
                elif isinstance(node, tuple):
                    corpus_texts.append(str(node[0]))
                else:
                    corpus_texts.append(str(node))
                    
            tokenized_corpus = [doc.lower().split(" ") for doc in corpus_texts]
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = query.lower().split(" ")
            
            # Get top N BM25 scores
            bm25_scores = bm25.get_scores(tokenized_query)
            top_n = min(10, len(corpus_texts))
            # Sort indices by score descending
            top_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:top_n]
            
            for idx in top_indices:
                if bm25_scores[idx] > 0:
                    keyword_results.append({"text": corpus_texts[idx], "id": corpus_texts[idx], "score": float(bm25_scores[idx])})
    except Exception as e:
        print(f"BM25 search error: {e}")

    # 3. Reciprocal Rank Fusion (RRF)
    # RRF formula: score = 1 / (k + rank)
    k = 60
    rrf_scores = {}
    memory_id_map = {}
    
    for rank, item in enumerate(v_results):
        text = item.get("text", "")
        mem_id = item.get("id", text)
        memory_id_map[text] = mem_id
        if text not in rrf_scores:
            rrf_scores[text] = 0
        rrf_scores[text] += 1.0 / (k + rank + 1)
        
    for rank, item in enumerate(keyword_results):
        text = item.get("text", "")
        mem_id = item.get("id", text)
        memory_id_map[text] = mem_id
        if text not in rrf_scores:
            rrf_scores[text] = 0
        rrf_scores[text] += 1.0 / (k + rank + 1)
        
    # 4. Apply RLHF Weights
    for text in rrf_scores:
        mem_id = memory_id_map.get(text, text)
        weight = MEMORY_WEIGHTS.get(mem_id, 1.0)
        rrf_scores[text] = rrf_scores[text] * weight
        
    # Sort by Final RRF score descending
    fused_results = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Format the final output to match standard expected payload
    final_results = [{"text": res[0], "id": memory_id_map.get(res[0], res[0]), "rrf_score": res[1]} for res in fused_results[:10]]
    
    # If both searches failed or returned nothing, return an empty list
    if not final_results:
        return []
        
    return final_results

async def get_graph_data():
    """
    Retrieve nodes and edges from Cognee's internal graph representation.
    """
    try:
        from cognee.infrastructure.databases.graph import get_graph_engine
        engine = await get_graph_engine()
        
        if hasattr(engine, "get_graph_data"):
            nodes, edges = await engine.get_graph_data()
            return {"nodes": nodes, "edges": edges}
        
        return None
    except Exception as e:
        print(f"Error extracting graph data from Cognee: {e}")
        return None
async def prune_stale_memories():
    """
    Scans the graph for duplicate nodes (based on exact label/content matches)
    and removes the stale copies to save space and improve context relevance.
    """
    try:
        from cognee.infrastructure.databases.graph import get_graph_engine
        engine = await get_graph_engine()
        
        if not hasattr(engine, "get_graph_data") or not hasattr(engine, "delete_node"):
            return {"status": "skipped", "message": "Graph engine does not support direct pruning."}
            
        nodes, edges = await engine.get_graph_data()
        if not nodes:
            return {"status": "success", "message": "Graph is empty, nothing to prune.", "pruned_count": 0}
            
        seen_labels = set()
        duplicates_to_delete = []
        
        for node in nodes:
            node_id = node.get("id") if isinstance(node, dict) else (node[0] if isinstance(node, tuple) else None)
            label = node.get("id") if isinstance(node, dict) else (node[0] if isinstance(node, tuple) else None)
            
            if not node_id or not label:
                continue
                
            label_str = str(label).strip().lower()
            
            if label_str in seen_labels:
                duplicates_to_delete.append(node_id)
            else:
                seen_labels.add(label_str)
                
        # Delete the identified duplicates
        for node_id in duplicates_to_delete:
            try:
                await engine.delete_node(node_id)
                print(f"Pruned duplicate node: {node_id}")
            except Exception as e:
                print(f"Failed to delete node {node_id}: {e}")
                
        return {
            "status": "success", 
            "message": f"Successfully pruned {len(duplicates_to_delete)} duplicate memory nodes.",
            "pruned_count": len(duplicates_to_delete)
        }
    except Exception as e:
        print(f"Error during graph pruning: {e}")
        return {"status": "error", "message": str(e), "pruned_count": 0}
