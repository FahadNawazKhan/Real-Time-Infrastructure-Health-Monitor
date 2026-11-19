import React from 'react';
import { Server, Activity, ShieldAlert, HeartPulse } from 'lucide-react';

export default function MetricsBar({ instances = [], alarms = [], health }) {
  const total = instances.length;
  const running = instances.filter(
    (i) => i.state?.toLowerCase() === 'running'
  ).length;

  const inAlarm = alarms.filter((a) => a.state === 'ALARM').length;
  const okAlarms = alarms.filter((a) => a.state === 'OK').length;

  const score = health?.score ?? 100;
  const status = health?.status ?? 'healthy';

  const getHealthTheme = () => {
    if (status === 'critical') return { text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', icon: 'text-rose-400' };
    if (status === 'warning') return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: 'text-amber-400' };
    if (status === 'degraded') return { text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: 'text-orange-400' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: 'text-emerald-400' };
  };

  const healthTheme = getHealthTheme();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Health Evaluation Score */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-zinc-400 text-xs font-medium block">
            Health Evaluation
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold font-mono ${healthTheme.text}`}>
              {score}/100
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${healthTheme.text}`}>
              {status}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5 block truncate max-w-[200px]" title={health?.summary}>
            {health?.summary || 'System evaluation active'}
          </span>
        </div>
        <div className={`w-10 h-10 rounded-md border flex items-center justify-center ${healthTheme.bg}`}>
          <HeartPulse className={`w-5 h-5 ${healthTheme.icon}`} />
        </div>
      </div>

      {/* 2. Total Compute Instances */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-zinc-400 text-xs font-medium block">
            EC2 Discovered
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
            {total}
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            Discovered in ap-south-1
          </span>
        </div>
        <div className="w-10 h-10 rounded-md bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
          <Server className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Running Fleet Capacity */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-zinc-400 text-xs font-medium block">
            Running Fleet
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {running}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              / {total} running
            </span>
          </div>
          <span className="text-[11px] text-emerald-500 font-medium mt-0.5 block">
            {total > 0 ? Math.round((running / total) * 100) : 0}% fleet operational
          </span>
        </div>
        <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Active Alarms */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-zinc-400 text-xs font-medium block">
            CloudWatch Alarms
          </span>
          <div className="text-2xl font-bold font-mono mt-1">
            {inAlarm > 0 ? (
              <span className="text-rose-400">{inAlarm} Triggered</span>
            ) : (
              <span className="text-zinc-200">0 Triggered</span>
            )}
          </div>
          <span className={`text-[11px] mt-0.5 block ${inAlarm > 0 ? 'text-rose-400 font-semibold' : 'text-zinc-500'}`}>
            {inAlarm > 0 ? 'Breaching thresholds' : `${alarms.length} rules monitored (All OK)`}
          </span>
        </div>
        <div className={`w-10 h-10 rounded-md border flex items-center justify-center ${
          inAlarm > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400'
        }`}>
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
