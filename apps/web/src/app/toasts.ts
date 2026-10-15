import { create } from 'zustand';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push: (message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push: (message) => {
    const id = nextId++;
    set({ items: [...get().items, { id, message }].slice(-4) });
    window.setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ items: get().items.filter((item) => item.id !== id) }),
}));

export function toast(message: string) {
  useToasts.getState().push(message);
}
