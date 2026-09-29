"use client";

import { useMemo } from "react";
import { AGENTS } from "@/lib/agents";
import { AgentId, AgentMessage } from "@/lib/types";

type AgentStatus = "idle" | "thinking" | "done";

// Fixed layout: coordinator in the center, specialists around it, human at bottom.
const LAYOUT: Record<AgentId, { x: number; y: number }> = {
  coordinator: { x: 300, y: 210 },
  "log-analyst": { x: 90, y: 90 },
  historian: { x: 300, y: 55 },
  "kb-researcher": { x: 510, y: 90 },
  "severity-assessor": { x: 90, y: 330 },
  "root-cause": { x: 510, y: 330 },
  human: { x: 300, y: 375 },
};

export default function AgentMesh({
  statuses,
  activeLink,
  messageCount,
}: {
  statuses: Record<AgentId, AgentStatus>;
  activeLink: { from: AgentId; to: AgentId; kind: AgentMessage["kind"] } | null;
  messageCount: number;
}) {
  const nodes = useMemo(() => Object.values(AGENTS), []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-edge bg-base/40">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wide">
          Agent-to-Agent Mesh
        </span>
        <span>{messageCount} messages exchanged</span>
      </div>
      <svg viewBox="0 0 600 430" className="h-[430px] w-full">
        {/* static faint links from coordinator to every node */}
        {nodes
          .filter((n) => n.id !== "coordinator")
          .map((n) => {
            const a = LAYOUT.coordinator;
            const b = LAYOUT[n.id];
            return (
              <line
                key={`base-${n.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#1e2733"
                strokeWidth={1.5}
              />
            );
          })}

        {/* active animated link */}
        {activeLink && (
          <ActiveLink
            from={LAYOUT[activeLink.from]}
            to={LAYOUT[activeLink.to]}
            kind={activeLink.kind}
          />
        )}

        {/* nodes */}
        {nodes.map((n) => {
          const p = LAYOUT[n.id];
          const status = statuses[n.id] || "idle";
          const isCoord = n.id === "coordinator";
          const r = isCoord ? 34 : 28;
          const ring =
            status === "thinking"
              ? "#38bdf8"
              : status === "done"
              ? "#34d399"
              : "#334155";
          return (
            <g key={n.id}>
              {status === "thinking" && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 6}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  opacity={0.5}
                >
                  <animate
                    attributeName="r"
                    values={`${r};${r + 12};${r}`}
                    dur="1.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0;0.6"
                    dur="1.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={isCoord ? "#0c2436" : "#111722"}
                stroke={ring}
                strokeWidth={2.5}
              />
              <text
                x={p.x}
                y={p.y - 2}
                textAnchor="middle"
                fontSize={isCoord ? 22 : 18}
              >
                {n.emoji}
              </text>
              <text
                x={p.x}
                y={p.y + r + 14}
                textAnchor="middle"
                fontSize={11}
                fill="#cbd5e1"
                fontWeight={600}
              >
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ActiveLink({
  from,
  to,
  kind,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: AgentMessage["kind"];
}) {
  const color =
    kind === "request" ? "#38bdf8" : kind === "response" ? "#34d399" : "#a78bfa";
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={2.5}
        opacity={0.85}
      />
      {/* traveling packet */}
      <circle r={5} fill={color}>
        <animate
          attributeName="cx"
          values={`${from.x};${to.x}`}
          dur="0.9s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cy"
          values={`${from.y};${to.y}`}
          dur="0.9s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}
