import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCost(usd: number | undefined | null): string {
  if (usd === undefined || usd === null) return '$0.0000';
  return `$${usd.toFixed(4)}`;
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'MMM d, yyyy HH:mm');
  } catch (e) {
    return iso;
  }
}

export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch (e) {
    return iso;
  }
}

export function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
