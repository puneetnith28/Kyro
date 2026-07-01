from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict, Any

class ContextCaptureRequest(BaseModel):
    url: HttpUrl = Field(..., description="The URL where the context was captured")
    title: str = Field(..., min_length=1, description="Page title")
    domain: str = Field(..., min_length=1, description="Website domain")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    type: Optional[str] = Field("page_view", description="Type of capture event")
    text: Optional[str] = Field(None, description="The captured text content")
    metadata: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$", description="Role of the sender")
    content: str = Field(..., min_length=1, description="Message content")

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    related_memories: List[dict] = []

class ApiKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=10, description="The Gemini API Key")

class GraphNode(BaseModel):
    id: str
    data: Dict[str, Any]
    position: Dict[str, float]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class RecentCapturesResponse(BaseModel):
    captures: List[Dict[str, Any]]

class FeedbackRequest(BaseModel):
    memory_ids: List[str] = Field(..., description="The IDs of the memories used for the response")
    rating: int = Field(..., description="1 for Thumbs Up, -1 for Thumbs Down")

class CustomIngestionRequest(BaseModel):
    title: str = Field(..., min_length=1, description="Title of the custom document")
    text: str = Field(..., min_length=1, description="The core text content to ingest")
    url: Optional[str] = Field("custom://api-ingest", description="Optional source URL or identifier")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional extra JSON metadata")
