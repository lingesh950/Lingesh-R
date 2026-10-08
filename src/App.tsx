/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  Server,
  Database,
  ExternalLink,
  RefreshCw,
  Send,
  Sliders,
  Code,
  MapPin,
  Flame,
  Activity,
  LogOut,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface CurrentUser {
  id: number;
  student_id: string;
  name: string;
  role: 'student' | 'admin';
}

interface AlertItem {
  id: number;
  user_id: number;
  student_id?: string;
  reporter_name?: string;
  emergency_type: string;
  message: string;
  latitude: number | null;
  longitude: number | null;
  priority: string;
  recommended_response: string;
  status: 'Pending' | 'Responding' | 'Resolved';
  created_at: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'api-tester' | 'alerts-stream' | 'code'>('console');
  
  // Login form state
  const [loginId, setLoginId] = useState('admin');
  const [loginPw, setLoginPw] = useState('admin123');
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // New Alert state
  const [alertType, setAlertType] = useState('Medical Emergency');
  const [alertMsg, setAlertMsg] = useState('Student collapsed near library quad, difficulty breathing');
  const [alertLat, setAlertLat] = useState('13.0827');
  const [alertLng, setAlertLng] = useState('80.2707');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Alerts data
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // API Tester state
  const [testEndpoint, setTestEndpoint] = useState('POST /api/alerts');
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        emergency_type: 'Fire / Explosion',
        message: 'Smoke detector triggered in Chemistry Wing Lab B2',
        latitude: 13.0831,
        longitude: 80.2712,
      },
      null,
      2
    )
  );
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);

  // Check current session on mount
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentUser(json.data);
          loadAlerts(json.data.role);
          return;
        }
      }
      setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    }
  };

  const handleLogin = async (idToUse?: string, pwToUse?: string) => {
    setAuthLoading(true);
    setAuthMessage(null);
    const sid = idToUse || loginId;
    const pwd = pwToUse || loginPw;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: sid, password: pwd }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentUser(data.data);
        setAuthMessage({ type: 'success', text: `Signed in as ${data.data.name} (${data.data.role.toUpperCase()})` });
        loadAlerts(data.data.role);
      } else {
        setAuthMessage({ type: 'error', text: data.message || 'Login failed.' });
      }
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: 'Network error connecting to Flask backend.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      setCurrentUser(null);
      setAlerts([]);
      setAuthMessage({ type: 'info', text: 'Logged out successfully.' });
    }
  };

  const loadAlerts = async (role?: string) => {
    setAlertsLoading(true);
    try {
      const isUserAdmin = role === 'admin' || currentUser?.role === 'admin';
      const endpoint = isUserAdmin ? '/api/alerts' : '/api/alerts/mine';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAlerts(data.data || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAlertsLoading(false);
    }
  };

  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in first to broadcast an alert.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergency_type: alertType,
          message: alertMsg,
          latitude: alertLat ? parseFloat(alertLat) : null,
          longitude: alertLng ? parseFloat(alertLng) : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthMessage({
          type: 'success',
          text: `Alert #${data.data.id} dispatched! AI Priority: ${data.data.priority} (${data.data.recommended_response})`,
        });
        loadAlerts(currentUser.role);
      } else {
        setAuthMessage({ type: 'error', text: data.message || 'Failed to submit alert' });
      }
    } catch {
      setAuthMessage({ type: 'error', text: 'Error connecting to alert dispatch endpoint.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (alertId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadAlerts(currentUser?.role);
        setAuthMessage({ type: 'success', text: `Alert #${alertId} updated to ${newStatus}` });
      } else {
        setAuthMessage({ type: 'error', text: data.message || 'Failed to update status' });
      }
    } catch {
      setAuthMessage({ type: 'error', text: 'Error updating alert status.' });
    }
  };

  const executeApiTest = async () => {
    const [method, path] = testEndpoint.split(' ');
    setApiResponse('Sending request...');
    setApiStatus(null);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method !== 'GET') {
        options.body = testPayload;
      }
      const res = await fetch(path, options);
      const data = await res.json();
      setApiStatus(res.status);
      setApiResponse(data);
      if (path.includes('alerts')) {
        loadAlerts(currentUser?.role);
      }
    } catch (err: any) {
      setApiStatus(500);
      setApiResponse({ error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-600 rounded-lg text-white shadow-lg shadow-rose-900/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-wide text-white">SMART CAMPUS SAFETY</h1>
              <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                STEP 1 BACKEND
              </span>
            </div>
            <p className="text-xs text-slate-400">Python Flask 3 + SQLite3 + AI Priority Engine</p>
          </div>
        </div>

        {/* Backend Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-600/40 px-3 py-1.5 rounded-full text-xs text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Flask Backend Running (Port 5000)
          </div>

          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="text-slate-200 font-bold">{currentUser.name}</span>{' '}
                <span className="text-slate-400 font-mono">({currentUser.student_id})</span>
                <span
                  className={`ml-2 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                    currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 ml-2 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded border border-slate-700">
              Session: Guest / Unauthenticated
            </span>
          )}
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'console' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Incident Command & Portal
          </button>
          <button
            onClick={() => {
              setActiveTab('alerts-stream');
              if (currentUser) loadAlerts(currentUser.role);
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'alerts-stream' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Live Alerts Feed ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('api-tester')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'api-tester' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Interactive REST API Tester
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'code' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Backend Code Reference
          </button>
        </div>

        {/* Direct Flask Template Links */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Direct Flask Routes:</span>
          <a
            href="/student"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            /student <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/emergency"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            /emergency <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            /admin <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Auth notification */}
        {authMessage && (
          <div
            className={`p-3.5 rounded-lg border text-sm flex items-center justify-between ${
              authMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-600/50 text-emerald-300'
                : authMessage.type === 'error'
                ? 'bg-rose-950/70 border-rose-600/50 text-rose-300'
                : 'bg-blue-950/70 border-blue-600/50 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {authMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {authMessage.text}
            </div>
            <button onClick={() => setAuthMessage(null)} className="text-xs hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: Console / Interactive Portal */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column: Quick Authentication & Demo Seeds */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" /> Session Authentication
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">Flask Sessions</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Student ID / Admin Handle</label>
                    <input
                      type="text"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => handleLogin()}
                    disabled={authLoading}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Sign In via POST /api/login
                  </button>
                </div>

                {/* Seed Accounts quick-click */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="text-[11px] uppercase font-bold text-slate-400 mb-2">Pre-Seeded Demo Accounts:</div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        setLoginId('admin');
                        setLoginPw('admin123');
                        handleLogin('admin', 'admin123');
                      }}
                      className="text-left bg-slate-950 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-amber-400">👑 Admin (admin)</div>
                        <div className="text-[11px] text-slate-400 font-mono">Pass: admin123 • Full Dispatch Access</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        setLoginId('STU001');
                        setLoginPw('student123');
                        handleLogin('STU001', 'student123');
                      }}
                      className="text-left bg-slate-950 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-blue-400">🎓 Student 1: Arun (STU001)</div>
                        <div className="text-[11px] text-slate-400 font-mono">Pass: student123 • Can trigger SOS</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        setLoginId('STU002');
                        setLoginPw('student123');
                        handleLogin('STU002', 'student123');
                      }}
                      className="text-left bg-slate-950 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-blue-400">🎓 Student 2: Priya (STU002)</div>
                        <div className="text-[11px] text-slate-400 font-mono">Pass: student123 • Can trigger SOS</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RBAC Info Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs space-y-2">
                <div className="font-bold text-slate-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Role-Based Access Enforcement
                </div>
                <p className="text-slate-400 leading-relaxed">
                  • <code className="text-rose-400">@admin_required</code>: Students cannot access{' '}
                  <code className="text-slate-300">GET /api/alerts</code> or status transitions.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • <code className="text-emerald-400">@student_required</code>: Access granted to student portal and
                  user-specific alerts.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • Status transitions enforce lifecycles: <code className="text-slate-300">Pending</code> &rarr;{' '}
                  <code className="text-slate-300">Responding</code> &rarr;{' '}
                  <code className="text-slate-300">Resolved</code>. Resolved alerts cannot revert to Pending.
                </p>
              </div>
            </div>

            {/* Right column: Emergency Dispatch Trigger & Quick Feed */}
            <div className="lg:col-span-8 space-y-6">
              {/* Emergency Beacon Form */}
              <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/40 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-rose-500 animate-pulse" /> Trigger Real-time Emergency Beacon
                    </h2>
                    <p className="text-xs text-rose-300/80">
                      Dispatches incident with AI triage evaluation (POST /api/alerts)
                    </p>
                  </div>
                  <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full font-bold">
                    🚨 SOS DISPATCH
                  </span>
                </div>

                <form onSubmit={submitAlert} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-semibold block mb-1.5">Emergency Type *</label>
                      <select
                        value={alertType}
                        onChange={(e) => setAlertType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                      >
                        <option value="Medical Emergency">🚑 Medical Emergency</option>
                        <option value="Fire / Explosion">🔥 Fire / Explosion</option>
                        <option value="Physical Assault / Threat">⚔️ Physical Assault / Threat</option>
                        <option value="Harassment / Stalking">⚠️ Harassment / Stalking</option>
                        <option value="Mental Health Crisis">🧠 Mental Health Crisis</option>
                        <option value="Facility Hazard">⚠️ Facility Hazard</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-300 font-semibold block mb-1.5">Latitude</label>
                        <input
                          type="text"
                          value={alertLat}
                          onChange={(e) => setAlertLat(e.target.value)}
                          placeholder="13.0827"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-semibold block mb-1.5">Longitude</label>
                        <input
                          type="text"
                          value={alertLng}
                          onChange={(e) => setAlertLng(e.target.value)}
                          placeholder="80.2707"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                      Incident Description / Location Details (Optional)
                    </label>
                    <textarea
                      value={alertMsg}
                      onChange={(e) => setAlertMsg(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. 2nd floor chemistry lab, thick smoke, emergency evacuation in progress"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      GPS coordinates will be linked to report.
                    </div>
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-6 py-2.5 rounded-lg text-sm shadow-lg shadow-rose-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Radio className="w-4 h-4" />
                      )}
                      TRANSMIT SOS ALERT
                    </button>
                  </div>
                </form>
              </div>

              {/* Active alerts snippet table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-bold text-slate-200">
                      Active Incidents Queue ({alerts.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => loadAlerts(currentUser?.role)}
                    disabled={alertsLoading}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    No active emergency alerts recorded. Trigger an alert above to test the system.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono">
                          <th className="pb-2">#ID</th>
                          <th className="pb-2">TYPE</th>
                          <th className="pb-2">PRIORITY</th>
                          <th className="pb-2">REPORTER</th>
                          <th className="pb-2">AI RECOMMENDED ACTION</th>
                          <th className="pb-2">STATUS</th>
                          <th className="pb-2 text-right">DISPATCH CONTROL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {alerts.slice(0, 5).map((a) => (
                          <tr key={a.id} className="hover:bg-slate-800/30">
                            <td className="py-2.5 font-mono font-bold text-slate-300">#{a.id}</td>
                            <td className="py-2.5 font-semibold text-slate-200">{a.emergency_type}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  a.priority === 'Critical'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                    : a.priority === 'High'
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                }`}
                              >
                                {a.priority}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-400">
                              {a.reporter_name || 'Student'} ({a.student_id || `User ${a.user_id}`})
                            </td>
                            <td className="py-2.5 text-slate-300 text-[11px] max-w-xs truncate">
                              {a.recommended_response}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  a.status === 'Resolved'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : a.status === 'Responding'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {a.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right space-x-1">
                              {currentUser?.role === 'admin' ? (
                                <>
                                  {a.status === 'Pending' && (
                                    <button
                                      onClick={() => handleUpdateStatus(a.id, 'Responding')}
                                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold"
                                    >
                                      Dispatch
                                    </button>
                                  )}
                                  {a.status !== 'Resolved' && (
                                    <button
                                      onClick={() => handleUpdateStatus(a.id, 'Resolved')}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold"
                                    >
                                      Resolve
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-500">View only</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Live Alerts Feed */}
        {activeTab === 'alerts-stream' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-500" /> Full Campus Incident Stream
                </h2>
                <p className="text-xs text-slate-400">
                  {currentUser?.role === 'admin'
                    ? 'Administrator Access: Showing all alerts across all students'
                    : 'Student Access: Showing alerts reported by your account'}
                </p>
              </div>
              <button
                onClick={() => loadAlerts(currentUser?.role)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Stream
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3">ALERT #</th>
                    <th className="pb-3">REPORTER</th>
                    <th className="pb-3">EMERGENCY TYPE</th>
                    <th className="pb-3">PRIORITY</th>
                    <th className="pb-3">DETAILS</th>
                    <th className="pb-3">GPS LOCATION</th>
                    <th className="pb-3">RECOMMENDED DISPATCH PROTOCOL</th>
                    <th className="pb-3">STATUS</th>
                    <th className="pb-3">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-mono font-bold text-rose-400">#{alert.id}</td>
                      <td className="py-3 text-slate-200 font-semibold">
                        {alert.reporter_name || 'Student'}
                        <div className="text-[10px] font-mono text-slate-400">{alert.student_id || ''}</div>
                      </td>
                      <td className="py-3 font-semibold text-slate-100">{alert.emergency_type}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            alert.priority === 'Critical'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : alert.priority === 'High'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {alert.priority}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 max-w-xs">{alert.message || '—'}</td>
                      <td className="py-3 font-mono text-[11px] text-slate-400">
                        {alert.latitude && alert.longitude
                          ? `📍 ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`
                          : 'None'}
                      </td>
                      <td className="py-3 text-slate-300 text-[11px] max-w-xs">{alert.recommended_response}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            alert.status === 'Resolved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : alert.status === 'Responding'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[10px]">{alert.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Interactive REST API Tester */}
        {activeTab === 'api-tester' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" /> API Request Console
              </h2>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Select Endpoint</label>
                <select
                  value={testEndpoint}
                  onChange={(e) => {
                    setTestEndpoint(e.target.value);
                    if (e.target.value === 'POST /api/register') {
                      setTestPayload(
                        JSON.stringify(
                          { student_id: 'STU004', name: 'Dev Tester', password: 'password123' },
                          null,
                          2
                        )
                      );
                    } else if (e.target.value === 'POST /api/login') {
                      setTestPayload(JSON.stringify({ student_id: 'STU001', password: 'student123' }, null, 2));
                    } else if (e.target.value.includes('/status')) {
                      setTestPayload(JSON.stringify({ status: 'Responding' }, null, 2));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                >
                  <option value="POST /api/login">POST /api/login</option>
                  <option value="POST /api/register">POST /api/register</option>
                  <option value="POST /api/logout">POST /api/logout</option>
                  <option value="GET /api/auth/me">GET /api/auth/me</option>
                  <option value="POST /api/alerts">POST /api/alerts</option>
                  <option value="GET /api/alerts/mine">GET /api/alerts/mine</option>
                  <option value="GET /api/alerts">GET /api/alerts (Admin only)</option>
                  <option value="PATCH /api/alerts/1/status">PATCH /api/alerts/1/status (Admin only)</option>
                </select>
              </div>

              {!testEndpoint.startsWith('GET') && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">JSON Request Body</label>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <button
                onClick={executeApiTest}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/30"
              >
                <Send className="w-4 h-4" /> Send Request
              </button>
            </div>

            {/* Response Viewer */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" /> HTTP Response
                </h2>
                {apiStatus && (
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                      apiStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    HTTP {apiStatus}
                  </span>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 h-[320px] overflow-auto">
                <pre className="text-xs font-mono text-slate-200">
                  {apiResponse ? JSON.stringify(apiResponse, null, 2) : '// Response will appear here after clicking "Send Request"'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Code & Architecture Viewer */}
        {activeTab === 'code' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" /> Project File Tree & Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Full implementation located in <code className="text-rose-400 font-mono">smart-campus-safety/</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" /> SQLite Database Structure
                </div>
                <div className="font-mono text-slate-400 space-y-1">
                  <div>• users (id, student_id, name, password_hash, role, created_at)</div>
                  <div>• alerts (id, user_id, emergency_type, message, latitude, longitude, priority, recommended_response, status, created_at)</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" /> Run Locally
                </div>
                <div className="font-mono text-slate-400 space-y-1">
                  <div className="text-emerald-400">cd smart-campus-safety</div>
                  <div className="text-emerald-400">pip install -r requirements.txt</div>
                  <div className="text-emerald-400">python app.py</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
