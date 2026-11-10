import React from 'react';
import { Compass, Users, PhoneCall, Mail, Radio, CheckCircle2, Loader2 } from 'lucide-react';

export default function ProgressCard({
  phase,
  progressPct,
  discoveredCount,
  extractedCount,
  phoneCount,
  emailCount,
  statusMessage,
  currentPlaceName,
  targetGoal,
  isCompleted,
  isStopped,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-8">
      {/* 2-Step Sequential Stepper */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Step 1 Pill */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              phase === 1
                ? 'bg-blue-50 text-blue-700 border border-blue-300 ring-2 ring-blue-500/20'
                : phase > 1
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              1
            </span>
            <span>Discover Target Places</span>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                phase === 1
                  ? 'bg-blue-600 text-white animate-pulse'
                  : phase > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {phase === 1 ? 'Scanning' : phase > 1 ? `Done (${discoveredCount})` : 'Pending'}
            </span>
          </div>

          <div className="hidden sm:block text-slate-300 font-bold">&rarr;</div>

          {/* Step 2 Pill */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              phase === 2
                ? 'bg-blue-50 text-blue-700 border border-blue-300 ring-2 ring-blue-500/20'
                : isCompleted || isStopped
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              2
            </span>
            <span>Extract Contact Records</span>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                phase === 2
                  ? 'bg-blue-600 text-white animate-pulse'
                  : isCompleted || isStopped
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {phase === 2 ? 'Extracting' : isCompleted || isStopped ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-blue-600 tracking-tight">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCompleted
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
          style={{ width: `${Math.max(2, Math.min(100, progressPct))}%` }}
        />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            Discovered
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
            {discoveredCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Places queued</p>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Extracted
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-800 tracking-tight">
            {extractedCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-blue-600/80 mt-0.5">
            Goal: {targetGoal.toLocaleString()}
          </p>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <PhoneCall className="w-4 h-4" />
            Phones / WA
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
            {phoneCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Contact numbers</p>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/70 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            Emails Found
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">
            {emailCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-purple-600/80 mt-0.5">Crawled async</p>
        </div>
      </div>

      {/* Live Status Banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
        <Radio className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
        <span className="truncate">
          {statusMessage || (currentPlaceName ? `Extracting: ${currentPlaceName}` : 'Stealth crawler ready.')}
        </span>
      </div>
    </div>
  );
}

