"use client";

import { TriageResult } from "@/lib/types";
import SeverityBadge from "./SeverityBadge";

export default function TriageReport({ result }: { result: TriageResult }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Incident {result.incidentId}
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Triage Report</h2>
        </div>
        <SeverityBadge severity={result.severity} />
      </div>

      <section className="rounded-lg border border-edge bg-panel p-4">
        <h3 className="mb-1 text-sm font-semibold text-sky-300">Probable Cause</h3>
        <p className="text-slate-200">{result.probableCause}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span>Confidence</span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-edge">
            <div
              className="h-full bg-sky-400"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
          <span>{result.confidence}%</span>
        </div>
      </section>

      <section className="rounded-lg border border-edge bg-panel p-4">
        <h3 className="mb-2 text-sm font-semibold text-sky-300">Evidence</h3>
        <div className="overflow-hidden rounded-md border border-edge">
          <table className="w-full text-left text-sm">
            <thead className="bg-base/60 text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Signal</th>
                <th className="px-3 py-2 font-medium">Observed</th>
                <th className="px-3 py-2 font-medium">Threshold</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.evidence.map((e, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="px-3 py-2 text-slate-300">{e.signal}</td>
                  <td className="px-3 py-2 font-mono text-slate-200">{e.observed}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{e.threshold}</td>
                  <td className="px-3 py-2">
                    {e.breached ? (
                      <span className="text-red-400">Breached</span>
                    ) : (
                      <span className="text-emerald-400">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-edge bg-panel p-4">
        <h3 className="mb-2 text-sm font-semibold text-sky-300">Recommended Actions</h3>
        <ol className="list-decimal space-y-1 pl-5 text-slate-200">
          {result.recommendedActions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-lg border border-edge bg-panel p-4">
          <h3 className="mb-2 text-sm font-semibold text-sky-300">
            Similar Past Incidents
          </h3>
          {result.matchedIncidents.length === 0 ? (
            <p className="text-sm text-slate-500">No close historical matches.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {result.matchedIncidents.map((inc) => (
                <li key={inc.id} className="rounded border border-edge bg-base/40 p-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-slate-300">{inc.id}</span>
                    <span className="text-slate-500">{inc.date}</span>
                  </div>
                  <div className="text-slate-200">{inc.title}</div>
                  <div className="mt-1 text-slate-400">Cause: {inc.rootCause}</div>
                  <div className="text-slate-400">Fix: {inc.resolution}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-edge bg-panel p-4">
          <h3 className="mb-2 text-sm font-semibold text-sky-300">
            Knowledge Base Matches
          </h3>
          {result.matchedArticles.length === 0 ? (
            <p className="text-sm text-slate-500">No relevant articles.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {result.matchedArticles.map((a) => (
                <li key={a.id} className="rounded border border-edge bg-base/40 p-2">
                  <div className="font-mono text-slate-300">{a.id}</div>
                  <div className="text-slate-200">{a.title}</div>
                  <div className="mt-1 text-slate-400">{a.cause}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-edge bg-panel p-4">
        <h3 className="mb-1 text-sm font-semibold text-sky-300">Escalation</h3>
        <p className="text-slate-200">{result.escalationTeam}</p>
      </section>
    </div>
  );
}
