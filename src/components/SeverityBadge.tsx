import { Severity } from "@/lib/types";

const STYLES: Record<Severity, string> = {
  Critical: "bg-red-500/15 text-red-300 border-red-500/40",
  High: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  Medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  Low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${STYLES[severity]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {severity}
    </span>
  );
}
