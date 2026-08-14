import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '../lib/api';
import { formatCost, formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { History, Eye, Trash2, Filter, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function WorkflowHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'created_at' | 'total_cost_usd'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  // Fetch workflows
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['workflows', page, statusFilter],
    queryFn: () => workflowsApi.list(page, statusFilter === 'All' ? undefined : statusFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: workflowsApi.delete,
    onSuccess: () => {
      toast.success('Workflow deleted successfully');
      setWorkflowToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: () => {
      toast.error('Failed to delete workflow');
    },
  });

  const workflows = data?.workflows || [];
  const total = data?.total || 0;
  const perPage = data?.per_page || 20;
  const totalPages = Math.ceil(total / perPage);

  const handleSort = (field: 'created_at' | 'total_cost_usd') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleConfirmDelete = () => {
    if (workflowToDelete) {
      deleteMutation.mutate(workflowToDelete);
    }
  };

  // Local client-side sorting since we are paginating locally
  const sortedWorkflows = [...workflows].sort((a, b) => {
    let valA = a[sortField] || 0;
    let valB = b[sortField] || 0;

    if (sortField === 'created_at') {
      valA = new Date(a.created_at).getTime();
      valB = new Date(b.created_at).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-8 select-none relative">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Past Workflows
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Review history logs, enrichment outputs, costs, and audit logs of all platform dispatches
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-md hover:bg-surface text-text-muted hover:text-white transition-colors duration-150 interactive-btn border border-border hover:border-border-hover"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters and sorting info bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4.5 w-4.5 text-text-muted" />
          <span className="text-xs text-text-secondary">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // Reset page to 1 on filter change
            }}
            className="bg-secondaryBg border border-border text-xs rounded-md text-white px-2 py-1.5 focus:outline-none focus:border-primary font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="pending">Queued</option>
            <option value="running">Running</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="text-xs text-text-muted">
          Showing <span className="text-white font-semibold">{workflows.length}</span> of{' '}
          <span className="text-white font-semibold">{total}</span> dispatches
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 py-10 px-6 animate-pulse">
            <div className="h-10 bg-secondaryBg rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-secondaryBg/60 rounded" />
            ))}
          </div>
        ) : sortedWorkflows.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="text-text-muted text-sm">
              {statusFilter !== 'All'
                ? `No workflows with status "${statusFilter.replace('_', ' ')}" found.`
                : 'No workflow records found for your account.'}
            </p>
            {statusFilter !== 'All' ? (
              <button
                onClick={() => setStatusFilter('All')}
                className="text-xs text-primary hover:underline"
              >
                Clear filter
              </button>
            ) : (
              <button
                onClick={() => navigate('/workflows/new')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-bold transition-colors interactive-btn"
              >
                Launch New Pipeline
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondaryBg/40 border-b border-border/40 text-text-muted text-xs uppercase tracking-wider select-none">
                  <th className="p-4 font-semibold">Workflow Name</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Leads Found</th>
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-white transition-colors flex items-center gap-1 select-none"
                    onClick={() => handleSort('total_cost_usd')}
                  >
                    <span>Cost (USD)</span>
                    {sortField === 'total_cost_usd' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    <span>Dispatched At</span>
                    {sortField === 'created_at' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {sortedWorkflows.map((w) => (
                  <tr
                    key={w.workflow_id}
                    className="hover:bg-surface/20 transition-colors duration-100 group border-b border-border/10"
                  >
                    <td className="p-4 font-medium text-white select-text">{w.name}</td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 border font-semibold rounded-full uppercase ${
                          w.status === 'completed'
                            ? 'bg-success/15 border-success/35 text-success'
                            : w.status === 'running'
                            ? 'bg-primary/15 border-primary/35 text-primary'
                            : w.status === 'awaiting_approval'
                            ? 'bg-warning/15 border-warning/35 text-warning animate-pulse'
                            : w.status === 'failed'
                            ? 'bg-danger/15 border-danger/35 text-danger'
                            : 'bg-text-disabled/15 border-border text-text-muted'
                        }`}
                      >
                        {w.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">{w.results_count ?? 0}</td>
                    <td className="p-4 font-mono text-white">{formatCost(w.total_cost_usd)}</td>
                    <td className="p-4 text-text-muted text-xs">{formatDate(w.created_at)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/workflows/${w.workflow_id}`)}
                          className="p-1.5 rounded-md hover:bg-surface text-text-secondary hover:text-white transition-colors duration-150 interactive-btn"
                          title="View Workflow Detail"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => setWorkflowToDelete(w.workflow_id)}
                          className="p-1.5 rounded-md hover:bg-danger/15 text-text-secondary hover:text-danger transition-colors duration-150 interactive-btn"
                          title="Delete Workflow"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={() => setPage(Math.max(page - 1, 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-surface disabled:opacity-50 text-text-secondary hover:text-white rounded-md text-xs font-semibold transition-colors duration-150 interactive-btn"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-text-muted">
            Page <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </span>

          <button
            onClick={() => setPage(Math.min(page + 1, totalPages))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-surface disabled:opacity-50 text-text-secondary hover:text-white rounded-md text-xs font-semibold transition-colors duration-150 interactive-btn"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setWorkflowToDelete(null)} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl p-6 select-none animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-danger border-b border-border/40 pb-3">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              <h2 className="text-md font-bold text-white">Delete Workflow</h2>
            </div>
            
            <p className="text-xs text-text-muted mt-3 leading-relaxed">
              Are you sure you want to delete this workflow record and all related coordinates? All discovered companies, enriched contacts, vector store memory index points, and execution logs will be permanently deleted. This action is irreversible.
            </p>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setWorkflowToDelete(null)}
                className="px-4 py-2 border border-border hover:bg-elevated text-text-secondary hover:text-white text-xs font-semibold rounded-md transition-colors duration-150 interactive-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-danger hover:bg-danger/80 text-white text-xs font-semibold rounded-md transition-colors duration-150 interactive-btn flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowHistory;
