# IT Incident Triage Agent

An agentic AI web app that triages infrastructure incidents. A **Coordinator** delegates to specialized agents that communicate over a message bus, reason with the **Groq** API, and produce a triage report for **human approval**.

This is the step from RAG → Agentic AI: instead of a single retrieval-and-answer pass, multiple agents investigate the evidence, exchange findings, and converge on a recommendation.

## The agent mesh

| Agent | Role | Reasoning |
| --- | --- | --- |
| 🧭 Coordinator | Orchestrates the investigation, assembles the triage | — |
| 📜 Log Analyst | Reads logs & metrics, surfaces anomalies | Groq |
| 🕰️ Historian | Finds similar past incidents | Retrieval |
| 📚 KB Researcher | Retrieves relevant knowledge base articles | Retrieval |
| 🌡️ Severity Assessor | Scores impact, assigns severity | Groq |
| 🔬 Root Cause Analyst | Synthesizes findings into cause + actions | Groq |
| 🧑‍💻 Human Operator | Approves or rejects the escalation | — |

Each Groq-backed agent has a deterministic fallback, so the app still runs if the API is unavailable.

## Features

- **Agent-to-agent visualization** — an animated SVG mesh plus a live message bus showing every hand-off, tagged as Groq-reasoned or rule-based.
- **Streaming** — the investigation streams to the browser over Server-Sent Events as it happens.
- **Human-in-the-loop** — the agents recommend; a human approves the escalation.
- **Structured triage report** — severity, probable cause with confidence, evidence table, recommended actions, matched incidents/KB, and escalation routing.

## Example

Input:

```
CPU: 98%   Memory: 91%   Response time: 4.2s   Error rate: 18%
```

Output: **High** severity, probable cause "application server resource exhaustion," an evidence table, recommended actions, and escalation to the Infrastructure Team.

## Tech stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- Groq (OpenAI-compatible REST API) for agent reasoning

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your Groq API key
npm run dev
```

Open http://localhost:3000, click **Load sample incident**, then **Dispatch Agent Mesh**.

### Environment variables

| Variable | Description |
| --- | --- |
| `GROQ_API_KEY` | Your Groq API key (server-side only) |
| `GROQ_MODEL` | Groq model id, e.g. `openai/gpt-oss-120b` |

`.env.local` is gitignored — never commit your key.

## Project structure

```
src/
  app/
    api/triage/route.ts   # SSE endpoint streaming the agent mesh
    page.tsx              # UI: metrics form, mesh viz, report, approval
  components/
    AgentMesh.tsx         # animated agent graph
    MessageLog.tsx        # live message bus
    TriageReport.tsx      # structured triage output
    SeverityBadge.tsx
  lib/
    orchestrator.ts       # runAgentMesh — the multi-agent workflow
    agents.ts             # agent registry
    agent.ts              # deterministic engine + fallbacks
    groq.ts               # Groq client
    knowledgeBase.ts      # mock KB + incident history
    types.ts
```

## License

MIT
