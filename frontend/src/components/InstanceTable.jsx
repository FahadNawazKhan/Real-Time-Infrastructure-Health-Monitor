import React, { useState } from 'react';
import { Search, Copy, Check, Server, RefreshCw } from 'lucide-react';

export default function InstanceTable({
  instances = [],
  selectedInstance,
  onSelectInstance,
}) {
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const copy = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = instances.filter((inst) => {
    const matchesSearch =
      inst.name?.toLowerCase().includes(search.toLowerCase()) ||
      inst.instanceId?.toLowerCase().includes(search.toLowerCase()) ||
      inst.publicIp?.includes(search) ||
      inst.privateIp?.includes(search);

    const matchesState =
      filterState === 'ALL' ||
      inst.state?.toUpperCase() === filterState.toUpperCase();

    return matchesSearch && matchesState;
  });

  const runningCount = instances.filter(
    (i) => i.state?.toLowerCase() === 'running'
  ).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col min-w-0 overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Server className="w-4 h-4 text-zinc-400" />
          <h3 className="font-semibold text-sm text-zinc-100">
            EC2 Instance Fleet
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-xs border border-zinc-700/60">
            {filtered.length} of {instances.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, ID, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-48 sm:w-56"
            />
          </div>

          {/* State Tabs */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5 text-xs">
            <button
              onClick={() => setFilterState('ALL')}
              className={`px-2.5 py-1 rounded transition text-xs ${
                filterState === 'ALL'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({instances.length})
            </button>
            <button
              onClick={() => setFilterState('RUNNING')}
              className={`px-2.5 py-1 rounded transition text-xs ${
                filterState === 'RUNNING'
                  ? 'bg-zinc-800 text-emerald-400 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Running ({runningCount})
            </button>
            <button
              onClick={() => setFilterState('STOPPED')}
              className={`px-2.5 py-1 rounded transition text-xs ${
                filterState === 'STOPPED'
                  ? 'bg-zinc-800 text-rose-400 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Stopped
            </button>
          </div>
        </div>
      </div>

      {/* Table with guaranteed minimum width & smooth scrolling */}
      <div className="overflow-x-auto min-w-0">
        <table className="w-full text-left border-collapse text-xs min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-medium text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">State</th>
              <th className="py-3 px-4 font-medium">Instance Name</th>
              <th className="py-3 px-4 font-medium">Instance ID</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Private IP</th>
              <th className="py-3 px-4 font-medium">Public IP</th>
              <th className="py-3 px-4 font-medium">Zone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-normal">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-zinc-500 text-xs"
                >
                  No instances found matching current filters.
                </td>
              </tr>
            ) : (
              filtered.map((inst) => {
                const isSelected =
                  selectedInstance?.instanceId === inst.instanceId;
                const isRunning = inst.state?.toLowerCase() === 'running';

                return (
                  <tr
                    key={inst.instanceId}
                    onClick={() => onSelectInstance(inst)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-950/30 text-zinc-100 font-medium border-l-2 border-l-sky-500'
                        : 'hover:bg-zinc-800/40 text-zinc-300'
                    }`}
                  >
                    {/* State */}
                    <td className="py-3 px-4 whitespace-nowrap">
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
                        {inst.state}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-semibold text-zinc-100 whitespace-nowrap">
                      {inst.name || '—'}
                    </td>

                    {/* Instance ID */}
                    <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{inst.instanceId}</span>
                        <button
                          onClick={(e) => copy(inst.instanceId, e)}
                          className="text-zinc-500 hover:text-zinc-200 p-0.5 transition"
                          title="Copy ID"
                        >
                          {copiedId === inst.instanceId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                      <span className="bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60 text-[11px]">
                        {inst.instanceType || '—'}
                      </span>
                    </td>

                    {/* Private IP */}
                    <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap">
                      {inst.privateIp || '—'}
                    </td>

                    {/* Public IP */}
                    <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap">
                      {inst.publicIp || '—'}
                    </td>

                    {/* Availability Zone */}
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {inst.availabilityZone || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
