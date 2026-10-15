import React, { useEffect, useState } from 'react';
import { RotateCcw, Server, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { checkBackendHealth, API_CONFIG, type BackendStatusState } from '../../services/api';

export const DemoBanner: React.FC = () => {
  const { resetDemoData } = useApp();

  const [backendStatus, setBackendStatus] = useState<BackendStatusState>({
    isOnline: false,
    isLoading: true,
  });
  const [showDiagModal, setShowDiagModal] = useState(false);

  const fetchHealth = async () => {
    setBackendStatus((prev) => ({ ...prev, isLoading: true }));
    const result = await checkBackendHealth();
    setBackendStatus({
      isOnline: result.isOnline,
      isLoading: false,
      data: result.data,
      error: result.error,
      lastChecked: new Date().toLocaleTimeString(),
    });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <>
      <div className="bg-gradient-to-r from-findit-primary/15 via-findit-card to-findit-secondary/15 border-b border-findit-border/80 px-4 py-2 text-xs text-findit-muted">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Milestone Badge & Overview */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-findit-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-findit-secondary"></span>
            </span>
            <span className="font-semibold text-findit-text">FindIt Architecture:</span>
            <span className="hidden md:inline">
              FastAPI backend, persistent database storage, and claim recovery active.
            </span>
          </div>

          {/* Right Controls: Backend Connectivity Chip + Reset Button */}
          <div className="flex items-center gap-2">
            {/* Backend Connectivity Status Chip */}
            <button
              type="button"
              onClick={() => setShowDiagModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-findit-bg/90 hover:bg-findit-bg border border-findit-border text-[11px] font-medium transition-all"
              title="Click to view backend and database connection diagnostics"
            >
              <Server className="w-3 h-3 text-findit-secondary" />
              <span>Backend:</span>

              {backendStatus.isLoading ? (
                <span className="text-findit-subtle flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Checking...
                </span>
              ) : backendStatus.isOnline ? (
                backendStatus.data?.database_status === 'connected' ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online (DB Connected)
                  </span>
                ) : (
                  <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Online (In-Memory Dev Mode)
                  </span>
                )
              ) : (
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Offline (Local Fallback)
                </span>
              )}
            </button>

            {/* Reset Demo Data button */}
            <button
              onClick={resetDemoData}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-findit-bg/80 hover:bg-findit-bg border border-findit-border/80 text-findit-muted hover:text-findit-text transition-colors text-[11px]"
              title="Reset sample records back to initial mock state"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backend Diagnostics Modal */}
      {showDiagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-findit-card border border-findit-border shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-findit-primary/20 text-findit-primary">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Backend Diagnostic Status</h3>
                  <p className="text-xs text-findit-muted">FastAPI + PostgreSQL Connectivity Monitor</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiagModal(false)}
                className="text-findit-muted hover:text-white p-1 rounded-lg hover:bg-findit-bg"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-findit-subtle">Target Base URL:</span>
                  <span className="font-mono text-findit-text">{API_CONFIG.BASE_URL}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-findit-subtle">Endpoint Queried:</span>
                  <span className="font-mono text-findit-primary">{API_CONFIG.BASE_URL}/health</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-findit-subtle">Last Checked:</span>
                  <span className="text-findit-text">{backendStatus.lastChecked || 'Just now'}</span>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-findit-muted">FastAPI Service:</span>
                  {backendStatus.isOnline ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Online ({backendStatus.data?.app_name} v{backendStatus.data?.version})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-slate-400" />
                      Offline / Not Running
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-findit-muted">Storage Layer:</span>
                  {backendStatus.data?.database_status === 'connected' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      PostgreSQL Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      In-Memory Dev Mode (DB Deferred)
                    </span>
                  )}
                </div>

                {backendStatus.data?.database_detail && (
                  <div className="text-[11px] text-findit-subtle font-mono p-2 rounded bg-black/40 border border-white/5 break-words">
                    {backendStatus.data.database_detail}
                  </div>
                )}

                {backendStatus.error && !backendStatus.isOnline && (
                  <div className="text-[11px] text-amber-300/90 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    {backendStatus.error}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-findit-muted space-y-1">
                <p className="font-semibold text-white">How to start the FastAPI backend:</p>
                <code className="block p-2 rounded bg-findit-bg border border-findit-border text-findit-secondary font-mono">
                  python -m uvicorn app.main:app --reload --port 8000
                </code>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-findit-border">
              <button
                type="button"
                onClick={fetchHealth}
                disabled={backendStatus.isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-findit-primary hover:bg-findit-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${backendStatus.isLoading ? 'animate-spin' : ''}`} />
                <span>Retest Connection</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDiagModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-findit-card border border-findit-border text-findit-muted hover:text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
