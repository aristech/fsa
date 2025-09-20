# FSA Local NLP Service

A lightweight, cost-free alternative to OpenAI for task creation and updates.

## Features

- **Zero API costs** - Runs completely locally
- **No rate limits** - Process unlimited requests
- **Fast processing** - Sub-second response times
- **Privacy first** - No data sent to external services
- **Intent detection** - Automatically detects task creation/update intents
- **Entity extraction** - Extracts personnel, work orders, projects, clients
- **Date parsing** - Understands "tomorrow", "friday", "next week", etc.
- **Priority detection** - Identifies urgent, high, medium, low priorities

## Setup

### 1. Install Python Dependencies

```bash
cd apps/backend/src/services/ai/local-nlp
pip install -r requirements.txt
```

### 2. Test the Service

Test the CLI tool:
```bash
python3 main.py "create a task in #Garden Care for tomorrow"
```

Test the HTTP server:
```bash
python3 server.py
# In another terminal:
curl -X POST "http://localhost:8001/process" \
  -H "Content-Type: application/json" \
  -d '{"text": "create task for garden maintenance"}'
```

### 3. Integration

The service automatically starts when the Node.js backend starts. No additional configuration needed.

## Usage Examples

### Simple Task Creation
```
"create a task for garden maintenance"
"add task 'Plant watering'"
"schedule task tomorrow"
```

### With Entities
```
"create task in #Garden Care for @John Doe"
"add urgent task for +Maintenance Project"
"schedule task 'Inspection' for &Acme Corp due friday"
```

### With Dates and Priorities
```
"create urgent task for tomorrow"
"add high priority task due next week"
"schedule task for monday 2 hours"
```

## Symbol Reference

- `@` - Personnel (e.g., @John Doe)
- `#` - Work Orders (e.g., #Garden Care)
- `/` - Tasks (e.g., /Plant Watering)
- `+` - Projects (e.g., +Maintenance)
- `&` - Clients (e.g., &Acme Corp)

## Architecture

```
User Input → Local NLP Service → Task Creation
     ↓              ↓                 ↓
"create task"  →  Intent Detection  →  Database
"@John Doe"    →  Entity Extraction →  Personnel Link
"tomorrow"     →  Date Parsing      →  Due Date
"urgent"       →  Priority Detection → Task Priority
```

## Performance

- **Startup time**: < 2 seconds
- **Processing time**: < 100ms per request
- **Memory usage**: ~50MB
- **CPU usage**: Minimal

## Fallback Strategy

1. **Primary**: Local NLP service (cost-free, fast)
2. **Fallback**: OpenAI GPT-4o-mini (for complex requests)
3. **Emergency**: Direct task creation with basic parsing

## Benefits vs OpenAI

| Feature | Local NLP | OpenAI |
|---------|-----------|---------|
| Cost | FREE | $0.15/$1K tokens |
| Speed | <100ms | 500-2000ms |
| Rate Limits | None | 100K TPM |
| Privacy | Complete | Data sent to OpenAI |
| Reliability | Local control | Internet dependent |
| Complex reasoning | Limited | Excellent |

## Monitoring

Check service status:
```bash
curl http://localhost:8001/health
```

View processing examples:
```bash
curl http://localhost:8001/test
```

## Troubleshooting

### Service won't start
- Check Python 3 is installed: `python3 --version`
- Install dependencies: `pip install -r requirements.txt`
- Check port 8001 is available: `lsof -i :8001`

### Processing errors
- Check input text is not empty
- Verify entities use correct symbols (@, #, /, +, &)
- Review logs in Node.js console

### Performance issues
- Monitor CPU usage during processing
- Consider upgrading Python version
- Check available memory