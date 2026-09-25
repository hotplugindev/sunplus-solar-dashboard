import type { Source } from "@sunplus/shared";
import { PROVIDERS } from "@sunplus/shared";
import { Pause, Play, Trash2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { timeAgo } from "../lib/utils";

interface SourceListProps {
  sources: Source[];
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}

export default function SourceList({ sources, onToggle, onDelete }: SourceListProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-gray-600" />
        <p className="text-gray-500 text-sm">No sources configured yet.</p>
        <p className="text-gray-600 text-xs">Add your first solar source above to start monitoring.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => {
        const providerInfo = PROVIDERS.find((p) => p.id === source.provider);
        const isHealthy = source.consecutiveFailures === 0 && source.circuitState === "closed";
        const isTripped = source.circuitState === "open";

        return (
          <div
            key={source.id}
            className={`rounded-xl border bg-gray-900 p-4 flex items-center justify-between ${isTripped ? "border-red-900" : "border-gray-800"}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{source.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  source.isActive
                    ? isHealthy
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-amber-900 text-amber-300"
                    : "bg-gray-800 text-gray-400"
                }`}>
                  {source.isActive ? (
                    isHealthy ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                  {source.isActive ? (isHealthy ? "active" : "failing") : "paused"}
                </span>
                {isTripped && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> circuit open
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {providerInfo?.name} · Poll every {formatInterval(source.pollIntervalMinutes)}
                {source.lastPolledAt && ` · Last: ${timeAgo(source.lastPolledAt)}`}
              </p>
              {source.lastError && (
                <p className="text-xs text-red-400 mt-1 truncate" title={source.lastError}>
                  Error: {parseErrorMessage(source.lastError)}
                </p>
              )}
              {source.consecutiveFailures > 0 && !source.lastError && (
                <p className="text-xs text-amber-400 mt-1">
                  {source.consecutiveFailures} consecutive failure{source.consecutiveFailures > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={() => onToggle(source.id, !source.isActive)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title={source.isActive ? "Pause source" : "Resume source"}
              >
                {source.isActive ? <Pause className="h-4 w-4 text-gray-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
              </button>
              <button
                onClick={() => setDeleteId(source.id)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Delete source"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Source"
        message="This will permanently delete the source and all its telemetry data. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteId !== null) onDelete(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseErrorMessage(msg: string): string {
  if (msg.includes("401") || msg.includes("403")) return "Invalid credentials";
  if (msg.includes("404")) return "Resource not found - check IDs";
  if (msg.includes("429")) return "Rate limited by provider";
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) return "Provider API unavailable";
  if (msg.includes("fetch") || msg.includes("network")) return "Network error";
  if (msg.includes("consent")) return "User consent required in provider portal";
  if (msg.length > 80) return msg.slice(0, 80) + "...";
  return msg;
}
