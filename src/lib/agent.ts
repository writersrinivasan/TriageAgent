import { KNOWLEDGE_BASE, PAST_INCIDENTS } from "./knowledgeBase";
import {
  AgentStep,
  Evidence,
  KBArticle,
  LogLine,
  Metrics,
  PastIncident,
  Severity,
  TriageResult,
} from "./types";

// Thresholds used to evaluate evidence signals
const THRESHOLDS = {
  cpu: 85,
  memory: 85,
  responseTime: 2.0,
  errorRate: 5,
  diskUsage: 90,
};

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Tool 1: Analyze logs -------------------------------------------------
// Synthesize log lines that a monitoring agent would surface, driven by metrics.
export function analyzeLogs(m: Metrics): LogLine[] {
  const now = Date.now();
  const t = (offsetSec: number) =>
    new Date(now - offsetSec * 1000).toISOString().replace("T", " ").slice(0, 19);
  const svc = m.service || "app-server";
  const logs: LogLine[] = [];

  logs.push({ timestamp: t(95), level: "INFO", message: `${svc} health probe ok` });

  if (m.cpu >= THRESHOLDS.cpu) {
    logs.push({
      timestamp: t(80),
      level: "WARN",
      message: `CPU saturation detected on ${svc}: ${m.cpu}% (threshold ${THRESHOLDS.cpu}%)`,
    });
  }
  if (m.memory >= THRESHOLDS.memory) {
    logs.push({
      timestamp: t(70),
      level: "WARN",
      message: `Memory pressure on ${svc}: ${m.memory}% used; GC pause time rising`,
    });
  }
  if (m.responseTime >= THRESHOLDS.responseTime) {
    logs.push({
      timestamp: t(55),
      level: "WARN",
      message: `p95 latency ${m.responseTime.toFixed(1)}s exceeds SLO of ${THRESHOLDS.responseTime.toFixed(1)}s`,
    });
  }
  if (m.errorRate >= THRESHOLDS.errorRate) {
    logs.push({
      timestamp: t(40),
      level: "ERROR",
      message: `HTTP 5xx error rate at ${m.errorRate}% on ${svc}; request queue backing up`,
    });
  }
  if (m.diskUsage && m.diskUsage >= THRESHOLDS.diskUsage) {
    logs.push({
      timestamp: t(30),
      level: "ERROR",
      message: `Disk usage ${m.diskUsage}% on ${svc}; I/O wait increasing`,
    });
  }
  if (m.memory >= 95) {
    logs.push({
      timestamp: t(12),
      level: "FATAL",
      message: `OOMKilled: container ${svc} exceeded memory limit`,
    });
  }
  if (logs.length === 1) {
    logs.push({ timestamp: t(20), level: "INFO", message: `${svc} operating within normal parameters` });
  }
  return logs;
}

// ---- Tool 2: Build evidence table ----------------------------------------
export function buildEvidence(m: Metrics): Evidence[] {
  const rows: Evidence[] = [
    {
      signal: "CPU utilization",
      observed: `${m.cpu}%`,
      threshold: `≤ ${THRESHOLDS.cpu}%`,
      breached: m.cpu >= THRESHOLDS.cpu,
    },
    {
      signal: "Memory utilization",
      observed: `${m.memory}%`,
      threshold: `≤ ${THRESHOLDS.memory}%`,
      breached: m.memory >= THRESHOLDS.memory,
    },
    {
      signal: "Response time (p95)",
      observed: `${m.responseTime.toFixed(1)}s`,
      threshold: `≤ ${THRESHOLDS.responseTime.toFixed(1)}s`,
      breached: m.responseTime >= THRESHOLDS.responseTime,
    },
    {
      signal: "Error rate",
      observed: `${m.errorRate}%`,
      threshold: `≤ ${THRESHOLDS.errorRate}%`,
      breached: m.errorRate >= THRESHOLDS.errorRate,
    },
  ];
  if (typeof m.diskUsage === "number") {
    rows.push({
      signal: "Disk usage",
      observed: `${m.diskUsage}%`,
      threshold: `≤ ${THRESHOLDS.diskUsage}%`,
      breached: m.diskUsage >= THRESHOLDS.diskUsage,
    });
  }
  if (typeof m.activeConnections === "number") {
    rows.push({
      signal: "Active connections",
      observed: `${m.activeConnections}`,
      threshold: "capacity dependent",
      breached: m.activeConnections >= 5000,
    });
  }
  return rows;
}

