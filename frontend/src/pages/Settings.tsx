import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { healthApi } from '../lib/api';
import { KeyRound, ShieldCheck, User, LogOut, CheckCircle2, XCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface KeyStatus {
  name: string;
  service: string;
  status: 'Connected' | 'Missing';
  docsUrl: string;
}

export function Settings() {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await healthApi.check();
      setHealthStatus(data);
    } catch (err) {
      console.error('Failed to fetch health check:', err);
      toast.error('Failed to retrieve system health details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);


  const apiKeys: KeyStatus[] = [
    {
      name: 'GEMINI_API_KEY',
      service: 'Google Gemini API (Primary)',
      status: healthStatus?.checks?.api_keys?.GEMINI_API_KEY ? 'Connected' : 'Missing',
      docsUrl: 'https://ai.google.dev/gemini-api/docs',
    },
    {
      name: 'OLLAMA_BASE_URL',
      service: 'Local Ollama Instance (Fallback)',
      status: healthStatus?.checks?.api_keys?.OLLAMA_BASE_URL ? 'Connected' : 'Missing',
      docsUrl: 'https://ollama.com',
    },
    {
      name: 'SERPER_API_KEY',
      service: 'Serper Search API',
      status: healthStatus?.checks?.api_keys?.SERPER_API_KEY ? 'Connected' : 'Missing',
      docsUrl: 'https://serper.dev',
    },
    {
      name: 'HUNTER_API_KEY',
      service: 'Hunter.io Email Finder',
      status: healthStatus?.checks?.api_keys?.HUNTER_API_KEY ? 'Connected' : 'Missing',
      docsUrl: 'https://hunter.io',
    },
    {
      name: 'FAISS_INDEX_PATH',
      service: 'FAISS Local Vector DB',
      status: healthStatus?.checks?.api_keys?.FAISS_INDEX_PATH ? 'Connected' : 'Missing',
      docsUrl: 'https://github.com/facebookresearch/faiss',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" /> Settings
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Manage integrations, API keys, and enterprise account configurations
        </p>
      </div>

      {/* API Key Status Panel */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">API Key Status</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Active external integrations used by AgentSphere AI pipelines
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-white transition-colors duration-150 interactive-btn flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Status</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-surface rounded-md" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-text-muted text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Key Name</th>
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {apiKeys.map((key) => (
                  <tr key={key.name} className="hover:bg-surface/20 transition-colors duration-100">
                    <td className="py-3.5 font-mono font-medium text-white">{key.name}</td>
                    <td className="py-3.5 text-text-secondary">{key.service}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        {key.status === 'Connected' ? (
                          <>
                            <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                            <span className="text-success font-medium text-xs">Connected</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4.5 w-4.5 text-danger" />
                            <span className="text-danger font-medium text-xs">Missing</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <a
                        href={key.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <span>Docs</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Settings Panel */}
      <div className="glass-card p-6 space-y-6">
        <div className="border-b border-border/40 pb-4">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <User className="h-5 w-5 text-accent" /> Account Settings
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Details of the logged in user context
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium block">Full Name</label>
            <div className="bg-secondaryBg border border-border px-3 py-2 rounded-md text-sm text-white select-text">
              {user?.name || 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium block">Email Address</label>
            <div className="bg-secondaryBg border border-border px-3 py-2 rounded-md text-sm text-text-secondary select-text">
              {user?.email || 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium block">Account Status</label>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-md w-fit">
              <ShieldCheck className="h-4 w-4" />
              <span>Enterprise Member</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 pt-6 flex justify-end">
          <button
            id="settings-signout"
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger/80 text-white text-sm font-semibold rounded-md transition-colors duration-150 interactive-btn"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
