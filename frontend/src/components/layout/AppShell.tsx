import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AlertCircle } from 'lucide-react';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Optimisation Warning Banner */}
        <div className="md:hidden bg-warning/20 border-b border-warning/40 text-warning px-4 py-2 text-xs flex items-center justify-center gap-2 select-none">
          <AlertCircle className="h-4 w-4 animate-bounce flex-shrink-0" />
          <span>AgentSphere AI is optimised for desktop use.</span>
        </div>

        {/* Header Topbar */}
        <Topbar />

        {/* Page Content viewport */}
        <main className="flex-1 p-6 overflow-y-auto bg-secondaryBg/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
