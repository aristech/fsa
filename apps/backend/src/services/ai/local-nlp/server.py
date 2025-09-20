#!/usr/bin/env python3
"""
HTTP Server for Local NLP Service
Lightweight FastAPI server for task operations
"""

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    print("Missing dependencies. Install with:")
    print("pip install fastapi uvicorn")
    exit(1)

from main import LocalNLPProcessor, Intent
import json
import re
from typing import Optional, List, Dict

app = FastAPI(title="FSA Local NLP Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the processor
processor = LocalNLPProcessor()

def parse_entities_from_text(text: str) -> Dict[str, str]:
    """Parse entity={id} patterns from text and return as dictionary"""
    entities = {}
    valid_entity_types = ['task', 'work_order', 'personnel', 'project', 'client']

    # Find all entity={id} patterns
    matches = re.findall(r'(\w+)=\{([^}]+)\}', text)

    for entity_type, entity_id in matches:
        if entity_type in valid_entity_types:
            entities[entity_type] = entity_id
            print(f"[EntityParser] Found {entity_type}={entity_id}")
        else:
            print(f"[EntityParser] Invalid entity type: {entity_type}")

    return entities

class ProcessRequest(BaseModel):
    text: Optional[str] = None
    originalTxt: Optional[str] = None
    parsedTxt: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None

class EntityResponse(BaseModel):
    type: str
    value: str
    symbol: str

class ProcessResponse(BaseModel):
    intent: str
    title: str
    description: Optional[str]
    priority: str
    assignees: List[str]
    work_order: Optional[str]
    project: Optional[str]
    client: Optional[str]
    due_date: Optional[str]
    start_date: Optional[str]
    estimated_hours: Optional[float]
    entities: List[EntityResponse]
    confidence: float
    success: bool = True

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FSA Local NLP"}

@app.post("/process", response_model=ProcessResponse)
async def process_text(request: ProcessRequest):
    """Process natural language text for task operations"""
    try:
        # Handle both legacy string format and new structured payload
        if request.originalTxt and request.parsedTxt:
            # New structured payload format
            text_to_process = request.parsedTxt

            # Parse entities from the parsed text
            entities = parse_entities_from_text(request.parsedTxt)
            print(f"[LocalNLP] Processing structured payload:")
            print(f"  Original: {request.originalTxt}")
            print(f"  Parsed: {request.parsedTxt}")
            print(f"  Entities: {entities}")
        elif request.text:
            # Legacy string format
            text_to_process = request.text
            print(f"[LocalNLP] Processing legacy text: {request.text}")
        else:
            raise HTTPException(status_code=400, detail="Either 'text' or both 'originalTxt' and 'parsedTxt' must be provided")

        if not text_to_process.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Process the text
        result = processor.process(text_to_process)

        # Convert to response format
        entities = [
            EntityResponse(
                type=e.type,
                value=e.value,
                symbol=e.symbol
            ) for e in (result.entities or [])
        ]

        response = ProcessResponse(
            intent=result.intent.value,
            title=result.title,
            description=result.description,
            priority=result.priority.value,
            assignees=result.assignees or [],
            work_order=result.work_order,
            project=result.project,
            client=result.client,
            due_date=result.due_date,
            start_date=result.start_date,
            estimated_hours=result.estimated_hours,
            entities=entities,
            confidence=result.confidence
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.get("/test")
async def test_examples():
    """Test endpoint with example phrases"""
    examples = [
        "create a task in #Garden Care for tomorrow",
        "add task 'Plant watering' for @John Doe urgent priority",
        "schedule task for +Maintenance Project due friday",
        "new task &Acme Corp inspection 2 hours",
    ]

    results = []
    for example in examples:
        result = processor.process(example)
        results.append({
            "input": example,
            "intent": result.intent.value,
            "title": result.title,
            "confidence": result.confidence,
            "entities": len(result.entities or [])
        })

    return {"examples": results}

if __name__ == "__main__":
    print("Starting FSA Local NLP Service...")
    print("API Documentation: http://localhost:8001/docs")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )