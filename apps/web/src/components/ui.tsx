import type { ButtonHTMLAttributes, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { LucideIcon } from 'lucide-react';
import type { DeviceState } from '@/data/types';
import type { LinkStatus } from '@/device/useDevice';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'live';

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', block = false) {
  const height = size === 'live' ? 'h-12 px-3' : 'h-10 px-3';
  const look = {
    primary: 'bg-primary text-[var(--bg)] hover:bg-primary-hover',
    secondary: 'border border-border-strong bg-transparent text-text hover:bg-surface-raised',
    danger: 'bg-danger-solid text-text hover:brightness-110',
    ghost: 'bg-transparent text-text hover:bg-surface-raised',
  }[variant];
  return `${height} ${block ? 'w-full' : ''} inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-[14px] leading-5 font-medium transition-colors duration-150 ease-out disabled:opacity-40 ${look}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; block?: boolean }) {
  return <button type={type} className={`${buttonClass(variant, size, block)} ${className}`} {...props} />;
}

export const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-raised px-3 text-[14px] leading-5 outline-none placeholder:text-faint';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] leading-4 font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] leading-4 text-danger">{error}</span> : <span className="mt-1 block h-4" />}
    </label>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <Dialog.Title className="text-[16px] leading-6 font-semibold">{title}</Dialog.Title>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function EmptyState({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <Icon size={28} strokeWidth={1.5} className="text-faint" />
      <p className="max-w-sm text-muted">{title}</p>
      {action}
    </div>
  );
}

const STATE_LOOK: Record<DeviceState, { label: string; color: string }> = {
  IDLE: { label: 'IDLE', color: 'var(--idle)' },
  INFLATE: { label: 'INFLATING', color: 'var(--warn)' },
  HOLD: { label: 'HOLDING', color: 'var(--ok)' },
  DEFLATE: { label: 'DEFLATING', color: 'var(--pressure)' },
};

export function StatePill({ state }: { state: DeviceState }) {
  const look = STATE_LOOK[state];
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-surface-raised px-2.5 text-[11px] leading-[14px] font-medium tracking-[0.06em]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: look.color }} />
      <span style={{ color: look.color }}>{look.label}</span>
    </span>
  );
}

const LINK_LOOK: Record<LinkStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'Not connected', color: 'var(--idle)' },
  starting: { label: 'Starting', color: 'var(--warn)', pulse: true },
  connected: { label: 'Connected', color: 'var(--ok)' },
  disconnected: { label: 'Disconnected', color: 'var(--danger)' },
};

export function DeviceChip({ status }: { status: LinkStatus }) {
  const look = LINK_LOOK[status];
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-[12px] leading-4 font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${look.pulse ? 'pulse-dot' : ''}`} style={{ background: look.color }} />
      {look.label}
    </span>
  );
}
