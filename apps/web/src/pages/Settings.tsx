import { useState } from "react";
import { deviceCreateSchema } from "@sunplus/shared";

export default function Settings() {
  const [form, setForm] = useState({
    id: "",
    name: "",
    siteLocation: "",
    capacityKw: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const parsed = deviceCreateSchema.safeParse({
      ...form,
      capacityKw: parseFloat(form.capacityKw),
    });

    if (!parsed.success) {
      setStatus(`Validation error: ${parsed.error.issues[0]?.message}`);
      return;
    }

    try {
      const res = await fetch("/api/v1/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        setStatus("Device registered successfully!");
        setForm({ id: "", name: "", siteLocation: "", capacityKw: "" });
      } else {
        const body = await res.json();
        setStatus(`Error: ${body.error}`);
      }
    } catch {
      setStatus("Failed to register device.");
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold mb-4">Register New Device</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Device ID</label>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              placeholder="solar-inv-001"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              placeholder="Inverter A - Building 1"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Site Location</label>
            <input
              type="text"
              value={form.siteLocation}
              onChange={(e) => setForm({ ...form, siteLocation: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              placeholder="Rooftop - East Wing"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Capacity (kW)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={form.capacityKw}
              onChange={(e) => setForm({ ...form, capacityKw: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              placeholder="50.0"
              required
            />
          </div>
          {status && (
            <p className={`text-sm ${status.startsWith("Error") || status.startsWith("Validation") ? "text-red-400" : "text-emerald-400"}`}>
              {status}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-solar-400 transition-colors"
          >
            Register Device
          </button>
        </form>
      </div>
    </div>
  );
}
