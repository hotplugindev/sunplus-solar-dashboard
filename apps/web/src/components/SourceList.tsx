import type { Source } from "@sunplus/shared";
import { PROVIDERS } from "@sunplus/shared";
import { Pause, Play, Trash2 } from "lucide-react";

interface SourceListProps {
  sources: Source[];
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}

export default function SourceList({ sources, onToggle, onDelete }: SourceListProps) {
  if (sources.length === 0) {
    return <div className="text-gray-500 text-sm">No sources configured yet.</div>;
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => {
        const providerInfo = PROVIDERS.find((p) => p.id === source.provider);
        return (
          <div
            key={source.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{source.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${source.isActive ? "bg-emerald-900 text-emerald-300" : "bg-gray-800 text-gray-400"}`}>
                  {source.isActive ? "active" : "paused"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {providerInfo?.name} · Poll every {source.pollIntervalMinutes}min
                {source.lastPolledAt && ` · Last: ${new Date(source.lastPolledAt).toLocaleString()}`}
                {source.lastError && ` · Error: ${source.lastError}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(source.id, source.isActive)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {source.isActive ? <Pause className="h-4 w-4 text-gray-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
              </button>
              <button
                onClick={() => onDelete(source.id)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
