from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from app.models.schemas import ContextCaptureRequest, ChatRequest, ChatResponse, ApiKeyRequest, GraphResponse, RecentCapturesResponse, FeedbackRequest, CustomIngestionRequest
from app.services.memory_service import add_memory, search_memories, prune_stale_memories
import google.generativeai as genai
import os
import json
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Initialize Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-pro')

router = APIRouter()

recent_captures = []

@router.post("/capture")
async def capture_context(request: ContextCaptureRequest):
    """
    Endpoint for the browser extension to push captured context.
    """
    try:
        # Cache for the live feed
        global recent_captures
        capture_data = request.dict()
        recent_captures.insert(0, capture_data)
        if len(recent_captures) > 50:
            recent_captures.pop()
            
        # Send data to Cognee memory service
        await add_memory(capture_data)
        logger.info(f"Captured and Cognitified: {request.title} from {request.domain}")
        return {"status": "success", "message": "Context captured and sent to memory pipeline."}
    except Exception as e:
        logger.error(f"Error capturing context: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/capture")
async def websocket_capture(websocket: WebSocket):
    """
    WebSocket endpoint for the browser extension to push captured context continuously.
    """
    await websocket.accept()
    logger.info("WebSocket connection established with extension.")
    try:
        global recent_captures
        while True:
            # Wait for data from the extension
            data = await websocket.receive_text()
            try:
                capture_data = json.loads(data)
                
                # Cache for the live feed
                if capture_data.get("type") == "BATCH":
                    payloads = capture_data.get("payloads", [])
                    for payload in payloads:
                        recent_captures.insert(0, payload)
                        if len(recent_captures) > 50:
                            recent_captures.pop()
                        await add_memory(payload)
                        logger.info(f"Captured (WS Batch) and Cognitified: {payload.get('title')} from {payload.get('domain')}")
                else:
                    recent_captures.insert(0, capture_data)
                    if len(recent_captures) > 50:
                        recent_captures.pop()
                    await add_memory(capture_data)
                    logger.info(f"Captured (WS Single) and Cognitified: {capture_data.get('title')} from {capture_data.get('domain')}")
                
                # Acknowledge receipt
                await websocket.send_json({"status": "success", "message": "Context batch processed."})
            except json.JSONDecodeError:
                logger.error("Invalid JSON received over WS")
                await websocket.send_json({"status": "error", "message": "Invalid JSON"})
            except Exception as inner_e:
                logger.error(f"Error processing WS payload: {str(inner_e)}", exc_info=True)
                await websocket.send_json({"status": "error", "message": str(inner_e)})
    except WebSocketDisconnect:
        logger.info("Extension disconnected from WebSocket.")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)

