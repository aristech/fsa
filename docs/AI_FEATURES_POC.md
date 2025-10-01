# FSA AI Features — Proof of Concept

This document outlines a pragmatic AI roadmap and architecture to improve productivity for technicians, dispatchers, and managers using the FSA platform.

## Goals
- Reduce time to assign and complete work orders.
- Improve technician routing and SLA compliance.
- Automate summaries, updates, and information retrieval.
- Enhance accuracy of time tracking and reporting.
- Maintain strict tenant isolation and cost controls.

---

## High‑Impact AI Features (Prioritized)

### 1. Smart Task Triage and Prioritization
- Predict task priority/severity using text, client, SLA, materials, and history.
- Provide "Top 5" tasks per technician considering skills, distance, SLA, workload.

### 2. Technician Assignment Recommendations
- Rank technicians per work order using skills, certifications, historical speed/quality, travel time, and availability.
- One‑click assign with transparent rationale.

### 3. Time Tracking Assistant
- Suggest start/stop when near site or device activity; flag anomalies (overnight timers, duplicates).
- Auto-categorize time entries by task phase from notes.

### 4. Automated Summaries and Client Updates
- Generate concise job summaries from comments, images, and time entries for client updates and internal handoffs.
- Condense long threads into bullet outcomes and next steps.

### 5. Semantic Search Across Tasks/Materials/Uploads
- RAG over comments, reports, OCR text, and materials. Example: "Find the job where the red pump leaked last winter with a PDF report."

### 6. Knowledge Assistant in Kanban/Task View
- Inline chatbot contextualized with task, client history, manuals. Drafts checklists, troubleshooting steps, and email replies.

### 7. OCR + Image Understanding
- OCR attachments; extract serial numbers, model, meter readings; suggest materials from photos.

### 8. Scheduling Optimization (Batch)
- Daily/weekly route optimization honoring SLAs, skills, working hours, and geofencing.

### 9. Proactive Alerts
- Predict deadline risk; nudge dispatchers/techs with specific mitigations.

### 10. Quality/Compliance Guardrails
- Validate reports against required fields/certifications; flag missing photos/signatures.

---

## Architecture Overview

### LLM Provider Abstraction
- Start with OpenAI or Groq; maintain a provider interface to allow swapping to local models later.

### Embeddings + RAG
- Index `WorkOrder`, `Task`, `Comment`, `Report`, OCR text, and `Material`.
- Store vectors per tenant. Options:
  - PocketBase collection (if vector-capable),
  - External `pgvector`,
  - Hosted vector DB (e.g., Pinecone).

### Feature Isolation
- Per‑tenant flags and strict row‑level security by `tenantId`.

### Jobs/Events
- Background workers for indexing, summarization, and scheduling optimization triggered on CRUD and uploads.

### Cost/Safety
- Token budgets, per-tenant/user rate limits, response caching, auditable prompts.

---

## Data Flows

### Task create/update
- Extract fields → chunk → embed → upsert vectors with `tenantId`.

### Upload added
- OCR text → embed → attach to task/work order context.

### Calendar open
- Compute suggested schedule changes from priority + travel + skills.

### Timer start/stop
- Apply anomaly detection rules; classify category via LLM.

---

## Backend: Modules and Interfaces

### File Structure
- Location: `apps/backend/src/services/ai/`
  - `provider.ts` (OpenAI/Groq/local llama)
  - `ai-service.ts` (summarize, recommend, search)
  - `indexer.ts` (OCR, chunk, embed)
  - `scoring.ts` (assignment/time heuristics)
- Routes: `apps/backend/src/routes/ai.ts` behind `tenant-isolation` and `permission-guard`.
- Cleanup: extend `entity-cleanup-service.ts` to remove vectors when entities are deleted.
- Upload hook: integrate OCR in `apps/backend/src/routes/uploads.ts`.

### Provider Abstraction (TypeScript)

```typescript
export interface AIProvider {
  chat(opts: {
    system?: string;
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    temperature?: number;
  }): Promise<string>;

  embed(
    input: string | string[],
    opts?: { model?: string }
  ): Promise<number[] | number[][]>;
}

export class OpenAIProvider implements AIProvider {
  // Wraps SDK; implements chat and embed
}
```

### AI Service

```typescript
export class AIService {
  constructor(private provider: AIProvider) {}

  async summarizeTask(taskId: string, tenantId: string) {
    // fetch task + comments + time entries (scoped to tenant)
    // retrieve RAG context
    // call provider.chat with summary prompt
    // return summary
  }

  async recommendAssignees(workOrderId: string, tenantId: string) {
    // fetch work order + techs + skills + availability
    // score + optionally LLM JSON validation/rationale
    // return ranked list with rationale
  }

  async semanticSearch(query: string, tenantId: string) {
    // embed query -> vector search -> return refs with highlights/snippets
  }
}
```

### Scoring Heuristics (Hybrid)

