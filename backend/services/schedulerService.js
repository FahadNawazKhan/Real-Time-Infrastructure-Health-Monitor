import { fetchInstancesData } from "../routes/instanceRoutes.js";
import { fetchAlarmsData } from "../routes/alarmRoutes.js";
import { getInstanceMetrics } from "./cloudwatchService.js";

// Cached central state
let telemetryCache = {
  timestamp: new Date().toISOString(),
  freshness: {
    collectedAt: null,
    ageSeconds: null,
    isFresh: false,
    intervalMs: 10000,
  },
  health: {
    status: "healthy", // "healthy" | "warning" | "critical" | "degraded"
    score: 100,
    summary: "Initializing telemetry ingestion...",
    activeAlarmsCount: 0,
    breaches: [],
  },
  instances: [],
  metricsByInstance: {},
  alarms: [],
  connectedClients: 0,
};

let ioInstance = null;
let schedulerTimer = null;
let isCollecting = false;

/**
 * Health Evaluation Logic
 * Analyzes active alarms and metric thresholds across all nodes
 */
export const evaluateHealth = (instances, metricsByInstance, alarms) => {
  let score = 100;
  const breaches = [];
  const inAlarm = alarms.filter((a) => a.state === "ALARM");

  // 1. Alarm Breaches
  if (inAlarm.length > 0) {
    score -= inAlarm.length * 25;
    inAlarm.forEach((a) => {
      breaches.push(`Alarm triggered: ${a.name} (${a.metricName} breached threshold)`);
    });
  }

  // 2. Instance Metric Thresholds
  instances.forEach((inst) => {
    const m = metricsByInstance[inst.instanceId];
    if (!m) return;

    if (m.cpu?.value !== undefined && m.cpu.value !== null) {
      if (m.cpu.value >= 85) {
        score -= 20;
        breaches.push(`Critical CPU load on ${inst.name || inst.instanceId}: ${m.cpu.value.toFixed(1)}%`);
      } else if (m.cpu.value >= 70) {
        score -= 10;
        breaches.push(`Elevated CPU load on ${inst.name || inst.instanceId}: ${m.cpu.value.toFixed(1)}%`);
      }
    }

    if (m.memory?.value !== undefined && m.memory.value !== null) {
      if (m.memory.value >= 90) {
        score -= 20;
        breaches.push(`Critical Memory saturation on ${inst.name || inst.instanceId}: ${m.memory.value.toFixed(1)}%`);
      } else if (m.memory.value >= 80) {
        score -= 10;
        breaches.push(`High Memory utilization on ${inst.name || inst.instanceId}: ${m.memory.value.toFixed(1)}%`);
      }
    }

    if (m.disk?.value !== undefined && m.disk.value !== null) {
      if (m.disk.value >= 90) {
        score -= 20;
        breaches.push(`Critical Disk usage on ${inst.name || inst.instanceId}: ${m.disk.value.toFixed(1)}%`);
      }
    }
  });

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let status = "healthy";
  if (score < 50) {
    status = "critical";
  } else if (score < 80) {
    status = "warning";
  }

  let summary = `All ${instances.length} instances operational within normal thresholds.`;
  if (breaches.length > 0) {
    summary = `${breaches.length} issue(s) detected: ${breaches[0]}`;
  }

  return {
    status,
    score,
    summary,
    activeAlarmsCount: inAlarm.length,
    breaches,
  };
};

/**
 * Metric Collection Scheduler
 * Calls AWS once and updates telemetry cache
 */
export const collectTelemetry = async () => {
  if (isCollecting) return telemetryCache;
  isCollecting = true;

  const collectionStart = Date.now();

  try {
    // 1. Fetch Instances & Alarms in parallel
    const [instancesRes, alarmsRes] = await Promise.allSettled([
      fetchInstancesData(),
      fetchAlarmsData(),
    ]);

    const instances = instancesRes.status === "fulfilled" ? instancesRes.value : [];
    const alarms = alarmsRes.status === "fulfilled" ? alarmsRes.value : [];

    // 2. Fetch Metrics for running instances (bounded concurrency)
    const runningInstances = instances.filter(
      (i) => i.state?.toLowerCase() === "running"
    );

    const metricsByInstance = {};
    const metricPromises = runningInstances.map(async (inst) => {
      try {
        const metrics = await getInstanceMetrics(inst.instanceId);
        metricsByInstance[inst.instanceId] = metrics;
      } catch (err) {
        console.error(`Metric fetch error for ${inst.instanceId}:`, err.message);
        metricsByInstance[inst.instanceId] = { cpu: null, memory: null, disk: null };
      }
    });

    await Promise.allSettled(metricPromises);

    // 3. Health Evaluation
    const health = evaluateHealth(instances, metricsByInstance, alarms);

    // 4. Metric Freshness
    const now = new Date();
    const ageSeconds = Math.round((Date.now() - collectionStart) / 1000);

    telemetryCache = {
      timestamp: now.toISOString(),
      freshness: {
        collectedAt: now.toISOString(),
        ageSeconds,
        isFresh: true,
        collectionDurationMs: Date.now() - collectionStart,
        intervalMs: 10000,
      },
      health,
      instances,
      metricsByInstance,
      alarms,
      connectedClients: ioInstance?.engine?.clientsCount || 0,
    };

    // 5. Broadcast to all connected Socket.IO clients
    if (ioInstance) {
      ioInstance.emit("telemetry:update", telemetryCache);
    }

    return telemetryCache;
  } catch (error) {
    console.error("Scheduler telemetry collection failed:", error);

    telemetryCache.health = {
      status: "degraded",
      score: 40,
      summary: `AWS Telemetry ingestion error: ${error.message}`,
      activeAlarmsCount: telemetryCache.alarms.filter((a) => a.state === "ALARM").length,
      breaches: [error.message],
    };
    telemetryCache.freshness.isFresh = false;

    if (ioInstance) {
      ioInstance.emit("telemetry:update", telemetryCache);
    }

    return telemetryCache;
  } finally {
    isCollecting = false;
  }
};

/**
 * Initializes the Socket.IO server and the background collection scheduler
 */
export const initTelemetryScheduler = (io, intervalMs = 10000) => {
  ioInstance = io;

  // Handle client connections
  io.on("connection", (socket) => {
    // 1. Send the latest cached state immediately so dashboard renders with zero delay
    socket.emit("telemetry:init", telemetryCache);

    // 2. Allow clients to request an on-demand refresh (coalesced through the scheduler)
    socket.on("telemetry:request_refresh", async () => {
      const updated = await collectTelemetry();
      socket.emit("telemetry:update", updated);
    });

    socket.on("disconnect", () => {
      // client disconnected
    });
  });

  // Run initial collection immediately
  collectTelemetry();

  // Start periodic single scheduler (1 backend timer for N clients)
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = setInterval(collectTelemetry, intervalMs);

  console.log(`Telemetry Collection Scheduler active (Interval: ${intervalMs / 1000}s)`);
};

export const getCachedTelemetry = () => telemetryCache;
