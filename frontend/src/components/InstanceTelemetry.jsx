import React, { useState } from 'react';
import {
  Cpu,
  Database,
  HardDrive,
  Clock,
  Terminal,
  Copy,
  Check,
  Info,
  MapPin,
  Server,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function InstanceTelemetry({
  instance,
  metrics,
  metricsHistory = [],
  isLoadingMetrics,
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!instance) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-10 text-center text-zinc-500 text-xs flex flex-col items-center justify-center min-h-[260px]">
        <Server className="w-8 h-8 text-zinc-700 mb-2" />
        <p className="font-medium text-zinc-400">No EC2 instance selected.</p>
        <span className="text-zinc-500 text-xs mt-1">
          Select an instance from the fleet table below to inspect live CloudWatch metrics.
        </span>
      </div>
    );
  }

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const cpuVal =
    metrics?.cpu?.value !== undefined && metrics.cpu.value !== null
      ? Number(metrics.cpu.value.toFixed(1))
      : null;
  const memVal =
    metrics?.memory?.value !== undefined && metrics.memory.value !== null
      ? Number(metrics.memory.value.toFixed(1))
      : null;
  const diskVal =
    metrics?.disk?.value !== undefined && metrics.disk.value !== null
      ? Number(metrics.disk.value.toFixed(1))
      : null;

  const getStatus = (val) => {
    if (val === null) return { text: 'text-zinc-500', bar: 'bg-zinc-700', badge: 'No Data', badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    if (val >= 85) return { text: 'text-rose-400', bar: 'bg-rose-500', badge: 'Critical', badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    if (val >= 70) return { text: 'text-amber-400', bar: 'bg-amber-500', badge: 'Elevated', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    return { text: 'text-emerald-400', bar: 'bg-emerald-500', badge: 'Normal', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  };

  const cpuStatus = getStatus(cpuVal);
  const memStatus = getStatus(memVal);
  const diskStatus = getStatus(diskVal);

  const sshIp = instance.publicIp || instance.privateIp || '<ip>';
  const sshCmd = `ssh ec2-user@${sshIp}`;
  const isRunning = instance.state?.toLowerCase() === 'running';

  const formatAge = (ageSeconds) => {
    if (ageSeconds === undefined || ageSeconds === null) return null;
    if (ageSeconds < 60) return `${ageSeconds}s lag`;
    return `${Math.round(ageSeconds / 60)}m lag`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5 min-w-0 overflow-hidden">
      {/* Node Header & SSH snippet */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-base text-zinc-100">
              {instance.name || 'EC2 Instance'}
            </span>
            <span className="font-mono text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
              {instance.instanceId}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {instance.state}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700/60">
              {instance.instanceType}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              {instance.availabilityZone || 'ap-south-1'}
            </span>
            {instance.privateIp && (
              <span>
                Private IP: <span className="font-mono text-zinc-300">{instance.privateIp}</span>
              </span>
            )}
            {instance.publicIp && (
              <span>
                Public IP: <span className="font-mono text-zinc-300">{instance.publicIp}</span>
              </span>
            )}
          </div>
        </div>

        {/* SSH Connect Snippet */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-mono self-start lg:self-auto max-w-full">
          <Terminal className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <span className="text-zinc-300 truncate">{sshCmd}</span>
          <button
            onClick={() => copy(sshCmd, 'ssh')}
            className="text-zinc-400 hover:text-zinc-200 p-1 flex-shrink-0 transition"
            title="Copy SSH command"
          >
            {copiedKey === 'ssh' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 3 Metric Cards with Freshness Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <Cpu className="w-4 h-4 text-sky-400" />
                CPU Utilization
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cpuStatus.badgeColor}`}>
                {cpuStatus.badge}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className={`text-3xl font-bold font-mono tracking-tight ${cpuStatus.text}`}>
                {cpuVal !== null ? `${cpuVal}%` : '—'}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">AWS/EC2</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${cpuStatus.bar}`}
                style={{ width: `${Math.min(cpuVal || 0, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Avg 60s period</span>
              <span>
                {metrics?.cpu?.ageSeconds !== undefined
                  ? formatAge(metrics.cpu.ageSeconds)
                  : metrics?.cpu?.timestamp
                  ? new Date(metrics.cpu.timestamp).toLocaleTimeString()
                  : 'No metric data'}
              </span>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <Database className="w-4 h-4 text-emerald-400" />
                Memory Used
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${memStatus.badgeColor}`}>
                {memStatus.badge}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className={`text-3xl font-bold font-mono tracking-tight ${memStatus.text}`}>
                {memVal !== null ? `${memVal}%` : '—'}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">mem_used</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${memStatus.bar}`}
                style={{ width: `${Math.min(memVal || 0, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>CloudPulse agent</span>
              <span>
                {metrics?.memory?.ageSeconds !== undefined
                  ? formatAge(metrics.memory.ageSeconds)
                  : metrics?.memory?.timestamp
                  ? new Date(metrics.memory.timestamp).toLocaleTimeString()
                  : 'No metric data'}
              </span>
            </div>
          </div>
        </div>

        {/* Disk */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <HardDrive className="w-4 h-4 text-amber-400" />
                Disk Used (/)
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${diskStatus.badgeColor}`}>
                {diskStatus.badge}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className={`text-3xl font-bold font-mono tracking-tight ${diskStatus.text}`}>
                {diskVal !== null ? `${diskVal}%` : '—'}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">nvme0n1p1</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${diskStatus.bar}`}
                style={{ width: `${Math.min(diskVal || 0, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Partition / (ext4)</span>
              <span>
                {metrics?.disk?.ageSeconds !== undefined
                  ? formatAge(metrics.disk.ageSeconds)
                  : metrics?.disk?.timestamp
                  ? new Date(metrics.disk.timestamp).toLocaleTimeString()
                  : 'No metric data'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CloudWatch Agent notice if memory or disk are null */}
      {(memVal === null || diskVal === null) && (
        <div className="flex items-start gap-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-400 leading-relaxed">
          <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-zinc-200 font-medium">CloudWatch Agent Telemetry: </span>
            Memory and Disk metrics require the Amazon CloudWatch Agent active on host reporting to the <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">CloudPulse</code> namespace. If empty, ensure the agent daemon is publishing metrics for host <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">CLOUDWATCH_HOST</code>.
          </div>
        </div>
      )}

      {/* Time-Series Chart */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">
              Live CloudWatch Telemetry Progression
            </h4>
            <span className="text-[11px] text-zinc-500">
              Continuous telemetry trend
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="text-zinc-400">CPU %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">RAM %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-zinc-400">Disk %</span>
            </div>
          </div>
        </div>

        <div className="h-52 w-full min-w-0">
          {metricsHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">
              Waiting for initial CloudWatch data broadcast...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f4f4f5',
                    fontFamily: 'monospace',
                  }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={1.5} fill="#38bdf8" fillOpacity={0.12} name="CPU %" />
                <Area type="monotone" dataKey="memory" stroke="#34d399" strokeWidth={1.5} fill="#34d399" fillOpacity={0.12} name="RAM %" />
                <Area type="monotone" dataKey="disk" stroke="#fbbf24" strokeWidth={1.5} fill="#fbbf24" fillOpacity={0.12} name="Disk %" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
