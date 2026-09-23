import { useSyncExternalStore } from 'react';
import { getBookings, subscribeBookings, type Booking } from './storage';

export function useBookings(): Booking[] {
  return useSyncExternalStore(subscribeBookings, getBookings, getBookings);
}
