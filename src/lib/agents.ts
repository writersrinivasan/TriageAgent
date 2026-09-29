import { AgentId, AgentInfo } from "./types";

// The agent mesh. The Coordinator delegates to specialists, who report back.
export const AGENTS: Record<AgentId, AgentInfo> = {
  coordinator: {
    id: "coordinator",
    name: "Coordinator",
    role: "Orchestrates the investigation and assembles the final triage",
    emoji: "🧭",
    color: "text-sky-300",
  },
  "log-analyst": {
    id: "log-analyst",
    name: "Log Analyst",
    role: "Reads logs and metrics, surfaces anomalies",
    emoji: "📜",
    color: "text-amber-300",
  },
  historian: {
    id: "historian",
    name: "Historian",
    role: "Searches previous incidents for similar signatures",
    emoji: "🕰️",
    color: "text-violet-300",
  },
  "kb-researcher": {
    id: "kb-researcher",
    name: "KB Researcher",
    role: "Retrieves relevant knowledge base articles",
    emoji: "📚",
    color: "text-emerald-300",
  },
  "severity-assessor": {
    id: "severity-assessor",
    name: "Severity Assessor",
    role: "Scores impact and assigns severity",
    emoji: "🌡️",
    color: "text-rose-300",
  },
  "root-cause": {
    id: "root-cause",
    name: "Root Cause Analyst",
    role: "Synthesizes findings into probable cause and actions",
    emoji: "🔬",
    color: "text-cyan-300",
  },
  human: {
    id: "human",
    name: "Human Operator",
    role: "Approves or rejects the recommended escalation",
    emoji: "🧑\u200d💻",
    color: "text-slate-300",
  },
};

export const AGENT_ORDER: AgentId[] = [
  "coordinator",
  "log-analyst",
  "historian",
  "kb-researcher",
  "severity-assessor",
  "root-cause",
  "human",
];
