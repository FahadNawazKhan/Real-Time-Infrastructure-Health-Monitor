import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

export default function AlarmsTable({ alarms = [] }) {
  const [filterState, setFilterState] = useState('ALL');

  const filtered = alarms.filter((a) => {
    if (filterState === 'ALL') return true;
    return a.state === filterState;
  });

  const inAlarmCount = alarms.filter((a) => a.state === 'ALARM').length;
  const okCount = alarms.filter((a) => a.state === 'OK').length;

  const formatOperator = (op) => {
    switch (op) {
      case 'GreaterThanOrEqualToThreshold':
        return '>=';
      case 'GreaterThanThreshold':
        return '>';
      case 'LessThanOrEqualToThreshold':
        return '<=';
      case 'LessThanThreshold':
        return '<';
      default:
        return op;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col min-w-0 overflow-hidden text-xs">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-zinc-400" />
          <h3 className="font-semibold text-sm text-zinc-100">
            CloudWatch Metric Alarms
          </h3>
          <span className="px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 font-mono text-xs border border-zinc-700/60">
            {alarms.length} Alarms Configured
          </span>
        </div>

        {/* State Filter Tabs */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-sm p-0.5 text-xs">
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-2.5 py-1 rounded-sm transition text-xs ${
              filterState === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({alarms.length})
          </button>
          <button
            onClick={() => setFilterState('ALARM')}
            className={`px-2.5 py-1 rounded-sm transition text-xs ${
              filterState === 'ALARM'
                ? 'bg-zinc-800 text-rose-300 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            In Alarm ({inAlarmCount})
          </button>
          <button
            onClick={() => setFilterState('OK')}
            className={`px-2.5 py-1 rounded-sm transition text-xs ${
              filterState === 'OK'
                ? 'bg-zinc-800 text-emerald-300 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            OK ({okCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-w-0">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-medium text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 font-medium w-32">State</th>
              <th className="py-3 px-4 font-medium w-48">Alarm Name</th>
              <th className="py-3 px-4 font-medium w-44">Metric</th>
              <th className="py-3 px-4 font-medium w-52">Condition</th>
              <th className="py-3 px-4 font-medium">State Reason</th>
              <th className="py-3 px-4 font-medium w-28">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-normal">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  {alarms.length === 0
                    ? 'No CloudWatch alarms configured in this region.'
                    : 'No alarms matching current filter.'}
                </td>
              </tr>
            ) : (
              filtered.map((alarm) => {
                const isAlarm = alarm.state === 'ALARM';
                const isOk = alarm.state === 'OK';

                return (
                  <tr key={alarm.name} className="hover:bg-zinc-800/30 transition-colors">
                    {/* State Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold uppercase tracking-wider border ${
                          isAlarm
                            ? 'bg-zinc-950 text-rose-400 border-rose-900/60'
                            : isOk
                            ? 'bg-zinc-950 text-emerald-400 border-emerald-900/60'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {isAlarm ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        ) : isOk ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5" />
                        )}
                        {alarm.state}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-medium text-zinc-200">
                      <div className="font-semibold text-zinc-100">{alarm.name}</div>
                      {alarm.description && (
                        <div className="text-[11px] text-zinc-400 font-normal mt-0.5 line-clamp-1">
                          {alarm.description}
                        </div>
                      )}
                    </td>

                    {/* Metric */}
                    <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap">
                      <div>{alarm.metricName}</div>
                      <span className="text-[10px] text-zinc-500 block font-sans">
                        {alarm.namespace}
                      </span>
                    </td>

                    {/* Condition */}
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      <div className="font-medium">
                        {formatOperator(alarm.comparisonOperator)} {alarm.threshold}
                      </div>
                      <span className="text-[10px] text-zinc-500 block font-sans mt-0.5">
                        {alarm.evaluationPeriods} period(s) of {alarm.period}s
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-zinc-400 text-xs">
                      <div className="max-w-md line-clamp-2" title={alarm.stateReason}>
                        {alarm.stateReason || '—'}
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="py-3 px-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                      {alarm.updatedAt
                        ? new Date(alarm.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
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
