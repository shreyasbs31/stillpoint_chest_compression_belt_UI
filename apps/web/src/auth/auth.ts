import { create } from 'zustand';
import { createPasswordRecord, verifyPassword } from './crypto';
import { db } from '@/data/db';

const UNLOCK_KEY = 'stillpoint-unlocked';

interface AuthState {
  ready: boolean;
  hasPassword: boolean;
  unlocked: boolean;
  load: () => Promise<void>;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  lock: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  hasPassword: false,
  unlocked: false,
  load: async () => {
    const row = await db.security.get('app');
    const unlocked = !!row && sessionStorage.getItem(UNLOCK_KEY) === '1';
    set({ ready: true, hasPassword: !!row, unlocked });
  },
  setup: async (password) => {
    if (get().hasPassword) return;
    const record = await createPasswordRecord(password);
    await db.security.put({ id: 'app', ...record });
    sessionStorage.setItem(UNLOCK_KEY, '1');
    set({ hasPassword: true, unlocked: true });
  },
  unlock: async (password) => {
    const row = await db.security.get('app');
    if (!row) return false;
    const ok = await verifyPassword(password, row.salt, row.hash, row.iterations);
    if (!ok) return false;
    sessionStorage.setItem(UNLOCK_KEY, '1');
    set({ unlocked: true });
    return true;
  },
  changePassword: async (current, next) => {
    const row = await db.security.get('app');
    if (!row) return false;
    const ok = await verifyPassword(current, row.salt, row.hash, row.iterations);
    if (!ok) return false;
    const record = await createPasswordRecord(next);
    await db.security.put({ id: 'app', ...record });
    return true;
  },
  lock: () => {
    sessionStorage.removeItem(UNLOCK_KEY);
    set({ unlocked: false });
  },
}));
