import { create } from 'zustand';

export interface DisplaySettings {
  chartWindow: 30 | 60;
  sound: boolean;
}

const KEY = 'stillpoint-display';

function read(): DisplaySettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '') as Partial<DisplaySettings>;
    return {
      chartWindow: parsed.chartWindow === 60 ? 60 : 30,
      sound: parsed.sound !== false,
    };
  } catch {
    return { chartWindow: 30, sound: true };
  }
}

interface SettingsState extends DisplaySettings {
  setChartWindow: (chartWindow: 30 | 60) => void;
  setSound: (sound: boolean) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...read(),
  setChartWindow: (chartWindow) => {
    const next = { chartWindow, sound: get().sound };
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ chartWindow });
  },
  setSound: (sound) => {
    const next = { chartWindow: get().chartWindow, sound };
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ sound });
  },
}));
