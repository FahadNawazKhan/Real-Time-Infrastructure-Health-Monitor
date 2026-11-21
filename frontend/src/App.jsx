import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar.jsx';
import MetricsBar from './components/MetricsBar.jsx';
import InstanceTable from './components/InstanceTable.jsx';
import InstanceTelemetry from './components/InstanceTelemetry.jsx';
import AlarmsTable from './components/AlarmsTable.jsx';
import { socket } from './socket.js';
import { fetchTelemetry, triggerManualSync } from './api.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [metricsByInstance, setMetricsByInstance] = useState({});
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [health, setHealth] = useState(null);
  const [freshness, setFreshness] = useState(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const selectedInstanceRef = useRef(selectedInstance);
  useEffect(() => {
    selectedInstanceRef.current = selectedInstance;
  }, [selectedInstance]);

  // Central handler for telemetry broadcast from the backend scheduler
  const handleTelemetryPayload = useCallback((payload) => {
    if (!payload) return;

    setErrorMessage(null);
    setFreshness(payload.freshness || null);
    setHealth(payload.health || null);

    const instList = payload.instances || [];
    setInstances(instList);

    const metricsMap = payload.metricsByInstance || {};
    setMetricsByInstance(metricsMap);

    setAlarms(payload.alarms || []);

    // 1. Auto-select first running instance if none selected
    let currentSelected = selectedInstanceRef.current;
    if (!currentSelected && instList.length > 0) {
      currentSelected =
        instList.find((i) => i.state?.toLowerCase() === 'running') ||
        instList[0];
      setSelectedInstance(currentSelected);
    }

    // 2. Append metrics point for selected instance to time-series chart
    if (currentSelected?.instanceId && metricsMap[currentSelected.instanceId]) {
      const activeMetrics = metricsMap[currentSelected.instanceId];
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const cpuVal =
        activeMetrics.cpu?.value !== undefined && activeMetrics.cpu.value !== null
          ? Number(activeMetrics.cpu.value.toFixed(1))
          : null;
      const memVal =
        activeMetrics.memory?.value !== undefined && activeMetrics.memory.value !== null
          ? Number(activeMetrics.memory.value.toFixed(1))
          : null;
      const diskVal =
        activeMetrics.disk?.value !== undefined && activeMetrics.disk.value !== null
          ? Number(activeMetrics.disk.value.toFixed(1))
          : null;

      // Only plot if at least one metric has data
      if (cpuVal !== null || memVal !== null || diskVal !== null) {
        setMetricsHistory((prev) => {
          const next = [
            ...prev,
            {
              time: timeLabel,
              cpu: cpuVal,
              memory: memVal,
              disk: diskVal,
            },
          ];
          return next.slice(-25);
        });
      }
    }

    setIsRefreshing(false);
  }, []);

  // Socket.IO Lifecycle
  useEffect(() => {
    const onConnect = () => {
      setIsSocketConnected(true);
      setErrorMessage(null);
    };

    const onDisconnect = () => {
      setIsSocketConnected(false);
    };

    const onConnectError = (err) => {
      setIsSocketConnected(false);
      setErrorMessage(
        'WebSocket disconnected. Reconnecting to CloudPulse scheduler...'
      );
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('telemetry:init', handleTelemetryPayload);
    socket.on('telemetry:update', handleTelemetryPayload);

    // Initial fallback via REST if socket takes a moment to handshake
    fetchTelemetry()
      .then(handleTelemetryPayload)
      .catch((err) => {
        // will retry on socket connect
      });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('telemetry:init', handleTelemetryPayload);
      socket.off('telemetry:update', handleTelemetryPayload);
    };
  }, [handleTelemetryPayload]);

  // When user selects a different instance in the table
  const handleSelectInstance = (inst) => {
    setSelectedInstance(inst);
    setMetricsHistory([]); // reset sparkline for new node
  };

  // Manual refresh via WebSocket request
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (socket.connected) {
      socket.emit('telemetry:request_refresh');
    } else {
      triggerManualSync()
        .then(handleTelemetryPayload)
        .catch((err) => {
          setErrorMessage(`Sync failed: ${err.message}`);
          setIsRefreshing(false);
        });
    }
  };

  const selectedMetrics =
    selectedInstance && metricsByInstance[selectedInstance.instanceId]
      ? metricsByInstance[selectedInstance.instanceId]
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar with live WebSocket indicator & metric freshness lag */}
      <Navbar
        isSocketConnected={isSocketConnected}
        region="ap-south-1"
        freshness={freshness}
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Offline / Reconnecting Warning Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-sm flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="text-rose-400 hover:text-rose-200 underline font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Reconnect
            </button>
          </div>
        )}

        {/* 1. Health Evaluation & Fleet Summary KPI Cards */}
        <MetricsBar instances={instances} alarms={alarms} health={health} />

        {/* 2. Spotlight: Selected Instance Telemetry & Time-Series Chart */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-zinc-300">
              Live Telemetry Focus
            </span>
          </div>

          <InstanceTelemetry
            instance={selectedInstance}
            metrics={selectedMetrics}
            metricsHistory={metricsHistory}
            isLoadingMetrics={isRefreshing}
          />
        </section>

        {/* 3. EC2 Instance Fleet Table */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-zinc-300">
              EC2 Compute Inventory
            </span>
            <span className="text-zinc-500 text-[11px]">
              Discovered live from AWS account ({instances.length} instances)
            </span>
          </div>

          <InstanceTable
            instances={instances}
            selectedInstance={selectedInstance}
            onSelectInstance={handleSelectInstance}
          />
        </section>

        {/* 4. CloudWatch Metric Alarms */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-zinc-300">
              Alarm Thresholds &amp; Health Checks
            </span>
            <span className="text-zinc-500 text-[11px]">
              Monitored via AWS CloudWatch DescribeAlarms
            </span>
          </div>

          <AlarmsTable alarms={alarms} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-600 font-mono">
        CloudPulse &bull; AWS EC2 &amp; CloudWatch &bull; ap-south-1
      </footer>
    </div>
  );
}
