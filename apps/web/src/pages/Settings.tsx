import { useState } from "react";
import type { ProviderId, ProviderAuthData } from "@sunplus/shared";
import { PROVIDERS, sourceCreateSchema } from "@sunplus/shared";
import { useSources } from "../hooks/useSources";
import SourceList from "../components/SourceList";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import { Loader2, TestTube, Info } from "lucide-react";

const AUTH_FIELDS: Record<ProviderId, Array<{ key: keyof ProviderAuthData; label: string; type: string; help: string }>> = {
  solaredge: [
    { key: "api_key", label: "API Key", type: "password", help: "Found in mySolarEdge portal under Admin > API Access" },
    { key: "extra_config", label: "Site IDs (comma-separated)", type: "text", help: "Numeric site identifiers from your SolarEdge dashboard URL" },
  ],
  fronius: [
    { key: "oauth_client_id", label: "Access Key ID", type: "text", help: "Generated in Fronius Solar.web developer settings" },
    { key: "oauth_client_secret", label: "Access Key Value", type: "password", help: "The secret paired with your Access Key ID" },
    { key: "extra_config", label: "PV System IDs (comma-separated)", type: "text", help: "Found in your Solar.web system overview URLs" },
  ],
  huawei: [
    { key: "username", label: "Username", type: "text", help: "Your FusionSolar API access key (x-dt-ak)" },
    { key: "password_hash", label: "Password", type: "password", help: "Your FusionSolar API secret used for HMAC signing" },
  ],
  sungrow: [
    { key: "oauth_client_id", label: "App ID", type: "text", help: "Application ID from iSolarCloud developer console" },
    { key: "api_key", label: "API Key", type: "password", help: "API key generated alongside your App ID" },
    { key: "extra_config", label: "Device Serial Number", type: "text", help: "The SN of the device to monitor, found on device label" },
  ],
  sma: [
    { key: "oauth_client_id", label: "Client ID", type: "text", help: "OAuth2 client ID from SMA Developer Portal" },
    { key: "oauth_client_secret", label: "Client Secret", type: "password", help: "OAuth2 client secret from SMA Developer Portal" },
    { key: "extra_config", label: "Login Hint, Base URL, Auth URL", type: "text", help: "Comma-separated: email, https://api.smaapis.de, https://auth.smaapis.de" },
  ],
  sigenergy: [],
};

