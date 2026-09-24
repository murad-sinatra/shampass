import type { PayMethod } from './payment';

export interface SearchDraft {
  from: string;
  to: string;
  date: string;
  pax: number;
}

export interface CheckoutDraft {
  tripId: string;
  names: Record<string, string>;
  phone: string;
  method: PayMethod;
}

const SEARCH_KEY = 'shampass.search';
const DRAFT_KEY = 'shampass.draft';

export function loadSearch(): SearchDraft | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SearchDraft;
    if (!parsed.from || !parsed.to || !parsed.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSearch(draft: SearchDraft) {
  sessionStorage.setItem(SEARCH_KEY, JSON.stringify(draft));
}

export function loadCheckoutDraft(tripId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (parsed.tripId !== tripId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
