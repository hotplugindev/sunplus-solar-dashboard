import type { Alert } from "@sunplus/shared";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { timeAgo } from "../lib/utils";

interface Props {
  alerts: Alert[];
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  warning: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
};

export default function AlertFeed({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No active alerts.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={`rounded-lg border border-gray-800 ${config.bg} p-4`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 ${config.color} shrink-0 mt-0.5`} />
              <div className="min-w-0">
                <p className="text-sm text-gray-200">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{alert.deviceId}</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{timeAgo(alert.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
