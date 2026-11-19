/**
 * API client to communicate with the CloudPulse backend
 */

export const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function fetchTelemetry() {
  const res = await fetch(`${API_BASE}/telemetry`);
  if (!res.ok) throw new Error(`Telemetry sync failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

export async function triggerManualSync() {
  const res = await fetch(`${API_BASE}/telemetry/sync`, { method: 'POST' });
  if (!res.ok) throw new Error(`Manual sync failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

export async function fetchInstances() {
  const res = await fetch(`${API_BASE}/instances`);
  if (!res.ok) throw new Error(`Failed to fetch instances (${res.status})`);
  const data = await res.json();
  return data.instances || [];
}

export async function fetchMetrics(instanceId) {
  if (!instanceId) return null;
  const res = await fetch(`${API_BASE}/metrics/${encodeURIComponent(instanceId)}`);
  if (!res.ok) throw new Error(`Failed to fetch metrics for ${instanceId} (${res.status})`);
  const data = await res.json();
  return data.metrics || null;
}

export async function fetchAlarms() {
  const res = await fetch(`${API_BASE}/alarms`);
  if (!res.ok) throw new Error(`Failed to fetch alarms (${res.status})`);
  const data = await res.json();
  return data.alarms || [];
}
