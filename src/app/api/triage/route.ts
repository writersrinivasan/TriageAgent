import { NextRequest } from "next/server";
import { runAgentMesh } from "@/lib/orchestrator";
import { Metrics, TriageEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function toMetrics(body: Record<string, unknown>): Metrics {
  return {
    cpu: num(body.cpu),
    memory: num(body.memory),
    responseTime: num(body.responseTime),
    errorRate: num(body.errorRate),
    diskUsage:
      body.diskUsage === undefined || body.diskUsage === "" ? undefined : num(body.diskUsage),
    activeConnections:
      body.activeConnections === undefined || body.activeConnections === ""
        ? undefined
        : num(body.activeConnections),
    service: typeof body.service === "string" && body.service ? body.service : undefined,
  };
}

// Streams the agent mesh as Server-Sent Events.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const metrics = toMetrics(body);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TriageEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of runAgentMesh(metrics)) {
          send(event);
        }
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : "mesh failed" });
      } finally {
        controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
