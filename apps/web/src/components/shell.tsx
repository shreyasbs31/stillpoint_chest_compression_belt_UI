import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Logo } from './Logo';
import { Button, DeviceChip } from './ui';
import { useAuth } from '@/auth/auth';
import { useToasts } from '@/app/toasts';
import { deviceConfig } from '@/device/device.config';
import { toast } from '@/app/toasts';
import { flushRecording, topAlert, useDevice } from '@/device/useDevice';
import { useSettings } from '@/settings';

export function Shell() {
  useAutoLock();
  useAlertTone();
  const location = useLocation();
  const navigate = useNavigate();
  const lock = useAuth((s) => s.lock);
  const status = useDevice((s) => s.status);
  const recording = useDevice((s) => s.recording);
  const confirmed = useDevice((s) => s.emptyConfirmed);
  const connect = useDevice((s) => s.connect);
  const disconnect = useDevice((s) => s.disconnect);
  const alert = useDevice((s) => topAlert(s.alerts));
  const acknowledge = useDevice((s) => s.acknowledge);
  const onLive = location.pathname.startsWith('/live');

  useEffect(() => {
    const onHide = () => void flushRecording();
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!useDevice.getState().recording) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-border bg-surface px-4">
        <Link to="/" className="rounded-lg" aria-label="Stillpoint">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          <NavItem to="/" label="Patients" active={location.pathname === '/' || location.pathname.startsWith('/patients') || location.pathname.startsWith('/live') || location.pathname.startsWith('/sessions')} />
          <NavItem to="/settings" label="Settings" active={location.pathname.startsWith('/settings')} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DeviceChip status={status} />
          {status === 'connected' || status === 'starting' ? (
            <Button variant="secondary" onClick={() => void disconnect()}>Disconnect</Button>
          ) : (
            <Button variant="secondary" disabled={!onLive || !confirmed} title={confirmed ? 'Connect' : 'Confirm the bladder is empty on the live screen'} onClick={() => void connect()}>
              Connect
            </Button>
          )}
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-raised disabled:opacity-40"
            aria-label="Lock"
            title={recording ? 'Lock is unavailable while recording' : 'Lock'}
            disabled={recording}
            onClick={() => {
              if (useDevice.getState().ready && useDevice.getState().state !== 'IDLE') {
                toast('Deflate the belt before locking.');
                return;
              }
              lock();
              navigate('/login');
            }}
          >
            <Lock size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      {alert ? (
        <div
          className="flex shrink-0 items-center gap-3 px-4 py-2.5"
          style={{ background: alert.level === 'critical' ? 'var(--danger-solid)' : 'var(--warn)', color: alert.level === 'critical' ? 'var(--text)' : 'var(--bg)' }}
        >
          <p className="min-w-0 flex-1 text-[14px] leading-5">{alert.message}</p>
          <button type="button" className="h-8 shrink-0 rounded-lg border border-current px-3 text-[13px] font-medium" onClick={() => acknowledge(alert.id)}>
            Acknowledge
          </button>
        </div>
      ) : null}
      <main className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-auto">
          <Outlet />
        </div>
      </main>
      <Toasts />
    </div>
  );
}

function NavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link to={to} className={`rounded-lg px-3 py-2 text-[14px] leading-5 ${active ? 'text-text' : 'text-muted hover:text-text'}`}>
      {label}
    </Link>
  );
}

function Toasts() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[320px] flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto rounded-xl border border-border bg-surface px-4 py-3 text-[14px] leading-5 shadow-[var(--shadow)]">
          {item.message}
        </div>
      ))}
    </div>
  );
}

function useAutoLock() {
  const lock = useAuth((s) => s.lock);
  const navigate = useNavigate();
  useEffect(() => {
    let last = Date.now();
    const mark = () => { last = Date.now(); };
    const id = window.setInterval(() => {
      if (useDevice.getState().recording) return;
      if (Date.now() - last < 15 * 60 * 1000) return;
      lock();
      navigate('/login');
    }, 5000);
    window.addEventListener('pointerdown', mark);
    window.addEventListener('keydown', mark);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
    };
  }, [lock, navigate]);
}

function useAlertTone() {
  const alert = useDevice((s) => topAlert(s.alerts));
  const sound = useSettings((s) => s.sound);
  const warned = useRef<string | null>(null);
  useEffect(() => {
    if (!alert || !sound) return;
    if (alert.level === 'warning') {
      if (warned.current === alert.id) return;
      warned.current = alert.id;
      beep();
      return;
    }
    beep();
    const id = window.setInterval(beep, deviceConfig.alertRepeatMs);
    return () => window.clearInterval(id);
  }, [alert, sound]);
}

function beep() {
  const context = new AudioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = 740;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.03, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.17);
  osc.onended = () => void context.close();
}
