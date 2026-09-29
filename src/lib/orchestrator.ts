import {
  analyzeLogs,
  buildEvidence,
  determineProbableCause,
  determineSeverity,
  recommendActions,
  routeEscalation,
  searchIncidents,
  searchKnowledgeBase,
} from "./agent";
import { groqChat, groqConfigured, parseJsonLoose } from "./groq";
import {
  AgentId,
  AgentMessage,
  Evidence,
  KBArticle,
  Metrics,
  PastIncident,
  Severity,
  TriageEvent,
  TriageResult,
} from "./types";

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Build an AgentMessage helper
function msg(
  from: AgentId,
  to: AgentId,
  kind: AgentMessage["kind"],
  summary: string,
  content: string,
  poweredBy: AgentMessage["poweredBy"]
): AgentMessage {
  return { id: rid(), from, to, kind, summary, content, poweredBy, ts: Date.now() };
}

/**
 * Ask Groq to act as a specific specialist agent. Returns the parsed JSON
 * plus whether Groq actually powered it. Falls back gracefully.
 */
async function askAgent<T>(
  system: string,
  user: string,
  fallback: () => T
): Promise<{ data: T; poweredBy: "groq" | "fallback" }> {
  if (!groqConfigured()) return { data: fallback(), poweredBy: "fallback" };
  try {
    const raw = await groqChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true, temperature: 0.2, maxTokens: 900 }
    );
    return { data: parseJsonLoose<T>(raw), poweredBy: "groq" };
  } catch {
    return { data: fallback(), poweredBy: "fallback" };
  }
}

function metricsBlock(m: Metrics): string {
  const lines = [
    `service: ${m.service || "app-server"}`,
    `cpu: ${m.cpu}%`,
    `memory: ${m.memory}%`,
    `responseTime: ${m.responseTime}s`,
    `errorRate: ${m.errorRate}%`,
  ];
  if (typeof m.diskUsage === "number") lines.push(`diskUsage: ${m.diskUsage}%`);
  if (typeof m.activeConnections === "number")
    lines.push(`activeConnections: ${m.activeConnections}`);
  return lines.join("\n");
}

/**
 * Run the full multi-agent investigation as a stream of events.
 * The Coordinator delegates to each specialist in turn; each hand-off and
 * reply is emitted as an AgentMessage so the UI can visualize the mesh.
 */