// ---- Tool 3: Determine severity ------------------------------------------
export function determineSeverity(m: Metrics): { severity: Severity; score: number } {
  let score = 0;
  score += Math.max(0, m.cpu - THRESHOLDS.cpu) * 1.1;
  score += Math.max(0, m.memory - THRESHOLDS.memory) * 1.2;
  score += Math.max(0, m.responseTime - THRESHOLDS.responseTime) * 12;
  score += Math.max(0, m.errorRate - THRESHOLDS.errorRate) * 2.2;
  if (m.diskUsage) score += Math.max(0, m.diskUsage - THRESHOLDS.diskUsage) * 1.5;
  if (m.memory >= 95 || m.errorRate >= 40) score += 30; // near-outage boosters

  let severity: Severity = "Low";
  if (score >= 90) severity = "Critical";
  else if (score >= 45) severity = "High";
  else if (score >= 15) severity = "Medium";

  return { severity, score: Math.round(score) };
}

// ---- Tool 4: Search past incidents ---------------------------------------
export function searchIncidents(m: Metrics): PastIncident[] {
  const scored = PAST_INCIDENTS.map((inc) => {
    const s = inc.signature;
    let dist = 0;
    let n = 0;
    const add = (a?: number, b?: number, scale = 1) => {
      if (typeof a === "number" && typeof b === "number") {
        dist += Math.abs(a - b) / scale;
        n++;
      }
    };
    add(s.cpu, m.cpu, 100);
    add(s.memory, m.memory, 100);
    add(s.responseTime, m.responseTime, 5);
    add(s.errorRate, m.errorRate, 100);
    add(s.diskUsage, m.diskUsage, 100);
    const similarity = n ? 1 - dist / n : 0;
    return { inc, similarity };
  });
  return scored
    .filter((x) => x.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map((x) => x.inc);
}

// ---- Tool 5: Search knowledge base ---------------------------------------
export function searchKnowledgeBase(m: Metrics): KBArticle[] {
  const active: string[] = [];
  if (m.cpu >= THRESHOLDS.cpu) active.push("cpu", "resource-exhaustion");
  if (m.memory >= THRESHOLDS.memory) active.push("memory", "resource-exhaustion");
  if (m.memory >= 95) active.push("oom", "leak");
  if (m.responseTime >= THRESHOLDS.responseTime) active.push("response-time");
  if (m.errorRate >= THRESHOLDS.errorRate) active.push("error-rate", "5xx", "dependency");
  if (m.diskUsage && m.diskUsage >= THRESHOLDS.diskUsage) active.push("disk", "io");
  if (m.activeConnections && m.activeConnections >= 5000) active.push("connections", "traffic");

  const scored = KNOWLEDGE_BASE.map((a) => {
    const hits = a.tags.filter((tag) => active.includes(tag)).length;
    return { a, hits };
  });
  return scored
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map((x) => x.a);
}

// ---- Tool 6: Determine probable cause ------------------------------------
export function determineProbableCause(
  m: Metrics,
  articles: KBArticle[]
): { cause: string; confidence: number } {
  const cpuMem = m.cpu >= THRESHOLDS.cpu && m.memory >= THRESHOLDS.memory;
  const errs = m.errorRate >= THRESHOLDS.errorRate;
  const slow = m.responseTime >= THRESHOLDS.responseTime;

  let cause = articles[0]?.cause || "No dominant failure signal detected.";
  let confidence = 55;

  if (cpuMem && slow) {
    cause = "Application server resource exhaustion (CPU and memory saturated, causing request queuing and elevated latency).";
    confidence = 88;
  } else if (m.memory >= 95) {
    cause = "Memory leak driving the service toward OOM kills.";
    confidence = 84;
  } else if (errs && slow && !cpuMem) {
    cause = "Failing or slow downstream dependency propagating errors and latency upstream.";
    confidence = 78;
  } else if (m.diskUsage && m.diskUsage >= THRESHOLDS.diskUsage) {
    cause = "Disk pressure causing I/O saturation and degraded write performance.";
    confidence = 75;
  }

  if (articles.length) confidence = Math.min(95, confidence + 3 * (articles.length - 1));
  return { cause, confidence };
}

// ---- Tool 7: Recommend actions -------------------------------------------
export function recommendActions(m: Metrics, articles: KBArticle[]): string[] {
  const actions = new Set<string>();
  articles.forEach((a) => a.actions.slice(0, 2).forEach((x) => actions.add(x)));

  if (m.cpu >= THRESHOLDS.cpu || m.memory >= THRESHOLDS.memory) {
    actions.add("Scale the application tier immediately to relieve resource pressure");
  }
  if (m.errorRate >= 15) {
    actions.add("Check downstream dependencies (DB, cache, external APIs) for failures");
  }
  if (m.memory >= 95) {
    actions.add("Capture a heap dump, then roll instances to restore stability");
  }
  actions.add("Notify on-call and open an incident bridge if impact is customer-facing");

  return Array.from(actions).slice(0, 6);
}

// ---- Escalation routing ---------------------------------------------------
export function routeEscalation(m: Metrics, severity: Severity): string {
  if (m.errorRate >= 20 && m.cpu < THRESHOLDS.cpu) return "Application / SRE Team";
  if (m.diskUsage && m.diskUsage >= THRESHOLDS.diskUsage) return "Infrastructure Team";
  if (severity === "Critical") return "Infrastructure Team + Incident Commander";
  return "Infrastructure Team";
}

// ---- Orchestrator: run the full agentic investigation --------------------
export function runTriage(m: Metrics): TriageResult {
  const steps: AgentStep[] = [];

  const logs = analyzeLogs(m);
  steps.push({
    id: uid("step"),
    tool: "analyze_logs",
    title: "Analyze logs",
    status: "done",
    detail: `Parsed ${logs.length} log lines from ${m.service || "app-server"}.`,
    findings: logs
      .filter((l) => l.level === "ERROR" || l.level === "FATAL" || l.level === "WARN")
      .map((l) => `[${l.level}] ${l.message}`),
  });

  const evidence = buildEvidence(m);
  const breached = evidence.filter((e) => e.breached);
  steps.push({
    id: uid("step"),
    tool: "evaluate_signals",
    title: "Evaluate metrics against thresholds",
    status: "done",
    detail: `${breached.length} of ${evidence.length} signals breached their thresholds.`,
    findings: breached.map((e) => `${e.signal}: ${e.observed} (limit ${e.threshold})`),
  });

  const matchedIncidents = searchIncidents(m);
  steps.push({
    id: uid("step"),
    tool: "search_incidents",
    title: "Search previous incidents",
    status: "done",
    detail: `Found ${matchedIncidents.length} similar historical incident(s).`,
    findings: matchedIncidents.map((i) => `${i.id} (${i.date}): ${i.rootCause}`),
  });

  const matchedArticles = searchKnowledgeBase(m);
  steps.push({
    id: uid("step"),
    tool: "search_kb",
    title: "Search knowledge base",
    status: "done",
    detail: `Retrieved ${matchedArticles.length} relevant KB article(s).`,
    findings: matchedArticles.map((a) => `${a.id}: ${a.title}`),
  });

  const { severity, score } = determineSeverity(m);
  steps.push({
    id: uid("step"),
    tool: "determine_severity",
    title: "Determine severity",
    status: "done",
    detail: `Composite risk score ${score} → ${severity}.`,
    findings: [`Severity classified as ${severity} (score ${score}).`],
  });

  const { cause, confidence } = determineProbableCause(m, matchedArticles);
  steps.push({
    id: uid("step"),
    tool: "root_cause",
    title: "Identify probable cause",
    status: "done",
    detail: `Confidence ${confidence}%.`,
    findings: [cause],
  });

  const recommendedActions = recommendActions(m, matchedArticles);
  steps.push({
    id: uid("step"),
    tool: "recommend_actions",
    title: "Recommend actions",
    status: "done",
    detail: `Generated ${recommendedActions.length} recommended action(s).`,
    findings: recommendedActions,
  });

  const escalationTeam = routeEscalation(m, severity);

  const summary = `${severity} severity incident on ${m.service || "app-server"}. Probable cause: ${cause} ${breached.length} signal(s) breached thresholds. Recommend routing to ${escalationTeam}.`;

  return {
    incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    severity,
    probableCause: cause,
    confidence,
    evidence,
    recommendedActions,
    escalationTeam,
    matchedIncidents,
    matchedArticles,
    steps,
    logs,
    summary,
  };
}
