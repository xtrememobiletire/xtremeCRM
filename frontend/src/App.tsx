import { useEffect, useState } from 'react';
import axios from 'axios';

interface BackendResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  const [data, setData] = useState<BackendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHello = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<BackendResponse>(`${BACKEND_URL}/api/hello`, {
        withCredentials: true,
      });
      setData(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.message || 'Failed to connect to backend');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHello();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header with Xtreme Red brand */}
        <div className="bg-red-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🚗💨</span>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase">XtremeCRM</h1>
              <p className="text-xs text-red-100 font-medium">Roadside & Mobile Tire Dispatch</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-700 text-white border border-red-500">
            Tailwind v4 + Vite
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Backend Connection
              </span>
              <span className="text-xs font-mono text-slate-400">{BACKEND_URL}/api/hello</span>
            </div>

            {loading && (
              <div className="flex items-center space-x-2 text-sm text-slate-500 py-3">
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Pinging Express backend...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-start space-x-2">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold">Connection Error</p>
                  <p className="text-xs mt-0.5">{error}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ensure backend is running on <code className="bg-white px-1 rounded border">{BACKEND_URL}</code>
                  </p>
                </div>
              </div>
            )}

            {data && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="font-bold text-sm">{data.message}</p>
                </div>
                <p className="text-xs text-emerald-700/80 font-mono">
                  Timestamp: {new Date(data.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={fetchHello}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors duration-150 cursor-pointer"
            >
              {loading ? 'Fetching...' : '🔄 Re-test Backend Connection'}
            </button>

            <span className="text-xs text-slate-400 font-mono">React 19 + Axios</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-500">
          XtremeCRM Architecture — Canada (CAD) • USA (USD) • UK (GBP)
        </div>
      </div>
    </div>
  );
}