export async function* runAgentMesh(m: Metrics): AsyncGenerator<TriageEvent> {
  const svc = m.service || "app-server";
  let usedGroq = false;
  const noteGroq = (p: "groq" | "fallback") => {
    if (p === "groq") usedGroq = true;
  };

  // ---- 1. Coordinator kicks things off -----------------------------------
  yield { type: "agent-status", agent: "coordinator", status: "thinking" };
  await delay(150);
  yield {
    type: "message",
    message: msg(
      "coordinator",
      "log-analyst",
      "request",
      `Analyze logs & metrics for ${svc}`,
      `New alert on ${svc}. Metrics:\n${metricsBlock(m)}\n\nInvestigate the logs and tell me what's anomalous.`,
      "groq"
    ),
  };
  yield { type: "agent-status", agent: "coordinator", status: "done" };

  // ---- 2. Log Analyst ----------------------------------------------------
  yield { type: "agent-status", agent: "log-analyst", status: "thinking" };
  const logs = analyzeLogs(m);
  const evidence = buildEvidence(m);
  const logAgent = await askAgent<{ findings: string[]; summary: string }>(
    "You are the Log Analyst agent in an IT incident triage mesh. Analyze the provided logs and metric thresholds. Respond ONLY as JSON: {\"summary\": string (<=140 chars), \"findings\": string[] (3-5 concise anomalies)}.",
    `Logs:\n${logs.map((l) => `[${l.level}] ${l.message}`).join("\n")}\n\nThreshold evaluation:\n${evidence
      .map((e) => `${e.signal}: ${e.observed} vs ${e.threshold} => ${e.breached ? "BREACH" : "ok"}`)
      .join("\n")}`,
    () => ({
      summary: `${evidence.filter((e) => e.breached).length} signal(s) breached thresholds on ${svc}.`,
      findings: evidence.filter((e) => e.breached).map((e) => `${e.signal}: ${e.observed} (limit ${e.threshold})`),
    })
  );
  noteGroq(logAgent.poweredBy);
  await delay(200);
  yield {
    type: "message",
    message: msg(
      "log-analyst",
      "coordinator",
      "response",
      logAgent.data.summary,
      logAgent.data.findings.join("\n"),
      logAgent.poweredBy
    ),
  };
  yield { type: "agent-status", agent: "log-analyst", status: "done" };

  // ---- 3. Historian ------------------------------------------------------
  yield {
    type: "message",
    message: msg("coordinator", "historian", "request", "Find similar past incidents", `Given metrics:\n${metricsBlock(m)}\nSearch incident history for similar signatures.`, "groq"),
  };
  yield { type: "agent-status", agent: "historian", status: "thinking" };
  const matchedIncidents: PastIncident[] = searchIncidents(m);
  await delay(180);
  const histSummary = matchedIncidents.length
    ? `Found ${matchedIncidents.length} similar incident(s); closest: ${matchedIncidents[0].id}.`
    : "No closely matching historical incidents.";
  yield {
    type: "message",
    message: msg(
      "historian",
      "coordinator",
      "response",
      histSummary,
      matchedIncidents.map((i) => `${i.id} (${i.date}): ${i.rootCause} — fix: ${i.resolution}`).join("\n") || "none",
      "fallback"
    ),
  };
  yield { type: "agent-status", agent: "historian", status: "done" };

  // ---- 4. KB Researcher --------------------------------------------------
  yield {
    type: "message",
    message: msg("coordinator", "kb-researcher", "request", "Retrieve relevant KB articles", `Given metrics:\n${metricsBlock(m)}\nRetrieve knowledge base articles that explain this failure mode.`, "groq"),
  };
  yield { type: "agent-status", agent: "kb-researcher", status: "thinking" };
  const matchedArticles: KBArticle[] = searchKnowledgeBase(m);
  await delay(180);
  yield {
    type: "message",
    message: msg(
      "kb-researcher",
      "coordinator",
      "response",
      `Retrieved ${matchedArticles.length} KB article(s).`,
      matchedArticles.map((a) => `${a.id}: ${a.title}`).join("\n") || "none",
      "fallback"
    ),
  };
  yield { type: "agent-status", agent: "kb-researcher", status: "done" };

  // ---- 5. Severity Assessor ---------------------------------------------
  yield {
    type: "message",
    message: msg("coordinator", "severity-assessor", "request", "Assess severity", `Metrics:\n${metricsBlock(m)}\nBreaches: ${evidence.filter((e) => e.breached).length}. Assign severity.`, "groq"),
  };
  yield { type: "agent-status", agent: "severity-assessor", status: "thinking" };
  const detSeverity = determineSeverity(m);
  const sevAgent = await askAgent<{ severity: Severity; rationale: string }>(
    "You are the Severity Assessor agent. Classify incident severity as exactly one of: Critical, High, Medium, Low. Respond ONLY as JSON: {\"severity\": \"Critical|High|Medium|Low\", \"rationale\": string (<=140 chars)}.",
    `Metrics:\n${metricsBlock(m)}\n\nBreached signals: ${evidence.filter((e) => e.breached).map((e) => e.signal).join(", ") || "none"}.\nA deterministic model suggests: ${detSeverity.severity} (score ${detSeverity.score}). Use judgment.`,
    () => ({ severity: detSeverity.severity, rationale: `Composite risk score ${detSeverity.score}.` })
  );
  noteGroq(sevAgent.poweredBy);
  const validSev: Severity[] = ["Critical", "High", "Medium", "Low"];
  const severity: Severity = validSev.includes(sevAgent.data.severity)
    ? sevAgent.data.severity
    : detSeverity.severity;
  await delay(180);
  yield {
    type: "message",
    message: msg("severity-assessor", "coordinator", "response", `Severity: ${severity}`, sevAgent.data.rationale, sevAgent.poweredBy),
  };
  yield { type: "agent-status", agent: "severity-assessor", status: "done" };

  // ---- 6. Root Cause Analyst (synthesis) --------------------------------
  yield {
    type: "message",
    message: msg("coordinator", "root-cause", "request", "Synthesize cause & actions", "Combine all agent findings into a probable cause and recommended actions.", "groq"),
  };
  yield { type: "agent-status", agent: "root-cause", status: "thinking" };
  const detCause = determineProbableCause(m, matchedArticles);
  const detActions = recommendActions(m, matchedArticles);
  const rcAgent = await askAgent<{
    probableCause: string;
    confidence: number;
    recommendedActions: string[];
  }>(
    "You are the Root Cause Analyst agent. Synthesize the mesh's findings into a probable cause and a prioritized action list. Respond ONLY as JSON: {\"probableCause\": string, \"confidence\": number (0-100), \"recommendedActions\": string[] (3-6 imperative steps)}.",
    `Metrics:\n${metricsBlock(m)}\n\nLog Analyst findings:\n${logAgent.data.findings.join("\n")}\n\nSimilar incidents:\n${matchedIncidents.map((i) => `${i.id}: ${i.rootCause}`).join("\n") || "none"}\n\nKB articles:\n${matchedArticles.map((a) => `${a.title}: ${a.cause}`).join("\n") || "none"}\n\nSeverity: ${severity}.`,
    () => ({ probableCause: detCause.cause, confidence: detCause.confidence, recommendedActions: detActions })
  );
  noteGroq(rcAgent.poweredBy);
  const probableCause = rcAgent.data.probableCause || detCause.cause;
  const confidence = Math.max(0, Math.min(100, Math.round(rcAgent.data.confidence ?? detCause.confidence)));
  const recommendedActions =
    Array.isArray(rcAgent.data.recommendedActions) && rcAgent.data.recommendedActions.length
      ? rcAgent.data.recommendedActions.slice(0, 6)
      : detActions;
  await delay(200);
  yield {
    type: "message",
    message: msg("root-cause", "coordinator", "response", `Probable cause identified (${confidence}%)`, probableCause, rcAgent.poweredBy),
  };
  yield { type: "agent-status", agent: "root-cause", status: "done" };

  // ---- 7. Coordinator hands to Human ------------------------------------
  const escalationTeam = routeEscalation(m, severity);
  yield { type: "agent-status", agent: "coordinator", status: "thinking" };
  await delay(150);
  yield {
    type: "message",
    message: msg(
      "coordinator",
      "human",
      "request",
      `Approve escalation to ${escalationTeam}?`,
      `Triage complete. Severity ${severity}. Cause: ${probableCause} Awaiting your approval to escalate.`,
      usedGroq ? "groq" : "fallback"
    ),
  };
  yield { type: "agent-status", agent: "coordinator", status: "done" };

  // ---- Assemble final structured result ---------------------------------
  const evidenceRows: Evidence[] = evidence;
  const result: TriageResult = {
    incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    severity,
    probableCause,
    confidence,
    evidence: evidenceRows,
    recommendedActions,
    escalationTeam,
    matchedIncidents,
    matchedArticles,
    steps: [], // the mesh replaces the linear step list
    logs,
    summary: `${severity} severity incident on ${svc}. Probable cause: ${probableCause} Recommend routing to ${escalationTeam}.`,
  };

  yield { type: "result", result };
}
