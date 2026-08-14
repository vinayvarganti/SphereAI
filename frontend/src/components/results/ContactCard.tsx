import { useState } from 'react';
import type { Contact } from '../../types/contact';
import { Copy, Check, Linkedin, Phone, Mail, Award } from 'lucide-react';
import { toast } from 'sonner';

interface ContactCardProps {
  contact: Contact;
  showApprovalStatus?: boolean;
}

export function ContactCard({ contact, showApprovalStatus = false }: ContactCardProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyEmail = async () => {
    if (!contact.email) return;
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopiedEmail(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error('Failed to copy email');
    }
  };

  const handleCopyPhone = async () => {
    if (!contact.phone) return;
    try {
      await navigator.clipboard.writeText(contact.phone);
      setCopiedPhone(true);
      toast.success('Phone number copied to clipboard');
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      toast.error('Failed to copy phone');
    }
  };

  return (
    <div className="p-4 bg-secondaryBg/30 border border-border/30 rounded-lg hover:border-border-hover hover:bg-secondaryBg/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Contact Details */}
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-white leading-none select-text">{contact.name}</span>
          {contact.persona_matched && (
            <span className="inline-flex items-center gap-0.5 text-[9px] bg-accent/15 border border-accent/30 text-accent px-1.5 py-0.5 rounded font-semibold select-none">
              <Award className="h-2.5 w-2.5" />
              <span>{contact.persona_matched}</span>
            </span>
          )}
          {showApprovalStatus && (
            <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase rounded ${
              contact.approval_status === 'approved' ? 'bg-success/15 border border-success/30 text-success' :
              contact.approval_status === 'rejected' ? 'bg-danger/15 border border-danger/30 text-danger' :
              'bg-warning/15 border border-warning/30 text-warning'
            }`}>
              {contact.approval_status}
            </span>
          )}
        </div>
        
        {/* Title */}
        <p className="text-xs text-text-secondary select-text truncate">{contact.title || 'N/A'}</p>

        {/* Contact Links */}
        <div className="flex flex-wrap items-center gap-4 pt-1.5 text-xs text-text-muted select-none">
          {/* Email — always shown */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            {contact.email ? (
              <>
                <span className="truncate select-text text-text-secondary">{contact.email}</span>
                <button
                  onClick={handleCopyEmail}
                  className="p-1 rounded hover:bg-surface text-text-muted hover:text-white transition-colors"
                  title="Copy Email"
                >
                  {copiedEmail ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                </button>
              </>
            ) : (
              <span className="text-text-disabled italic text-[10px]">Email not found</span>
            )}
          </div>

          {/* Phone — always shown */}
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-success" />
            {contact.phone ? (
              <>
                <span className="select-text text-text-secondary">{contact.phone}</span>
                <button
                  onClick={handleCopyPhone}
                  className="p-1 rounded hover:bg-surface text-text-muted hover:text-white transition-colors"
                  title="Copy Phone"
                >
                  {copiedPhone ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                </button>
              </>
            ) : (
              <span className="text-text-disabled italic text-[10px]">Phone not found</span>
            )}
          </div>
        </div>
      </div>

      {/* Action panel / Confidence */}
      <div className="flex items-center gap-3 flex-shrink-0 select-none w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-border/20 pt-2 sm:pt-0">
        
        {/* Email Confidence badge */}
        {contact.email_confidence !== undefined && contact.email_confidence !== null && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-muted">Confidence:</span>
            <span className={`text-[10px] font-bold font-mono ${
              contact.email_confidence >= 0.85 ? 'text-success' :
              contact.email_confidence >= 0.65 ? 'text-warning' : 'text-danger'
            }`}>
              {(contact.email_confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* LinkedIn button link */}
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-primary/10 border border-border/40 hover:border-primary/40 text-text-secondary hover:text-primary transition-all duration-150 interactive-btn"
            title="Open LinkedIn Profile"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default ContactCard;
