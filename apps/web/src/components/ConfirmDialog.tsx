import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "danger", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  const btnColor = variant === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[90]" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${variant === "danger" ? "text-red-400" : "text-amber-400"}`} />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${btnColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