@router.get("/recent", response_model=RecentCapturesResponse)
async def get_recent_captures():
    """
    Endpoint to fetch the recent memory captures for the Live Feed.
    """
    return {"captures": recent_captures}

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Endpoint for the Next.js Dashboard to interact with the AI.
    """
    try:
        # Extract the latest user query
        user_msg = request.messages[-1].content
        
        # Extract conversational history (last 5 messages excluding the current one)
        chat_history = ""
        if len(request.messages) > 1:
            history_messages = request.messages[-6:-1]
            for msg in history_messages:
                role = "User" if msg.role == "user" else "Kyro"
                chat_history += f"{role}: {msg.content}\n"
        
        # 1. Retrieve relevant memories from Cognee using the latest query
        memories = await search_memories(user_msg)
        
        # Format memories for the prompt
        context_text = ""
        related_memories = []
        if memories:
            for i, mem in enumerate(memories):
                context_text += f"[{i+1}] {mem.get('text', '')}\n"
                related_memories.append({"id": mem.get('id', str(i)), "label": mem.get('text', '')[:30] + "..."})
                
        # 2. Generate response using Gemini bounded to retrieved memories with Chain of Thought
        prompt = f"""You are Kyro, an advanced AI assistant with a perfect memory powered by a Cognee Knowledge Graph.
        
        The user has asked a question. You MUST answer it using ONLY the retrieved memories below and the context of the Conversation History.
        If the memories do not contain the answer, explicitly state that you don't remember any context about that. Do not hallucinate external knowledge.
        
        INSTRUCTIONS (Chain of Thought):
        Before answering, silently analyze the retrieved memories step-by-step to determine how they relate to the user's question.
        1. Identify the core entities in the user's question.
        2. Scan the retrieved memories for direct mentions or semantic matches to these entities.
        3. Synthesize the relevant facts into a coherent, accurate answer.
        
        FORMAT YOUR RESPONSE AS:
        **Analysis:** (A brief 1-2 sentence summary of how you arrived at the answer based on the memories)
        **Answer:** (Your final synthesized answer)
        
        Conversation History:
        {chat_history if chat_history else "No previous conversation."}
        
        Retrieved Memories:
        {context_text if context_text else "No memories found."}
        
        User Question: {user_msg}
        """
        
        response = model.generate_content(prompt)
        
        return ChatResponse(
            answer=response.text,
            sources=[],
            related_memories=related_memories
        )
    except Exception as e:
        logger.error(f"Error during chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/graph", response_model=GraphResponse)
async def get_knowledge_graph(date: str = None):
    """
    Endpoint to retrieve graph nodes and edges for React Flow visualization.
    Pulls native graph data directly from Cognee.
    Includes Time-Travel capability via the optional `date` query parameter.
    """
    import math
    import random
    from datetime import datetime, timedelta
    from app.services.memory_service import get_graph_data as fetch_cognee_graph
    
    cognee_graph = await fetch_cognee_graph()
    
    if cognee_graph and cognee_graph.get("nodes"):
        rf_nodes = []
        rf_edges = []
        
        raw_nodes = cognee_graph["nodes"]
        raw_edges = cognee_graph["edges"]
        
        # Parse the requested time-travel date if provided
        target_date = None
        if date:
            try:
                # Expecting ISO format or YYYY-MM-DD
                target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            except Exception:
                target_date = None

        # Spiral Layout Algorithm for React Flow Coordinate mapping
        center_x = 400
        center_y = 300
        angle = 0
        radius = 50
        
        # We need a list of valid node IDs that survived the time filter
        valid_node_ids = set()
        
        # Map Nodes
        for i, node in enumerate(raw_nodes):
            # Try to grab a label safely depending on what cognee returns (dict or tuple)
            node_id = str(node.get("id", i)) if isinstance(node, dict) else str(node[0] if isinstance(node, tuple) else node)
            label = node.get("id", str(node)) if isinstance(node, dict) else str(node[0] if isinstance(node, tuple) else node)
            
            # Extract type
            node_type = "Concept"
            if isinstance(node, tuple) and len(node) > 1 and isinstance(node[1], dict):
                node_type = node[1].get("type", node_type)
            else:
                # For MVP demo purposes, randomly assign if Cognee doesn't provide one
                node_type = random.choice(["Person", "Document", "Concept", "Repository"])
                
            # MVP Hackathon: Mock timestamps if they don't exist natively yet
            # Distribute nodes randomly over the last 30 days
            mock_created_at = datetime.now() - timedelta(days=(i % 30))
            
            # TIME TRAVEL FILTERING: If a date is provided, filter out nodes created AFTER that date
            if target_date and mock_created_at > target_date:
                continue # Skip this node! It didn't exist yet!
                
            valid_node_ids.add(node_id)
            
            # Optimize layout algorithm dynamically for huge graphs
            # We widen the spiral gap if there are thousands of nodes to prevent visual crushing
            radius_step = 5 if len(raw_nodes) < 1000 else 15
            angle_step = 0.5 if len(raw_nodes) < 1000 else 0.1
            
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            
            angle += angle_step
            radius += radius_step
            
            rf_nodes.append({
                "id": node_id,
                "data": {"label": label[:30], "type": node_type, "created_at": mock_created_at.isoformat()},
                "position": {"x": x, "y": y}
            })
            
        # Map Edges
        for i, edge in enumerate(raw_edges):
            if isinstance(edge, dict):
                source = str(edge.get("source", ""))
                target = str(edge.get("target", ""))
            elif isinstance(edge, tuple) and len(edge) >= 2:
                source = str(edge[0])
                target = str(edge[1])
            else:
                continue
                
            # TIME TRAVEL FILTERING: Ensure both source and target existed at this point in time
            if source not in valid_node_ids or target not in valid_node_ids:
                continue
                
            rf_edges.append({
                "id": f"e_{source}_{target}_{i}",
                "source": source,
                "target": target
            })
            
        if not rf_nodes:
            # Fallback if time-travel filtered everything
            return {
                "nodes": [{"id": "core", "data": {"label": "Kyro Core (Empty Graph)", "type": "Concept"}, "position": {"x": 400, "y": 250}}],
                "edges": []
            }
            
        return {
            "nodes": rf_nodes,
            "edges": rf_edges
        }

    # Fallback to a beautiful mock graph for the Hackathon Demo if the database is currently empty
    nodes = [
        {"id": "core", "data": {"label": "Kyro Context OS", "type": "Concept"}, "position": {"x": 400, "y": 300}},
        {"id": "n1", "data": {"label": "React Flow", "type": "Repository"}, "position": {"x": 550, "y": 250}},
        {"id": "n2", "data": {"label": "FastAPI Backend", "type": "Document"}, "position": {"x": 300, "y": 150}},
        {"id": "n3", "data": {"label": "Graph Optimization", "type": "Concept"}, "position": {"x": 600, "y": 400}},
        {"id": "n4", "data": {"label": "Puneet Yadav", "type": "Person"}, "position": {"x": 250, "y": 450}},
        {"id": "n5", "data": {"label": "Cognee Knowledge Graph", "type": "Repository"}, "position": {"x": 450, "y": 100}},
        {"id": "n6", "data": {"label": "Time Travel Engine", "type": "Concept"}, "position": {"x": 200, "y": 300}},
    ]
    
    edges = [
        {"id": "e_core_n1", "source": "core", "target": "n1"},
        {"id": "e_core_n2", "source": "core", "target": "n2"},
        {"id": "e_core_n4", "source": "core", "target": "n4"},
        {"id": "e_n1_n3", "source": "n1", "target": "n3"},
        {"id": "e_core_n5", "source": "core", "target": "n5"},
        {"id": "e_n4_n6", "source": "n4", "target": "n6"},
        {"id": "e_n6_n3", "source": "n6", "target": "n3"},
    ]
    
    return {
        "nodes": nodes,
        "edges": edges
    }

@router.post("/settings/apikey")
async def update_api_key(request: ApiKeyRequest):
    """
    Dynamically update the Gemini API key used by the backend.
    """
    try:
        os.environ["GEMINI_API_KEY"] = request.api_key
        # Re-configure Google Generative AI
        genai.configure(api_key=request.api_key)
        
        # We might also need to re-initialize Cognee if it cached the key
        from app.services.memory_service import setup_cognee
        await setup_cognee()
        
        logger.info("Successfully updated Gemini API Key dynamically.")
        return {"status": "success", "message": "API Key updated successfully"}
    except Exception as e:
        logger.error(f"Error updating API key: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prune")
async def prune_graph_endpoint():
    """
    Endpoint to trigger the graph pruning algorithm.
    Scans the underlying Cognee database for duplicate memory nodes and deletes them.
    """
    try:
        logger.info("Starting graph pruning algorithm...")
        result = await prune_stale_memories()
        logger.info(f"Graph pruning complete: {result}")
        
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
            
        return result
    except Exception as e:
        logger.error(f"Error in /prune endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Endpoint for submitting user feedback (RLHF) on a chat response.
    Updates the weight of the memories used in the response.
    """
    try:
        from app.services.memory_service import adjust_memory_weights
        
        adjust_memory_weights(request.memory_ids, request.rating)
        
        action = "boosted" if request.rating > 0 else "penalized"
        logger.info(f"RLHF Feedback received. {len(request.memory_ids)} memories {action}.")
        
        return {"status": "success", "message": f"Feedback applied. Memories {action}."}
    except Exception as e:
        logger.error(f"Error applying feedback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest/email")
