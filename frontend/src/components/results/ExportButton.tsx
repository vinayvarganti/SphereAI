import type { Contact } from '../../types/contact';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  contacts: Contact[];
  workflowName: string;
}

export function ExportButton({ contacts, workflowName }: ExportButtonProps) {
  
  const handleExport = () => {
    const approved = contacts.filter((c) => c.approval_status === 'approved');
    if (approved.length === 0) {
      toast.error('No approved contacts found to export.');
      return;
    }

    const headers = [
      'Name',
      'Title',
      'Seniority',
      'Department',
      'Email',
      'Email Confidence',
      'Phone',
      'LinkedIn URL',
      'Persona Matched',
      'Status',
    ].join(',');

    const rows = approved
      .map((c) =>
        [
          `"${c.name}"`,
          `"${c.title || ''}"`,
          `"${c.seniority || ''}"`,
          `"${c.department || ''}"`,
          c.email ? `"${c.email}"` : '',
          c.email_confidence ? `"${(c.email_confidence * 100).toFixed(0)}%"` : '',
          c.phone ? `"${c.phone}"` : '',
          c.linkedin_url ? `"${c.linkedin_url}"` : '',
          c.persona_matched ? `"${c.persona_matched}"` : '',
          `"${c.approval_status}"`,
        ].join(',')
      )
      .join('\n');

    const csvContent = headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download element and trigger
    const link = document.createElement('a');
    const sanitizedName = workflowName.toLowerCase().replace(/ /g, '_');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${sanitizedName}_approved_contacts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${approved.length} approved contacts successfully`);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-4 py-2 bg-success hover:bg-success/80 text-white rounded-md text-xs font-semibold shadow-sm transition-colors duration-150 interactive-btn"
    >
      <Download className="h-4 w-4" />
      <span>Export Approved Contacts</span>
    </button>
  );
}

export default ExportButton;
