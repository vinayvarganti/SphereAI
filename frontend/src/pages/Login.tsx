import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

type TabType = 'signin' | 'signup';

export function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabType>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signin') {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await signup(name, email, password);
        toast.success('Account created! Welcome to AgentSphere AI.');
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: TabType) => {
    setTab(t);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-center relative px-4 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/6 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center select-none text-center z-10">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-[#06B6D4] to-accent flex items-center justify-center shadow-ai-glow mb-4 hover:scale-105 transition-transform duration-300">
          <Globe className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">AgentSphere AI</h1>
        <p className="text-text-muted mt-2 text-sm max-w-sm">
          Enterprise Agentic Pipeline Platform for Prospect Intelligence and ICP Discovery
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] z-10">
        <div className="bg-[#111827]/80 border border-[#1F2937] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-[#1F2937]">
            <button
              id="tab-signin"
              onClick={() => switchTab('signin')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                tab === 'signin'
                  ? 'text-white border-b-2 border-primary bg-primary/5'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              id="tab-signup"
              onClick={() => switchTab('signup')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                tab === 'signup'
                  ? 'text-white border-b-2 border-primary bg-primary/5'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm animate-in fade-in duration-200">
                <span className="mt-0.5 text-lg leading-none">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Full Name — signup only */}
            {tab === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="auth-name" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B1220] border border-[#1F2937] rounded-xl px-4 py-3 text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-150"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B1220] border border-[#1F2937] rounded-xl px-4 py-3 text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B1220] border border-[#1F2937] rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-150"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors duration-150 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[#2563EB] hover:from-[#2563EB] hover:to-primary text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg hover:shadow-primary/30 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tab === 'signin' ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Switch link */}
            <p className="text-center text-xs text-text-muted pt-1">
              {tab === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-text-muted mt-5 select-none">
          Secured · AgentSphere AI Platform
        </p>
      </div>
    </div>
  );
}

export default Login;
