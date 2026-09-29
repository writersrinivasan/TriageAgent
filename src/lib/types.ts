// Core domain types for the Incident Triage Agent

export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface Metrics {
  cpu: number; // % utilization
  memory: number; // % utilization
  responseTime: number; // seconds
  errorRate: number; // %
  diskUsage?: number; // %
  activeConnections?: number;
  service?: string;
}

export interface LogLine {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "FATAL";
  message: string;
}

// A single reasoning step the agent performs during investigation
export interface AgentStep {
  id: string;
  tool: string; // which "tool" the agent used
  title: string;
  status: "running" | "done";
  detail: string;
  findings: string[];
}

export interface Evidence {
  signal: string;
  observed: string;
  threshold: string;
  breached: boolean;
}

export interface KBArticle {
  id: string;
  title: string;
  tags: string[];
  cause: string;
  actions: string[];
}

export interface PastIncident {
  id: string;
  date: string;
  title: string;
  severity: Severity;
  signature: Partial<Metrics>;
  rootCause: string;
  resolution: string;
  team: string;
}

export interface TriageResult {
  incidentId: string;
  createdAt: string;
  severity: Severity;
  probableCause: string;
  confidence: number; // 0-100
  evidence: Evidence[];
  recommendedActions: string[];
  escalationTeam: string;
  matchedIncidents: PastIncident[];
  matchedArticles: KBArticle[];
  steps: AgentStep[];
  logs: LogLine[];
  summary: string;
}

// ---- Multi-agent communication ------------------------------------------

// Stable IDs for each agent in the mesh
export type AgentId =
  | "coordinator"
  | "log-analyst"
  | "historian"
  | "kb-researcher"
  | "severity-assessor"
  | "root-cause"
  | "human";

export interface AgentInfo {
  id: AgentId;
  name: string;
  role: string;
  emoji: string;
  color: string; // tailwind text color class
}

// A message passed from one agent to another during the investigation
export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId;
  // request = a task/question, response = an answer/finding, broadcast = FYI
  kind: "request" | "response" | "broadcast";
  summary: string; // one-line for the wire/timeline
  content: string; // full body
  poweredBy: "groq" | "fallback";
  ts: number;
}

// Server-sent events emitted while the mesh runs
export type TriageEvent =
  | { type: "message"; message: AgentMessage }
  | { type: "agent-status"; agent: AgentId; status: "idle" | "thinking" | "done" }
  | { type: "result"; result: TriageResult }
  | { type: "error"; error: string };
