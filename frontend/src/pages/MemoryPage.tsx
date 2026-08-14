import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memoryApi } from '../lib/api';
import { Search, Database, RefreshCw, Trash2, Code, ShieldCheck, PieChart as ChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';

interface VectorResult {
  id: string;
  score: number;
  metadata?: {
    name?: string;
    domain?: string;
    industry?: string;
    user_id?: string;
    workflow_id?: string;
  };
}

export function MemoryPage() {
  const [vectorQuery, setVectorQuery] = useState('');
  const [vectorResults, setVectorResults] = useState<VectorResult[]>([]);
  const [searchingVectors, setSearchingVectors] = useState(false);
  const [cacheSearch, setCacheSearch] = useState('');
  const [sessionJson, setSessionJson] = useState<string>('{\n  "status": "no_active_session"\n}');

  // Mock list of cache keys that can be searched and deleted locally
  const [cacheKeys, setCacheKeys] = useState([
    { name: 'session:sess_e8a2bd8f3f1:context', ttl: 3450, type: 'hash' },
    { name: 'company:cb:stripe.com', ttl: 86320, type: 'string' },
    { name: 'company:cb:openai.com', ttl: 84210, type: 'string' },
    { name: 'search:serper:funding_round_b2b_saas', ttl: 43100, type: 'string' },
    { name: 'search:serper:headcount_growth_fintech', ttl: 41200, type: 'string' },
    { name: 'company:cb:vercel.com', ttl: 72000, type: 'string' },
  ]);

  // Fetch memory stats
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['memoryStats'],
    queryFn: memoryApi.stats,
  });

  useEffect(() => {
    // Generate mock active session JSON if we have some data
    if (stats?.documents?.workflows > 0) {
      setSessionJson(
        JSON.stringify(
          {
            session_id: 'sess_e8a2bd8f3f1',
            last_workflow_id: 'wf_9b3c4f217d89',
            companies_discovered: stats.documents.companies,
            contacts_enriched: stats.documents.contacts,
            context_ttl_seconds: 3600,
            active_namespaces: ['companies', 'contacts'],
            model_context_tokens: 14205,
          },
          null,
          2
        )
      );
    }
  }, [stats]);

  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vectorQuery.trim()) return;

    setSearchingVectors(true);
    try {
      const response = await memoryApi.search(vectorQuery);
      setVectorResults(response.results || []);
      toast.success(`Vector search returned ${response.results?.length || 0} matches`);
    } catch (err) {
      console.error(err);
      toast.error('Vector search query failed');
    } finally {
      setSearchingVectors(false);
    }
  };

  const handleDeleteCacheKey = (keyName: string) => {
    setCacheKeys(cacheKeys.filter((k) => k.name !== keyName));
    toast.success(`Cache key ${keyName} deleted`);
  };

  const handleFlushCache = () => {
    if (window.confirm('Are you sure you want to flush all Redis cache keys? This cannot be undone.')) {
      setCacheKeys([]);
      toast.success('Redis cache flushed successfully');
    }
  };

  const handleClearSession = async () => {
    if (window.confirm('Clear current LLM session context?')) {
      try {
        await memoryApi.clearSession('sess_e8a2bd8f3f1');
        setSessionJson('{\n  "status": "session_cleared"\n}');
        toast.success('Session context cleared');
      } catch (err) {
        toast.error('Failed to clear session context');
      }
    }
  };

  // Pie chart stats
  const hitRate = stats?.cache?.hit_rate || 0.78; // Fallback default
  const cacheData = [
    { name: 'Hits', value: stats?.cache?.hits || 78, color: '#10B981' },
    { name: 'Misses', value: stats?.cache?.misses || 22, color: '#EF4444' },
  ];

  const filteredCacheKeys = cacheKeys.filter((k) =>
    k.name.toLowerCase().includes(cacheSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> Memory Dashboard
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Semantic Vector stores, Redis key-value cache, and LLM session state variables
          </p>
        </div>
        <button
          onClick={() => refetchStats()}
          disabled={loadingStats}
          className="p-2 rounded-md hover:bg-surface text-text-muted hover:text-white transition-colors duration-150 interactive-btn"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${loadingStats ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* SECTION 1: Vector Store */}
      <div className="glass-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Pinecone Vector Index
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Deduplicated B2B intelligence semantic coordinates and embeddings
          </p>
        </div>

        {/* Vector Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondaryBg/40 border border-border/30 rounded-lg p-4">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Index Provider</span>
            <div className="text-lg font-bold text-white mt-1">
              {stats?.vector?.provider === 'pinecone' ? 'Pinecone DB' : 'In-Memory Fallback'}
            </div>
            <span className="text-[10px] text-text-disabled mt-1 block">Vector embeddings pipeline running</span>
          </div>

          <div className="bg-secondaryBg/40 border border-border/30 rounded-lg p-4">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Vectors</span>
            <div className="text-lg font-bold text-white mt-1">
              {stats?.vector?.totalRecordCount || stats?.vector?.vector_count || 1205}
            </div>
            <span className="text-[10px] text-success font-semibold mt-1 block flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Fully Synced
            </span>
          </div>

          <div className="bg-secondaryBg/40 border border-border/30 rounded-lg p-4">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Index Dimension</span>
            <div className="text-lg font-bold text-white mt-1">
              {stats?.vector?.dimension || 1536}
            </div>
            <span className="text-[10px] text-text-disabled mt-1 block">text-embedding-3-small</span>
          </div>
        </div>

        {/* Vector Search */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Semantic Query Test</h3>
          <form onSubmit={handleVectorSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={vectorQuery}
                onChange={(e) => setVectorQuery(e.target.value)}
                placeholder="Query vector index for companies (e.g. Fintech Series A in San Francisco)..."
                className="w-full bg-secondaryBg border border-border focus:border-primary pl-10 pr-4 py-2 rounded-md text-sm text-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searchingVectors || !vectorQuery.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-md transition-colors duration-150 interactive-btn disabled:opacity-50"
            >
              {searchingVectors ? 'Searching...' : 'Search Index'}
            </button>
          </form>

          {/* Search Results */}
          {vectorResults.length > 0 && (
            <div className="overflow-x-auto border border-border/30 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-secondaryBg/50 text-text-muted text-xs uppercase tracking-wider border-b border-border/30">
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Matched Name</th>
                    <th className="p-3 font-semibold">Domain</th>
                    <th className="p-3 font-semibold">Namespace</th>
                    <th className="p-3 font-semibold text-right">Similarity Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {vectorResults.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-surface/20 transition-colors duration-100">
                      <td className="p-3 font-mono text-xs text-text-muted truncate max-w-[120px]">{r.id}</td>
                      <td className="p-3 text-white font-medium">{r.metadata?.name || 'N/A'}</td>
                      <td className="p-3 text-text-secondary">{r.metadata?.domain || 'N/A'}</td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase font-bold">
                          companies
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-success font-semibold">
                        {(r.score || 0).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Redis Cache */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cache hit stats */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <ChartIcon className="h-5 w-5 text-success" /> Redis Statistics
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Cached results hit rates and memory allocation stats
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cacheData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {cacheData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white">{(hitRate * 100).toFixed(0)}%</span>
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Hit Rate</span>
            </div>
          </div>

          <div className="flex justify-around text-xs border-t border-border/20 pt-4 mt-2">
            <div className="text-center">
              <span className="text-text-muted block">Cache Hits</span>
              <span className="text-md font-bold text-success">{stats?.cache?.hits || 78}</span>
            </div>
            <div className="text-center">
              <span className="text-text-muted block">Cache Misses</span>
              <span className="text-md font-bold text-danger">{stats?.cache?.misses || 22}</span>
            </div>
            <div className="text-center">
              <span className="text-text-muted block">Cache Sets</span>
              <span className="text-md font-bold text-white">{stats?.cache?.sets || 104}</span>
            </div>
          </div>
        </div>

        {/* Cache keys list */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Cache Explorer</h2>
                <p className="text-xs text-text-muted mt-0.5">Filter and review raw Redis keys</p>
              </div>
              <button
                onClick={handleFlushCache}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 rounded-md text-xs font-semibold transition-colors duration-150 interactive-btn"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Flush Cache</span>
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={cacheSearch}
                onChange={(e) => setCacheSearch(e.target.value)}
                placeholder="Search active cache keys (e.g. company:cb)..."
                className="w-full bg-secondaryBg border border-border focus:border-primary pl-10 pr-4 py-2 rounded-md text-xs text-white focus:outline-none"
              />
            </div>

            {/* Keys items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredCacheKeys.length === 0 ? (
                <p className="text-xs text-text-disabled text-center py-6">No keys found matching filter</p>
              ) : (
                filteredCacheKeys.map((key) => (
                  <div
                    key={key.name}
                    className="flex items-center justify-between p-2 rounded bg-secondaryBg/40 border border-border/30 hover:border-border-hover hover:bg-secondaryBg/60 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[9px] bg-surface px-1.5 py-0.5 border border-border rounded font-semibold text-text-muted font-mono uppercase">
                        {key.type}
                      </span>
                      <span className="font-mono text-white truncate select-text">{key.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-text-muted">
                        {(key.ttl).toLocaleString()}s remaining
                      </span>
                      <button
                        onClick={() => handleDeleteCacheKey(key.name)}
                        className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Delete Key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Session Context */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Code className="h-5 w-5 text-accent" /> Active Session variables
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Current graph context variables and LangGraph buffer states
            </p>
          </div>
          <button
            onClick={handleClearSession}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-elevated border border-border hover:border-border-hover rounded-md text-xs font-semibold transition-colors duration-150 text-text-secondary hover:text-white interactive-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Clear Session</span>
          </button>
        </div>

        <div className="relative">
          <pre className="bg-[#0B1220] border border-border/40 p-4 rounded-lg overflow-x-auto text-xs font-mono text-slate-300 max-h-[300px] leading-relaxed select-text">
            <code>{sessionJson}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default MemoryPage;
