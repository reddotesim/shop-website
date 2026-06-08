import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatGb(gb: number | null): string {
  if (gb === null) return '–';
  if (gb >= 1)     return `${gb} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}
