import React from 'react';
import { Search, MapPin, Play, Square, Hash, Mail, Phone, Loader2 } from 'lucide-react';

const PRESETS = [20, 100, 500, 1000, 5000, 10000];

export default function SearchForm({
  keywords,
  setKeywords,
  cityState,
  setCityState,
  maxResults,
  setMaxResults,
  extractEmail,
  setExtractEmail,
  extractPhone,
  setExtractPhone,
  isRunning,
  onStart,
  onStop,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keywords.trim() || !cityState.trim()) {
      alert('Please provide both Search Keywords and City/State.');
      return;
    }
    onStart();
  };

  const formatPresetLabel = (n) => {
    return n >= 1000 ? `${n / 1000}k` : n.toString();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {/* Keywords */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Business Keywords
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Dentist, Real Estate, Gym"
                disabled={isRunning}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Niche, category, or service to target</p>
          </div>

          {/* City / State */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              City / State
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                placeholder="e.g. New York, NY or Mumbai"
                disabled={isRunning}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Locality, metropolitan area, or country</p>
          </div>

          {/* Leads Goal */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Target Leads (Max)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="5"
                max="10000"
                step="5"
                value={maxResults}
                onChange={(e) => setMaxResults(Math.min(10000, Math.max(1, parseInt(e.target.value) || 100)))}
                disabled={isRunning}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
              />
            </div>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxResults(preset)}
                  disabled={isRunning}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all ${
                    maxResults === preset
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {formatPresetLabel(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Email Option */}
          <div className="lg:col-span-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email
            </label>
            <select
              value={extractEmail ? 'yes' : 'no'}
              onChange={(e) => setExtractEmail(e.target.value === 'yes')}
              disabled={isRunning}
              className="w-full px-3 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
            >
              <option value="yes">Yes (Async)</option>
              <option value="no">No</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">Crawl site</p>
          </div>

          {/* Mobile Option */}
          <div className="lg:col-span-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Phone / WA
            </label>
            <select
              value={extractPhone ? 'yes' : 'no'}
              onChange={(e) => setExtractPhone(e.target.value === 'yes')}
              disabled={isRunning}
              className="w-full px-3 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">Phone &amp; WA</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <button
            type="submit"
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraper Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Start Fast Extraction
              </>
            )}
          </button>

          {isRunning && (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop &amp; Save CSV
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400">
            Powered by Playwright Stealth &bull; Multi-Sector Geo Grid
          </div>
        </div>
      </form>
    </div>
  );
}

