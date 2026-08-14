import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Store,
  BrainCircuit,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/workflows/new', label: 'New Workflow', icon: PlusCircle },
    { to: '/workflows', label: 'Workflows', icon: History },
    { to: '/marketplace', label: 'Marketplace', icon: Store },
    { to: '/memory', label: 'Vector Store', icon: BrainCircuit },
    { to: '/cost', label: 'Cost Analytics', icon: DollarSign },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-[#0B1220] border-r border-border transition-all duration-300 z-30 flex flex-col justify-between",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div>
        {/* Logo Section */}
        <div className="h-16 flex items-center px-4 border-b border-border justify-between overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-[#3B82F6] via-[#06B6D4] to-[#6366F1] flex items-center justify-center shadow-ai-glow">
              <Globe className="h-4 w-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-white tracking-wide text-md truncate bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-[#06B6D4] to-accent">
                AgentSphere AI
              </span>
            )}
          </div>
        </div>

        {/* Navigation links */}
        <nav className="mt-6 px-2 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group duration-150 relative",
                    isActive
                      ? "bg-primary text-white shadow-ai-glow shadow-primary/20"
                      : "text-text-secondary hover:bg-surface hover:text-white"
                  )
                }
                title={sidebarCollapsed ? link.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", "group-hover:text-white")} />
                {!sidebarCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Collapse button at bottom */}
      <div className="p-2 border-t border-border flex justify-end">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-surface interactive-btn"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
