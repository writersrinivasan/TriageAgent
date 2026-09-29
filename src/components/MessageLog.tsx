"use client";

import { useEffect, useRef } from "react";
import { AGENTS } from "@/lib/agents";
import { AgentMessage } from "@/lib/types";

const KIND_STYLE: Record<AgentMessage["kind"], string> = {
  request: "border-sky-500/40 bg-sky-500/5",
  response: "border-emerald-500/40 bg-emerald-500/5",
  broadcast: "border-violet-500/40 bg-violet-500/5",
};

export default function MessageLog({ messages }: { messages: AgentMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex h-[430px] flex-col rounded-xl border border-edge bg-base/40">
      <div className="border-b border-edge px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Message Bus
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-slate-500">
            No messages yet. Run the mesh to watch the agents talk.
          </p>
        )}
        {messages.map((msg) => {
          const from = AGENTS[msg.from];
          const to = AGENTS[msg.to];
          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-2.5 text-sm ${KIND_STYLE[msg.kind]} animate-[fadeIn_0.3s_ease]`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs">
                <span className={from.color}>
                  {from.emoji} {from.name}
                </span>
                <span className="text-slate-600">→</span>
                <span className={to.color}>
                  {to.emoji} {to.name}
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="rounded-full bg-edge px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                    {msg.kind}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase ${
                      msg.poweredBy === "groq"
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-slate-600/30 text-slate-400"
                    }`}
                    title={
                      msg.poweredBy === "groq"
                        ? "Reasoned by Groq LLM"
                        : "Deterministic fallback"
                    }
                  >
                    {msg.poweredBy === "groq" ? "⚡ groq" : "rule"}
                  </span>
                </span>
              </div>
              <div className="font-medium text-slate-200">{msg.summary}</div>
              {msg.content && msg.content !== msg.summary && (
                <div className="mt-1 whitespace-pre-wrap text-xs text-slate-400">
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
