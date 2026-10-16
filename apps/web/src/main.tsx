import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import { App } from './App';
import { useDevice } from './device/useDevice';
import './styles/globals.css';
import 'uplot/dist/uPlot.min.css';

if (import.meta.env.DEV) {
  void import('./device/preview').then(({ seedPreview }) => {
    Object.assign(window, { __stillpoint: { seedPreview, ingest: (line: string) => useDevice.getState().ingest(line) } });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
