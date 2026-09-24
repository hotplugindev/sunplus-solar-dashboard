import { useState } from "react";
import type { ProviderId } from "@sunplus/shared";
import { PROVIDERS, sourceCreateSchema } from "@sunplus/shared";
import { useSources } from "../hooks/useSources";
import SourceList from "../components/SourceList";

export default function Settings() {
  const { data: sources, refetch } = useSources();
  const [form, setForm] = useState({
    name: "",
    provider: "" as ProviderId | "",
    config: "{}",
    pollIntervalMinutes: "15",
  });
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    let config: Record<string, string>;
    try {
      config = JSON.parse(form.config);
    } catch {
      setStatus("Config must be valid JSON");
      return;
    }

    const parsed = sourceCreateSchema.safeParse({
      name: form.name,
      provider: form.provider,
      config,
      pollIntervalMinutes: parseInt(form.pollIntervalMinutes, 10),
    });

    if (!parsed.success) {
      setStatus(`Validation error: ${parsed.error.issues[0]?.message}`);
      return;
    }

    try {
      const res = await fetch("/api/v1/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        setStatus("Source added successfully!");
        setForm({ name: "", provider: "", config: "{}", pollIntervalMinutes: "15" });
        refetch();
      } else {
        const body = await res.json();
        setStatus(`Error: ${body.error}`);
      }
    } catch {
      setStatus("Failed to add source.");
    }
  };

  const implementedProviders = PROVIDERS.filter((p) => p.implemented);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold mb-4">Add Solar Source</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Source Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              placeholder="Home Rooftop Array"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Provider</label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as ProviderId })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              required
            >
              <option value="">Select provider...</option>
              {implementedProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.app})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Config (JSON)</label>
            <textarea
              value={form.config}
              onChange={(e) => setForm({ ...form, config: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono"
              rows={4}
              placeholder='{"apiKey": "...", "siteIds": "123,456"}'
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Poll Interval (minutes)</label>
            <input
              type="number"
              min="5"
              max="1440"
              value={form.pollIntervalMinutes}
              onChange={(e) => setForm({ ...form, pollIntervalMinutes: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              required
            />
          </div>
          {status && (
            <p className={`text-sm ${status.startsWith("Error") || status.startsWith("Validation") || status.startsWith("Config") || status.startsWith("Failed") ? "text-red-400" : "text-emerald-400"}`}>
              {status}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-solar-400 transition-colors"
          >
            Add Source
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Configured Sources</h2>
        <SourceList sources={sources ?? []} />
      </div>
    </div>
  );
}
