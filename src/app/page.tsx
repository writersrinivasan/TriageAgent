"use client";

import { useRef, useState } from "react";
import { AGENT_ORDER } from "@/lib/agents";
import { AgentId, AgentMessage, TriageEvent, TriageResult } from "@/lib/types";
import AgentMesh from "@/components/AgentMesh";
import MessageLog from "@/components/MessageLog";
import TriageReport from "@/components/TriageReport";

type FormState = {
  service: string;
  cpu: string;
  memory: string;
  responseTime: string;
  errorRate: string;
  diskUsage: string;
  activeConnections: string;
};

const PRESET: FormState = {
  service: "orders-api",
  cpu: "98",
  memory: "91",
  responseTime: "4.2",
  errorRate: "18",
  diskUsage: "",
  activeConnections: "",
};

const EMPTY: FormState = {
  service: "",
  cpu: "",
  memory: "",
  responseTime: "",
  errorRate: "",
  diskUsage: "",
  activeConnections: "",
};

type Approval = "pending" | "approved" | "rejected";
type AgentStatus = "idle" | "thinking" | "done";

function initialStatuses(): Record<AgentId, AgentStatus> {
  return AGENT_ORDER.reduce(
    (acc, id) => ({ ...acc, [id]: "idle" }),
    {} as Record<AgentId, AgentStatus>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>(PRESET);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>(initialStatuses());
  const [activeLink, setActiveLink] = useState<{
    from: AgentId;
    to: AgentId;
    kind: AgentMessage["kind"];
  } | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [approval, setApproval] = useState<Approval>("pending");
  const [error, setError] = useState<string | null>(null);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function handleEvent(evt: TriageEvent) {
    if (evt.type === "message") {
      setMessages((prev) => [...prev, evt.message]);
      setActiveLink({ from: evt.message.from, to: evt.message.to, kind: evt.message.kind });
      if (linkTimer.current) clearTimeout(linkTimer.current);
      linkTimer.current = setTimeout(() => setActiveLink(null), 900);
    } else if (evt.type === "agent-status") {
      setStatuses((prev) => ({ ...prev, [evt.agent]: evt.status }));
    } else if (evt.type === "result") {
      setResult(evt.result);
    } else if (evt.type === "error") {
      setError(evt.error);
    }
  }

  async function runMesh() {
    setError(null);
    setResult(null);
    setMessages([]);
    setStatuses(initialStatuses());
    setActiveLink(null);
    setApproval("pending");
    setRunning(true);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok || !res.body) throw new Error(`Agent stream failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Read the SSE stream chunk by chunk
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json) as TriageEvent;
            handleEvent(evt);
            // Small pacing delay so the animation is legible
            await new Promise((r) => setTimeout(r, 220));
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigation failed");
    } finally {
      setRunning(false);
    }
  }

  const groqCount = messages.filter((m) => m.poweredBy === "groq").length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
            ◎
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              IT Incident Triage · Multi-Agent
            </h1>
            <p className="text-sm text-slate-400">
              Specialized agents collaborate over a message bus, reasoning with
              Groq, to triage infrastructure incidents.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
          ⚡ Powered by Groq {groqCount > 0 && `· ${groqCount} LLM calls`}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Input panel */}
        <section className="h-fit rounded-xl border border-edge bg-panel/50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Incoming Alert · Metrics
          </h2>
          <div className="space-y-3">
            <Field label="Service" value={form.service} onChange={(v) => update("service", v)} placeholder="orders-api" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPU %" value={form.cpu} onChange={(v) => update("cpu", v)} placeholder="98" numeric />
              <Field label="Memory %" value={form.memory} onChange={(v) => update("memory", v)} placeholder="91" numeric />
              <Field label="Resp. time (s)" value={form.responseTime} onChange={(v) => update("responseTime", v)} placeholder="4.2" numeric />
              <Field label="Error rate %" value={form.errorRate} onChange={(v) => update("errorRate", v)} placeholder="18" numeric />
              <Field label="Disk % (opt)" value={form.diskUsage} onChange={(v) => update("diskUsage", v)} placeholder="—" numeric />
              <Field label="Conns (opt)" value={form.activeConnections} onChange={(v) => update("activeConnections", v)} placeholder="—" numeric />
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={runMesh}
              disabled={running}
              className="flex-1 rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? "Agents working…" : "Dispatch Agent Mesh"}
            </button>
            <button
              onClick={() => {
                setForm(EMPTY);
                setResult(null);
                setMessages([]);
                setStatuses(initialStatuses());
              }}
              className="rounded-lg border border-edge px-3 py-2 text-slate-300 transition hover:bg-edge/40"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => setForm(PRESET)}
            className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300"
          >
            Load sample incident
          </button>

          {error && (
            <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-5 rounded-lg border border-edge bg-base/40 p-3 text-xs text-slate-400">
            <p className="mb-1 font-semibold text-slate-300">How it works</p>
            The Coordinator delegates to specialist agents (Log Analyst, Historian,
            KB Researcher, Severity Assessor, Root Cause). Each reasons with Groq
            and reports back over the bus. You approve the final escalation.
          </div>
        </section>

        {/* Visualization + output */}
        <section className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <AgentMesh
              statuses={statuses}
              activeLink={activeLink}
              messageCount={messages.length}
            />
            <MessageLog messages={messages} />
          </div>

          {result && (
            <div className="space-y-6">
              <div className="rounded-xl border border-edge bg-panel/30 p-6">
                <TriageReport result={result} />
              </div>

              {/* Human approval gate */}
              <div className="rounded-xl border border-edge bg-base/50 p-4">
                <h3 className="text-sm font-semibold text-slate-200">
                  Human Approval Required
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  The mesh recommends escalation to{" "}
                  <span className="text-slate-200">{result.escalationTeam}</span>.
                  Approve to dispatch, or reject to send back.
                </p>

                {approval === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setApproval("approved")}
                      className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400"
                    >
                      Approve & Escalate
                    </button>
                    <button
                      onClick={() => setApproval("rejected")}
                      className="rounded-lg border border-edge px-4 py-2 text-slate-300 transition hover:bg-edge/40"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {approval === "approved" && (
                  <p className="mt-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-sm text-emerald-300">
                    ✓ Approved. Ticket {result.incidentId} dispatched to{" "}
                    {result.escalationTeam}.
                  </p>
                )}
                {approval === "rejected" && (
                  <p className="mt-3 rounded border border-orange-500/40 bg-orange-500/10 p-2 text-sm text-orange-300">
                    ✗ Rejected. Sent back for manual review.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-600">
        Incident Triage · agent-to-agent mesh · reasoning by Groq
      </footer>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      <input
        value={value}
        inputMode={numeric ? "decimal" : "text"}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-edge bg-base px-3 py-2 text-slate-100 outline-none transition focus:border-sky-500"
      />
    </label>
  );
}