export default function Settings() {
  const { data: sources, refetch } = useSources();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"sources" | "providers">("sources");
  const [form, setForm] = useState({ name: "", provider: "" as ProviderId | "", config: "{}", pollIntervalMinutes: "60" });
  const [authForm, setAuthForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateJson = (val: string) => {
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON syntax");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setTestResult(null);

    let config: Record<string, string>;
    try {
      config = JSON.parse(form.config);
    } catch {
      setStatus("Config must be valid JSON");
      addToast("Invalid JSON in config field", "error");
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
      addToast("Validation failed", "error");
      return;
    }

    const auth: ProviderAuthData = {};
    for (const [key, val] of Object.entries(authForm)) {
      if (!val) continue;
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
      const res = await api.sources.create({ ...parsed.data, auth });
      setStatus("Source added successfully!");
      setLastCreatedId(res.source.id);
      setForm({ name: "", provider: "", config: "{}", pollIntervalMinutes: "60" });
      setAuthForm({});
      addToast(`Source "${res.source.name}" created`, "success");
      refetch();
    } catch (err: any) {
      const msg = err?.message ?? "Unknown error";
      setStatus(`Error: ${msg}`);
      addToast(msg.includes("already exists") ? "Duplicate source detected" : "Failed to create source", "error");
    }
  };

  const handleTest = async (id: number) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.sources.test(id);
      if (res.success) {
        setTestResult({ success: true, message: `Connection OK. Found ${res.metricsCount} metric(s) in ${res.durationMs}ms.` });
        addToast("Connection test passed", "success");
      } else {
        setTestResult({ success: false, message: res.hint ?? res.error ?? "Unknown error" });
        addToast("Connection test failed", "error");
      }
    } catch (err: any) {
      const body = err?.body as any;
      setTestResult({ success: false, message: body?.hint ?? body?.error ?? err?.message ?? "Test failed" });
      addToast("Connection test failed", "error");
    } finally {
      setTesting(false);
    }
  };

  const implementedProviders = PROVIDERS.filter((p) => p.implemented);
  const selectedProvider = form.provider as ProviderId;
  const fields = selectedProvider ? AUTH_FIELDS[selectedProvider] || [] : [];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button onClick={() => setTab("sources")} className={`px-4 py-2 text-sm rounded-t ${tab === "sources" ? "bg-gray-800 text-solar-400" : "text-gray-400 hover:text-white"}`}>Sources</button>
        <button onClick={() => setTab("providers")} className={`px-4 py-2 text-sm rounded-t ${tab === "providers" ? "bg-gray-800 text-solar-400" : "text-gray-400 hover:text-white"}`}>Providers</button>
      </div>

      {tab === "sources" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-lg font-semibold mb-4">Add Solar Source</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Source Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" placeholder="Home Rooftop Array" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Provider</label>
                <select value={form.provider} onChange={(e) => { setForm({ ...form, provider: e.target.value as ProviderId }); setAuthForm({}); setTestResult(null); }} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" required>
                  <option value="">Select provider...</option>
                  {implementedProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.app})</option>
                  ))}
                </select>
                {selectedProvider && (
                  <p className="text-xs text-gray-600 mt-1">You will need: {PROVIDERS.find((p) => p.id === selectedProvider)?.requiredFields.join(", ")}</p>
                )}
              </div>

              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input type={f.type} value={authForm[f.key] || ""} onChange={(e) => setAuthForm({ ...authForm, [f.key]: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><Info className="h-3 w-3" />{f.help}</p>
                </div>
              ))}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Poll Interval (minutes)</label>
                <input type="number" min="5" max="1440" value={form.pollIntervalMinutes} onChange={(e) => setForm({ ...form, pollIntervalMinutes: e.target.value })} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" required />
                <p className="text-xs text-gray-600 mt-1">Default 60min recommended to conserve Cloudflare free tier quota.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Advanced Config (JSON)</label>
                <textarea value={form.config} onChange={(e) => { setForm({ ...form, config: e.target.value }); validateJson(e.target.value); }} onBlur={() => validateJson(form.config)} className={`w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm font-mono h-20 ${jsonError ? "border-red-700" : "border-gray-700"}`} />
                {jsonError && <p className="text-xs text-red-400 mt-1">{jsonError}</p>}
              </div>

              {status && (
                <p className={`text-sm ${status.startsWith("Error") || status.startsWith("Validation") || status.startsWith("Config") ? "text-red-400" : "text-emerald-400"}`}>{status}</p>
              )}
              <button type="submit" className="w-full rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-solar-400 transition-colors">Add Source</button>
            </form>
          </div>

          {lastCreatedId && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><TestTube className="h-4 w-4 text-blue-400" />Test Connection</h3>
              <p className="text-xs text-gray-500">Verify your credentials work before waiting for the next scheduled poll.</p>
              {testResult && (
                <p className={`text-sm ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>{testResult.message}</p>
              )}
              <button onClick={() => handleTest(lastCreatedId)} disabled={testing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-4">Configured Sources</h2>
            <SourceList
              sources={sources ?? []}
              onToggle={async (id, isActive) => {
                try {
                  await api.sources.update(id, { isActive });
                  addToast(isActive ? "Source paused" : "Source resumed", "info");
                  refetch();
                } catch { addToast("Failed to update source", "error"); }
              }}
              onDelete={async (id) => {
                try {
                  await api.sources.remove(id);
                  addToast("Source deleted", "success");
                  if (lastCreatedId === id) setLastCreatedId(null);
                  refetch();
                } catch { addToast("Failed to delete source", "error"); }
              }}
            />
          </div>
        </div>
      )}

      {tab === "providers" && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Provider Management</h2>
          <p className="text-sm text-gray-400 mb-4">Each source has its own authentication credentials stored securely.</p>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
                <div>
                  <span className="font-medium text-white">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({p.app})</span>
                  {p.implemented && <p className="text-xs text-gray-600 mt-1">Requires: {p.requiredFields.join(", ")}</p>}
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
