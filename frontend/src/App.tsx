import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AppShell from './components/layout/AppShell';

// Pages
import Dashboard from './pages/Dashboard';
import NewWorkflow from './pages/NewWorkflow';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowHistory from './pages/WorkflowHistory';
import Marketplace from './pages/Marketplace';
import MemoryPage from './pages/MemoryPage';
import CostPage from './pages/CostPage';
import Settings from './pages/Settings';
import Login from './pages/Login';

// AuthGuard component to secure dashboard routes
function AuthGuard() {
  const { user, isLoaded } = useAuth();

  // Wait until localStorage has been checked before redirecting
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Login is publicly accessible */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Dashboard Routes */}
            <Route element={<AuthGuard />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workflows/new" element={<NewWorkflow />} />
                <Route path="/workflows" element={<WorkflowHistory />} />
                <Route path="/workflows/:workflowId" element={<WorkflowDetail />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/memory" element={<MemoryPage />} />
                <Route path="/cost" element={<CostPage />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Fallback wildcard redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        {/* Premium Notifications overlay */}
        <Toaster theme="dark" position="top-right" closeButton richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
