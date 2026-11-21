import React, { useState, useEffect } from 'react';
import { RefreshCw, Radio, MapPin } from 'lucide-react';

export default function Navbar({
  isSocketConnected,
  region = 'ap-south-1',
  freshness,
  isRefreshing,
  onRefresh,
}) {
  // Live ticking counter for seconds since last data collection
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!freshness?.collectedAt) return;

    const updateAge = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - new Date(freshness.collectedAt).getTime()) / 1000)
      );
      setSecondsAgo(diff);
    };

    updateAge();
    const interval = setInterval(updateAge, 1000);
    return () => clearInterval(interval);
  }, [freshness?.collectedAt]);

  const isFresh = secondsAgo <= 20;

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-4 sm:px-8 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm text-zinc-100 tracking-tight block leading-tight">
          CloudPulse
        </span>

        <span className="text-zinc-700 hidden sm:inline">&bull;</span>

        {/* AWS Region Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700/80">
          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
          <span>{region}</span>
        </div>

        {/* Live Socket.IO Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/80 text-zinc-200 border border-zinc-700/80">
          <Radio
            className={`w-3.5 h-3.5 ${
              isSocketConnected
                ? 'text-emerald-400 animate-pulse'
                : 'text-rose-500'
            }`}
          />
          <span className="text-[11px] font-medium">
            {isSocketConnected ? 'WebSocket Live' : 'WebSocket Disconnected'}
          </span>
        </div>
      </div>

      {/* Controls & Freshness Indicators */}
      <div className="flex items-center gap-3">
        {/* Metric Freshness Badge */}
        {freshness?.collectedAt && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${
              isFresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isFresh ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span>
              Freshness: {secondsAgo}s ago {isFresh ? '(Live)' : '(Lag)'}
            </span>
          </div>
        )}


        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium px-3 py-1.5 rounded transition disabled:opacity-50 text-xs shadow-sm"
          title="Force telemetry collection cycle"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
          />
          <span>Sync Now</span>
        </button>
      </div>
    </header>
  );
}
