import { useState } from "react";
import type { ProviderId, ProviderAuthData } from "@sunplus/shared";
import { PROVIDERS, sourceCreateSchema } from "@sunplus/shared";
import { useSources } from "../hooks/useSources";
import SourceList from "../components/SourceList";
import { api } from "../lib/api";

const AUTH_FIELDS: Record<ProviderId, Array<{ key: keyof ProviderAuthData; label: string; type: string }>> = {
  solaredge: [
    { key: "api_key", label: "API Key", type: "text" },
    { key: "extra_config", label: "Site IDs (comma-separated)", type: "text" },
  ],
  fronius: [
    { key: "oauth_client_id", label: "Access Key ID", type: "text" },
    { key: "oauth_client_secret", label: "Access Key Value", type: "password" },
    { key: "extra_config", label: "PV System IDs (comma-separated)", type: "text" },
  ],
  huawei: [
    { key: "username", label: "Username", type: "text" },
    { key: "password_hash", label: "Password", type: "password" },
  ],
  sungrow: [
    { key: "oauth_client_id", label: "App ID", type: "text" },
    { key: "api_key", label: "API Key", type: "text" },
    { key: "extra_config", label: "Device SN", type: "text" },
  ],
  sma: [
    { key: "oauth_client_id", label: "Client ID", type: "text" },
    { key: "oauth_client_secret", label: "Client Secret", type: "password" },
    { key: "extra_config", label: "Login Hint (email) & Base URL", type: "text" },
  ],
  sigenergy: [],
};

export default function Settings() {
  const { data: sources, refetch } = useSources();
  const [tab, setTab] = useState<"sources" | "providers">("sources");
  const [form, setForm] = useState({
    name: "",
    provider: "" as ProviderId | "",
    config: "{}",
    pollIntervalMinutes: "15",
  });
  const [authForm, setAuthForm] = useState<Record<string, string>>({});
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

    const auth: ProviderAuthData = {};
    for (const [key, val] of Object.entries(authForm)) {
      if (key === "extra_config") {
        const parts = val.split(",").map((s) => s.trim());
        const extra: Record<string, string> = {};
        if (form.provider === "solaredge") extra["siteIds"] = val;
        if (form.provider === "fronius") extra["pvSystemIds"] = val;
        if (form.provider === "sungrow") extra["deviceSn"] = val;
        if (form.provider === "sma") {
          extra["loginHint"] = parts[0] || "";
          extra["baseUrl"] = parts[1] || "https://api.smaapis.de";
          extra["authUrl"] = parts[2] || "https://auth.smaapis.de";
        }
        auth.extra_config = extra;
      } else {
        (auth as any)[key] = val;
      }
    }

    try {
      await api.sources.create({ ...parsed.data, auth });
      setStatus("Source added successfully!");
      setForm({ name: "", provider: "", config: "{}", pollIntervalMinutes: "15" });
      setAuthForm({});
      refetch();
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const implementedProviders = PROVIDERS.filter((p) => p.implemented);
  const selectedProvider = form.provider as ProviderId;
  const fields = selectedProvider ? AUTH_FIELDS[selectedProvider] || [] : [];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab("sources")}
          className={`px-4 py-2 text-sm rounded-t ${tab === "sources" ? "bg-gray-800 text-solar-400" : "text-gray-400 hover:text-white"}`}
        >
          Sources
        </button>
        <button
          onClick={() => setTab("providers")}
          className={`px-4 py-2 text-sm rounded-t ${tab === "providers" ? "bg-gray-800 text-solar-400" : "text-gray-400 hover:text-white"}`}
        >
          Providers
        </button>
      </div>

      {tab === "sources" && (
        <div className="space-y-6">
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
                  onChange={(e) => {
                    setForm({ ...form, provider: e.target.value as ProviderId });
                    setAuthForm({});
                  }}
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

              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={authForm[f.key] || ""}
                    onChange={(e) => setAuthForm({ ...authForm, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
              ))}

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
            <SourceList
              sources={sources ?? []}
              onToggle={async (id, isActive) => {
                await api.sources.update(id, { isActive });
                refetch();
              }}
              onDelete={async (id) => {
                await api.sources.remove(id);
                refetch();
              }}
            />
          </div>
        </div>
      )}

      {tab === "providers" && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Provider Management</h2>
          <p className="text-sm text-gray-400 mb-4">
            Providers are configured when adding a source. Each source has its own authentication credentials stored securely.
          </p>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
                <div>
                  <span className="font-medium text-white">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({p.app})</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${p.implemented ? "bg-emerald-900 text-emerald-300" : "bg-gray-700 text-gray-400"}`}>
                  {p.implemented ? "Implemented" : "Not Implemented"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
