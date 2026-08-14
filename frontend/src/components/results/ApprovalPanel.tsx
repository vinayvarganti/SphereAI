import { useState } from 'react';
import type { Contact } from '../../types/contact';
import type { Company } from '../../types/company';
import type { ApprovalDecision } from '../../types/workflow';
import { Check, X, Edit, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalPanelProps {
  contacts: Contact[];
  companies: Company[];
  onSubmit: (decisions: ApprovalDecision[]) => Promise<void>;
  isSubmitting: boolean;
}

export function ApprovalPanel({ contacts, companies, onSubmit, isSubmitting }: ApprovalPanelProps) {
  // Local state for decisions: contactId -> decision status ('approve' | 'reject' | 'edit')
  const [decisions, setDecisions] = useState<Record<string, { action: 'approve' | 'reject' | 'edit'; reason?: string; edits?: Partial<Contact> }>>({});
  
  // Selection keys for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Rejection comments state
  const [rejectionIds, setRejectionIds] = useState<Record<string, string>>({}); // contactId -> reason text
  const [activeRejectionId, setActiveRejectionId] = useState<string | null>(null);

  // Bulk rejection details
  const [bulkRejectionOpen, setBulkRejectionOpen] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');

  // Editing dialog state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState({ name: '', title: '', email: '', phone: '' });

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return 'N/A';
    const found = companies.find((c) => c.id === companyId || c._id === companyId);
    return found ? found.name : 'Unknown Company';
  };

  const handleApproveRow = (contactId: string) => {
    setDecisions({
      ...decisions,
      [contactId]: { action: 'approve' },
    });
    toast.success('Contact marked for approval');
  };

  const handleRejectRow = (contactId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setDecisions({
      ...decisions,
      [contactId]: { action: 'reject', reason },
    });
    setActiveRejectionId(null);
    toast.error('Contact marked for rejection');
  };

  const handleStartEdit = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name,
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    const contactId = editingContact.id || editingContact._id;
    if (!contactId) return;

    setDecisions({
      ...decisions,
      [contactId]: {
        action: 'edit',
        edits: {
          name: editForm.name,
          title: editForm.title,
          email: editForm.email,
          phone: editForm.phone,
        },
      },
    });

    setEditingContact(null);
    toast.warning('Contact edited and marked for approval');
  };

  // Bulk actions
  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    const updated = { ...decisions };
    selectedIds.forEach((id) => {
      updated[id] = { action: 'approve' };
    });
    setDecisions(updated);
    setSelectedIds([]);
    toast.success(`Approved ${selectedIds.length} contacts`);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    if (!bulkRejectionReason.trim()) {
      toast.error('Bulk rejection reason is required');
      return;
    }

    const updated = { ...decisions };
    selectedIds.forEach((id) => {
      updated[id] = { action: 'reject', reason: bulkRejectionReason };
    });
    setDecisions(updated);
    setSelectedIds([]);
    setBulkRejectionOpen(false);
    setBulkRejectionReason('');
    toast.error(`Rejected ${selectedIds.length} contacts`);
  };

  const handleSelectRow = (contactId: string) => {
    setSelectedIds(
      selectedIds.includes(contactId) ? selectedIds.filter((id) => id !== contactId) : [...selectedIds, contactId]
    );
  };

  const handleSelectAll = () => {
    const pagePending = contacts.filter((c) => {
      const id = c.id || c._id;
      return id && !decisions[id]; // only select rows without decisions
    });
    
    if (selectedIds.length === pagePending.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagePending.map((c) => (c.id || c._id) as string));
    }
  };

  const handleFormSubmit = async () => {
    // Compile decisions list
    const parsedDecisions: ApprovalDecision[] = Object.entries(decisions).map(([id, dec]) => ({
      contact_id: id,
      action: dec.action,
      reason: dec.reason,
      edits: dec.edits,
    }));

    try {
      await onSubmit(parsedDecisions);
      toast.success('Decisions submitted successfully!');
    } catch {
      toast.error('Failed to submit decisions');
    }
  };

  const hasAllDecisions = contacts.every((c) => {
    const id = c.id || c._id;
    return id && decisions[id];
  });

  return (
    <div className="space-y-6 text-sm text-text-secondary select-none">
      {/* Title */}
      <div className="border-b border-border/40 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Human-In-The-Loop Approvals</h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            Approve, reject, or edit contacts before closing out this prospect list
          </p>
        </div>
        <div className="text-xs text-text-muted">
          Decisions made: <span className="text-white font-bold">{Object.keys(decisions).length}</span> /{' '}
          <span className="text-white font-bold">{contacts.length}</span> contacts
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 bg-primary/10 border border-primary/25 rounded-lg">
          <div className="text-xs font-bold text-white">
            {selectedIds.length} contact{selectedIds.length > 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1 px-3 py-1.5 bg-success text-white hover:bg-success/80 text-xs font-semibold rounded interactive-btn"
            >
              <Check className="h-4 w-4" /> Approve Selected
            </button>
            <button
              onClick={() => setBulkRejectionOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-danger text-white hover:bg-danger/80 text-xs font-semibold rounded interactive-btn"
            >
              <X className="h-4 w-4" /> Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-border/30 rounded-lg">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-secondaryBg/40 border-b border-border/40 text-text-muted text-[10px] uppercase font-bold tracking-wider select-none">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === contacts.filter(c => {const id=c.id||c._id; return id && !decisions[id];}).length}
                  onChange={handleSelectAll}
                  className="rounded border-border bg-secondaryBg text-primary focus:ring-primary h-4 w-4 accent-primary"
                />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Title</th>
              <th className="p-3">Company</th>
              <th className="p-3">Persona</th>
              <th className="p-3">Email</th>
              <th className="p-3 text-right">Confidence</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {contacts.map((c) => {
              const contactId = (c.id || c._id) as string;
              const decision = decisions[contactId];
              const isSelected = selectedIds.includes(contactId);

              // Row status color styling
              const rowClass =
                decision?.action === 'approve' ? 'bg-success/5 border-l-2 border-l-success' :
                decision?.action === 'reject' ? 'bg-danger/5 border-l-2 border-l-danger' :
                decision?.action === 'edit' ? 'bg-warning/5 border-l-2 border-l-warning' :
                'hover:bg-surface/20 transition-all';

              return (
                <tr key={contactId} className={rowClass}>
                  <td className="p-3 w-8">
                    {!decision && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(contactId)}
                        className="rounded border-border bg-secondaryBg text-primary h-4 w-4 accent-primary"
                      />
                    )}
                  </td>
                  <td className="p-3 font-semibold text-white truncate max-w-[120px] select-text">
                    {decision?.action === 'edit' ? decision.edits?.name : c.name}
                  </td>
                  <td className="p-3 text-text-secondary truncate max-w-[140px] select-text">
                    {decision?.action === 'edit' ? decision.edits?.title : c.title}
                  </td>
                  <td className="p-3 text-text-muted truncate max-w-[120px] select-text">
                    {getCompanyName(c.company_id)}
                  </td>
                  <td className="p-3">
                    <span className="text-[9px] bg-accent/10 border border-accent/25 text-accent px-2 py-0.5 rounded font-semibold uppercase select-none">
                      {c.persona_matched || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-text-secondary select-text truncate max-w-[160px]">
                    {decision?.action === 'edit' ? decision.edits?.email : c.email || 'N/A'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white select-none">
                    {c.email_confidence ? `${(c.email_confidence * 100).toFixed(0)}%` : '0%'}
                  </td>
                  <td className="p-3 text-right select-none">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleApproveRow(contactId)}
                        className="p-1 rounded-md hover:bg-success/20 text-text-secondary hover:text-success transition-all duration-150 interactive-btn"
                        title="Approve Contact"
                      >
                        <Check className="h-4.5 w-4.5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setActiveRejectionId(activeRejectionId === contactId ? null : contactId);
                          setRejectionIds({ ...rejectionIds, [contactId]: '' });
                        }}
                        className="p-1 rounded-md hover:bg-danger/20 text-text-secondary hover:text-danger transition-all duration-150 interactive-btn"
                        title="Reject Contact"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>

                      <button
                        onClick={() => handleStartEdit(c)}
                        className="p-1 rounded-md hover:bg-warning/20 text-text-secondary hover:text-warning transition-all duration-150 interactive-btn"
                        title="Edit Details"
                      >
                        <Edit className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Inline Rejection Reason box */}
                    {activeRejectionId === contactId && (
                      <div className="absolute right-4 mt-2 bg-surface border border-border p-3 rounded-lg shadow-xl z-20 w-64 text-left select-none animate-in fade-in duration-150">
                        <span className="text-[10px] text-text-muted font-bold block mb-1">Enter Rejection Reason</span>
                        <input
                          type="text"
                          value={rejectionIds[contactId] || ''}
                          onChange={(e) => setRejectionIds({ ...rejectionIds, [contactId]: e.target.value })}
                          placeholder="e.g. Wrong email pattern, Not target VP"
                          className="w-full bg-[#0B1220] border border-border px-2.5 py-1.5 rounded text-xs text-white focus:outline-none mb-2"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setActiveRejectionId(null)}
                            className="px-2 py-1 text-[10px] hover:bg-secondaryBg text-text-muted rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRejectRow(contactId, rejectionIds[contactId])}
                            className="px-2 py-1 bg-danger hover:bg-danger/80 text-white text-[10px] font-bold rounded"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Decision Submission button */}
      <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        {!hasAllDecisions && (
          <div className="text-xs text-warning flex items-center gap-1.5">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 animate-bounce" />
            <span>Decisions must be made for all discovered contacts before finalizing this run list.</span>
          </div>
        )}
        <button
          onClick={handleFormSubmit}
          disabled={!hasAllDecisions || isSubmitting}
          className="w-full sm:w-auto ml-auto px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold rounded-md shadow-ai-glow transition-colors duration-150 flex items-center justify-center gap-2 interactive-btn"
        >
          {isSubmitting ? (
            <>
              <Loader className="h-4.5 w-4.5 animate-spin" />
              <span>Submitting Decisions...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4.5 w-4.5" />
              <span>Submit Decisions</span>
            </>
          )}
        </button>
      </div>

      {/* Bulk Rejection Reason dialog */}
      {bulkRejectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setBulkRejectionOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl p-5 select-none">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-border/40 pb-2">
              <AlertCircle className="h-5 w-5 text-danger" /> Bulk Rejection Reason
            </h4>
            <p className="text-xs text-text-muted mt-3">
              Explain why these selected contacts are being rejected:
            </p>
            <input
              type="text"
              value={bulkRejectionReason}
              onChange={(e) => setBulkRejectionReason(e.target.value)}
              placeholder="e.g. Unmatched seniority verticals"
              className="w-full bg-[#0B1220] border border-border px-3 py-2 rounded text-xs text-white focus:outline-none mt-3"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setBulkRejectionOpen(false)}
                className="px-3 py-1.5 text-xs hover:bg-secondaryBg text-text-muted rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReject}
                disabled={!bulkRejectionReason.trim()}
                className="px-3 py-1.5 bg-danger hover:bg-danger/80 text-white text-xs font-semibold rounded"
              >
                Reject Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Dialog Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingContact(null)} />
          <form onSubmit={handleSaveEdit} className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl p-6 space-y-4">
            <div className="border-b border-border/40 pb-3">
              <h4 className="text-sm font-bold text-white">Edit Prospect Contact Details</h4>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-text-muted font-bold">Contact Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#0B1220] border border-border px-3 py-2 rounded text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted font-bold">Job Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-[#0B1220] border border-border px-3 py-2 rounded text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted font-bold">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-[#0B1220] border border-border px-3 py-2 rounded text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted font-bold">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-[#0B1220] border border-border px-3 py-2 rounded text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 border border-border hover:bg-elevated text-text-secondary hover:text-white text-xs font-semibold rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded"
              >
                Apply Edits
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ApprovalPanel;
