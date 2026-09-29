import { KBArticle, PastIncident } from "./types";

// Mock knowledge base — in production this would be a vector store / wiki search
export const KNOWLEDGE_BASE: KBArticle[] = [
  {
    id: "KB-1001",
    title: "Application server resource exhaustion",
    tags: ["cpu", "memory", "response-time", "resource-exhaustion"],
    cause:
      "Application server has exhausted CPU and/or memory headroom, causing request queuing and elevated latency.",
    actions: [
      "Scale out the application tier (add replicas) or scale up instance size",
      "Enable or tune autoscaling policies on CPU/memory thresholds",
      "Profile the top memory/CPU consuming endpoints for leaks or hot loops",
      "Restart affected pods/instances to reclaim leaked memory as a stopgap",
    ],
  },
  {
    id: "KB-1002",
    title: "Elevated error rate from downstream dependency",
    tags: ["error-rate", "5xx", "dependency", "timeout"],
    cause:
      "A high error rate combined with elevated latency often indicates a failing or slow downstream dependency (DB, cache, external API).",
    actions: [
      "Check health and latency of downstream databases, caches, and external APIs",
      "Inspect circuit breaker / retry metrics for cascading failures",
      "Enable graceful degradation or fallback responses for the failing dependency",
    ],
  },
  {
    id: "KB-1003",
    title: "Memory leak leading to OOM",
    tags: ["memory", "oom", "gc", "leak"],
    cause:
      "Steadily climbing memory with GC pressure indicates a memory leak that can trigger OOM kills.",
    actions: [
      "Capture a heap dump for offline analysis",
      "Roll instances to reclaim memory and restore stability",
      "Review recent deploys for object retention regressions",
    ],
  },
  {
    id: "KB-1004",
    title: "Disk pressure and I/O saturation",
    tags: ["disk", "io", "storage"],
    cause:
      "High disk usage causes I/O wait, slow writes, and can block logging and DB flushes.",
    actions: [
      "Free disk space (rotate/compress logs, clear temp files)",
      "Expand the volume or attach additional storage",
      "Move high-churn data to faster or dedicated storage",
    ],
  },
  {
    id: "KB-1005",
    title: "Traffic spike / capacity shortfall",
    tags: ["connections", "traffic", "throughput", "response-time"],
    cause:
      "A surge in active connections beyond provisioned capacity increases latency and error rates.",
    actions: [
      "Scale horizontally to absorb the traffic surge",
      "Apply rate limiting or request shedding on non-critical paths",
      "Verify CDN/caching is offloading static and cacheable traffic",
    ],
  },
];

// Mock historical incidents — in production this would be your incident management system
export const PAST_INCIDENTS: PastIncident[] = [
  {
    id: "INC-2041",
    date: "2026-07-14",
    title: "Checkout API latency spike during flash sale",
    severity: "High",
    signature: { cpu: 95, memory: 88, responseTime: 3.9, errorRate: 15 },
    rootCause: "Application server resource exhaustion under peak load",
    resolution: "Scaled out from 6 to 14 replicas; tuned HPA target to 60% CPU",
    team: "Infrastructure Team",
  },
  {
    id: "INC-1987",
    date: "2026-05-02",
    title: "Payment service 5xx surge",
    severity: "Critical",
    signature: { cpu: 60, memory: 70, responseTime: 2.1, errorRate: 42 },
    rootCause: "Downstream payment gateway timeouts cascading through retries",
    resolution: "Enabled circuit breaker and fallback queue; opened vendor ticket",
    team: "Application / SRE",
  },
  {
    id: "INC-1855",
    date: "2026-03-19",
    title: "Auth service gradual memory climb then OOM",
    severity: "High",
    signature: { cpu: 55, memory: 96, responseTime: 1.8, errorRate: 6 },
    rootCause: "Memory leak in session cache after v2.3 deploy",
    resolution: "Rolled back v2.3; patched cache eviction; added heap alerts",
    team: "Application / SRE",
  },
  {
    id: "INC-1702",
    date: "2026-01-08",
    title: "Log volume filled root disk on API nodes",
    severity: "Medium",
    signature: { cpu: 40, memory: 50, responseTime: 2.6, errorRate: 9, diskUsage: 97 },
    rootCause: "Debug logging left enabled saturated disk I/O",
    resolution: "Disabled debug logs, rotated volumes, expanded disk",
    team: "Infrastructure Team",
  },
];