async def trigger_email_ingestion():
    """
    Manual trigger to fetch unread emails via IMAP and ingest them into the memory graph.
    """
    try:
        from app.services.email_service import fetch_unread_emails
        logger.info("Starting manual email ingestion sync...")
        result = await fetch_unread_emails()
        
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
            
        return result
    except Exception as e:
        logger.error(f"Error triggering email sync: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import Request
@router.post("/webhooks/github")
async def github_webhook(request: Request):
    """
    Endpoint to receive and process GitHub Webhook events.
    Currently tracks push (commits), pull_request, and issues events.
    """
    try:
        # Get the event type from GitHub headers
        event_type = request.headers.get("X-GitHub-Event")
        if not event_type:
            return {"status": "ignored", "message": "Missing X-GitHub-Event header"}
            
        payload = await request.json()
        repository = payload.get("repository", {}).get("full_name", "Unknown Repo")
        repo_url = payload.get("repository", {}).get("html_url", "https://github.com")
        sender = payload.get("sender", {}).get("login", "Unknown User")
        
        memories_added = 0
        
        if event_type == "push":
            commits = payload.get("commits", [])
            for commit in commits:
                msg = commit.get("message", "")
                author = commit.get("author", {}).get("name", sender)
                url = commit.get("url", repo_url)
                
                context_data = {
                    "title": f"Git Commit: {repository}",
                    "url": url,
                    "text": f"Repository: {repository}\nAuthor: {author}\nCommit Message: {msg}",
                    "type": "github_commit"
                }
                await add_memory(context_data)
                memories_added += 1
                
        elif event_type == "pull_request":
            action = payload.get("action")
            pr = payload.get("pull_request", {})
            title = pr.get("title", "")
            body = pr.get("body", "")
            url = pr.get("html_url", repo_url)
            
            context_data = {
                "title": f"Pull Request ({action}): {title}",
                "url": url,
                "text": f"Repository: {repository}\nAction: {action}\nPR Title: {title}\nDescription:\n{body}",
                "type": "github_pr"
            }
            await add_memory(context_data)
            memories_added += 1
            
        elif event_type == "issues":
            action = payload.get("action")
            issue = payload.get("issue", {})
            title = issue.get("title", "")
            body = issue.get("body", "")
            url = issue.get("html_url", repo_url)
            
            context_data = {
                "title": f"Issue ({action}): {title}",
                "url": url,
                "text": f"Repository: {repository}\nAction: {action}\nIssue Title: {title}\nDescription:\n{body}",
                "type": "github_issue"
            }
            await add_memory(context_data)
            memories_added += 1
        else:
            return {"status": "ignored", "message": f"Event type '{event_type}' not tracked."}
            
        logger.info(f"Processed GitHub Webhook ({event_type}) - Added {memories_added} memories.")
        return {"status": "success", "message": f"Processed {event_type} event", "memories_added": memories_added}
        
    except Exception as e:
        logger.error(f"Error processing GitHub webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File
import io
import pypdf

@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Endpoint to upload and ingest a PDF document.
    Extracts text from all pages and pushes it to the Semantic Chunker and Cognee Graph.
    """
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
            
        logger.info(f"Processing PDF upload: {file.filename}")
        
        # Read the file stream into memory
        contents = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(contents))
        
        extracted_text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            extracted_text += page.extract_text() + "\n\n"
            
        if not extracted_text.strip():
            return {"status": "ignored", "message": "No text could be extracted from the PDF."}
            
        # Push to memory service
        context_data = {
            "title": f"PDF Document: {file.filename}",
            "url": f"local://pdf/{file.filename}",
            "text": extracted_text,
            "type": "pdf_upload"
        }
        
        await add_memory(context_data)
        
        logger.info(f"Successfully ingested PDF: {file.filename} ({len(pdf_reader.pages)} pages)")
        
        return {
            "status": "success", 
            "message": f"Successfully ingested {file.filename}", 
            "pages": len(pdf_reader.pages)
        }
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest/custom")
async def ingest_custom_data(request: CustomIngestionRequest):
    """
    Generic RESTful endpoint to ingest arbitrary data into the Kyro memory graph.
    Useful for cURL scripts, Slack bots, or other custom integrations.
    """
    try:
        logger.info(f"Received custom ingestion request: {request.title}")
        
        context_data = {
            "title": request.title,
            "url": request.url,
            "text": request.text,
            "type": "custom_api",
            "metadata": request.metadata
        }
        
        await add_memory(context_data)
        
        return {"status": "success", "message": f"Successfully ingested: {request.title}"}
        
    except Exception as e:
        logger.error(f"Error in custom ingestion API: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/activity")
async def get_activity_heatmap():
    """
    Returns activity data for the last 90 days.
    For hackathon purposes, this dynamically generates a seeded heatmap
    and merges it with live recent_captures data for today.
    """
    import datetime
    import random
    
    try:
        activity = []
        today = datetime.date.today()
        
        # Generate 90 days of seeded data
        for i in range(89, -1, -1):
            date = today - datetime.timedelta(days=i)
            # Higher chance of 0 or 1, lower chance of 3 or 4
            weight = random.choices([0, 1, 2, 3, 4], weights=[40, 30, 15, 10, 5])[0]
            
            # If it's today, base it on actual recent captures
            if i == 0:
                global recent_captures
                capture_count = len(recent_captures)
                if capture_count == 0:
                    weight = 0
                elif capture_count < 3:
                    weight = 1
                elif capture_count < 10:
                    weight = 2
                elif capture_count < 20:
                    weight = 3
                else:
                    weight = 4
                    
            activity.append({
                "date": date.isoformat(),
                "count": weight
            })
            
        return {"activity": activity}
    except Exception as e:
        logger.error(f"Error generating activity heatmap: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
