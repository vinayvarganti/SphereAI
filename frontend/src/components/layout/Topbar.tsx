import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Bell, ShieldCheck, LogOut, User, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkflowStore } from '../../store/workflowStore';

export function Topbar() {
  const { user, logout } = useAuth();
  const { activeWorkflowId } = useWorkflowStore();
  const { notificationBadge, setActiveTab } = useUIStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Poll /health every 10 s to show a real backend-connectivity indicator
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
        const res = await fetch(`${base.replace('/api/v1', '')}/health`, { signal: AbortSignal.timeout(4000) });
        if (!cancelled) setBackendConnected(res.ok);
      } catch {
        if (!cancelled) setBackendConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleNotificationClick = () => {
    if (activeWorkflowId && notificationBadge > 0) {
      setActiveTab('approval');
      navigate(`/workflows/${activeWorkflowId}`);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Get initials from name
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="h-16 border-b border-border bg-[#0B1220]/80 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Page Title placeholder, pages will specify their titles */}
      <div>
        <span className="text-xs text-text-muted font-medium">AgentSphere AI Platform</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/50 border border-border text-xs">
          {backendConnected === null ? (
            <span className="h-2.5 w-2.5 rounded-full bg-text-disabled animate-pulse" />
          ) : backendConnected ? (
            <Wifi className="h-3.5 w-3.5 text-success" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-danger" />
          )}
          <span className={`font-medium select-none ${
            backendConnected === null ? 'text-text-muted' :
            backendConnected ? 'text-success' : 'text-danger'
          }`}>
            {backendConnected === null ? 'Checking…' : backendConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Plan Badge */}
        <div className="flex items-center gap-1 bg-[#6366F1]/10 text-accent text-xs font-semibold px-3 py-1 rounded-full border border-[#6366F1]/30 shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <span>Enterprise Plan</span>
        </div>

        {/* Notifications Icon */}
        <button
          onClick={handleNotificationClick}
          className="p-2 rounded-md hover:bg-surface text-text-secondary hover:text-white relative interactive-btn"
          title={notificationBadge > 0 ? `${notificationBadge} approvals pending` : 'No notifications'}
        >
          <Bell className="h-5 w-5" />
          {notificationBadge > 0 && (
            <span className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-danger text-white rounded-full border-2 border-background animate-pulse">
              {notificationBadge}
            </span>
          )}
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative flex items-center border-l border-border pl-4 gap-3" ref={dropdownRef}>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-white">{user?.name || 'User Account'}</p>
            <p className="text-[10px] text-text-muted">{user?.email || ''}</p>
          </div>

          <button
            id="topbar-user-menu"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 group"
          >
            {/* Avatar circle with initials */}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white border border-border shadow-sm group-hover:shadow-primary/30 transition-all duration-150 select-none">
              {initials}
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#111827] border border-[#1F2937] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-[#1F2937]">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-surface/50 transition-colors duration-100"
              >
                <User className="h-4 w-4" />
                Account Settings
              </button>

              <div className="border-t border-[#1F2937] mt-1 pt-1">
                <button
                  id="topbar-signout"
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors duration-100"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