```typescript
type Tech = {
  id: string;
  skills: string[];
  certifications: string[];
  location?: [number, number];
  workloadScore: number;
  availability: { start: Date; end: Date }[];
};

type Work = {
  skillsNeeded: string[];
  clientSLA: number;
  location?: [number, number];
  dueAt?: Date;
};

function scoreAssignment(tech: Tech, work: Work): number {
  const skill = jaccard(tech.skills, work.skillsNeeded) * 3;
  const cert = jaccard(tech.certifications, work.skillsNeeded) * 2;
  const slaUrgency = work.dueAt ? timeDecay(work.dueAt) * 2 : 0;
  const distance = travelMinutes(tech.location, work.location);
  const travelScore = distance != null ? -normalize(distance, 0, 60) : 0;
  const workload = -tech.workloadScore;
  return skill + cert + slaUrgency + travelScore + workload;
}
```

### Retrieval

```typescript
async function retrieveContext(tenantId: string, topK: number, embedding: number[]) {
  // vectorStore.query({ tenantId, vector: embedding, topK })
  // return [{ text, meta }, ...]
}
```

### REST Endpoints

```typescript
// GET /api/ai/tasks/:id/summary
// POST /api/ai/search { query }
// POST /api/ai/assignments { workOrderId }
// POST /api/ai/time/suggest { taskId }
```

---

## Frontend: Integrations

### UI Components
- Add AI UI in:
  - `apps/frontend/src/components/kanban/ai-task-assistant.tsx` — contextual RAG chat.
  - `apps/frontend/src/components/time-tracking/ai-suggestions.tsx` — timer suggestions.
  - Add "Summarize" button in `kanban-details.tsx` and banners in `kanban-check-in-out.tsx`.

### Client Hook

```typescript
export function useTaskAssistant(taskId: string) {
  const [messages, setMessages] = useState([]);
  const send = async (content: string) => {
    const res = await axios.post('/api/ai/chat', {
      taskId,
      messages: [...messages, { role: 'user', content }],
    });
    setMessages((m) => [
      ...m,
      { role: 'user', content },
      { role: 'assistant', content: res.data.reply },
    ]);
  };
  return { messages, send };
}
```

---

## Background Indexing

### Task Indexing

```typescript
async function onTaskSaved(task: Task, tenantId: string) {
  const doc = serializeTask(task); // title, desc, client, status, comments
  const chunks = chunk(doc, 800);
  const vectors = await ai.embed(chunks);
  await vectorStore.upsertMany(
    vectors,
    chunks.map((c, i) => ({ tenantId, ref: `task:${task.id}:${i}` }))
  );
}
```

### Upload Indexing

```typescript
async function onUpload(taskId: string, file: Upload, tenantId: string) {
  const text = await ocr(file);
  const chunks = chunk(text, 800);
  const vectors = await ai.embed(chunks);
  await vectorStore.upsertMany(
    vectors,
    chunks.map((_, i) => ({ tenantId, ref: `upload:${file.id}:${i}`, taskId }))
  );
}
```

---

## Prompt Templates

### Summary Prompt
```
You are an FSA assistant. Summarize the work done for {client} on task {taskId}. Include: issue, actions, parts, next steps, ETA. 120 words max.
```

### Assignment Prompt
```
Rank technicians for work order {id}. Consider skills, certs, historical completion times, distance, workload, availability. Return JSON with [{techId, score, rationale}].
```

---

## Model Choices

### Initial Setup
- Chat/Summaries: GPT‑4.1 or GPT‑4o‑mini
- Embeddings: text-embedding-3-small
- OCR: Tesseract or AWS Textract
- Travel ETA: OpenRouteService/Mapbox

### Cost Optimization
- Groq Llama‑3.1 70B/8B; local llama.cpp for small summaries.

---

## Security, Tenancy, Compliance

- Enforce `tenantId` filters on all retrieval/vector queries.
- PII minimization in prompts; redact secrets; fetch sensitive fields server‑side.
- Per‑tenant feature flags and budgets; audit logs for AI calls.

---

## Rollout Plan (2–4 Weeks)

### Week 1
- Provider abstraction, AI service, AI routes
- Index Task/WorkOrder/Comment
- Ship semantic search

### Week 2
- Summaries for tasks/work orders and client email drafts
- Add OCR on new uploads

### Week 3
- Technician assignment recommendations in Kanban and Work Order detail with rationale UI

### Week 4
- Time tracking assistant (start/stop suggestions + anomaly checks)

### Key Performance Indicators (KPIs)
- Task completion time
- Travel minutes/day
- On‑time SLA %
- Timer error rate
- Tokens/user/day

---

## Implementation Notes

### Integration Points
- Extend existing `kanban-check-in-out.tsx` with AI time tracking suggestions
- Add AI assistant to task details views
- Integrate with existing notification system for proactive alerts
- Leverage current tenant isolation middleware for security

### Technical Considerations
- Start with MVP features that provide immediate value
- Implement proper error handling and fallbacks
- Consider rate limiting and cost controls from day one
- Plan for gradual rollout with feature flags

### Future Enhancements
- Voice-to-text for field notes
- Predictive maintenance based on historical data
- Automated compliance reporting
- Integration with IoT devices for real-time monitoring
