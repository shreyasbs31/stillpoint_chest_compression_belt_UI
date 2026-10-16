import { create } from 'zustand';

const UNLOCK_KEY = 'stillpoint-unlocked';
const APP_PASSWORD = 'stillpoint';

interface AuthState {
  ready: boolean;
  hasPassword: boolean;
  unlocked: boolean;
  load: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  hasPassword: false,
  unlocked: false,
  load: async () => {
    set({ ready: true, hasPassword: true, unlocked: sessionStorage.getItem(UNLOCK_KEY) === '1' });
  },
  unlock: async (password) => {
    if (password !== APP_PASSWORD) return false;
    sessionStorage.setItem(UNLOCK_KEY, '1');
    set({ unlocked: true });
    return true;
  },
  lock: () => {
    sessionStorage.removeItem(UNLOCK_KEY);
    set({ unlocked: false });
  },
}));
