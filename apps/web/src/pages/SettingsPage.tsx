import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/auth/auth';
import { Button, Field, inputClass } from '@/components/ui';
import { allCsv, saveFile } from '@/data/download';
import { useDevice } from '@/device/useDevice';
import { useSettings } from '@/settings';
import { toast } from '@/app/toasts';

const schema = z.object({
  current: z.string().min(1, 'Enter the current password'),
  next: z.string().min(8, 'Use at least 8 characters.'),
  confirm: z.string(),
}).refine((values) => values.next === values.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

export function SettingsPage() {
  const changePassword = useAuth((s) => s.changePassword);
  const chartWindow = useSettings((s) => s.chartWindow);
  const sound = useSettings((s) => s.sound);
  const setChartWindow = useSettings((s) => s.setChartWindow);
  const setSound = useSettings((s) => s.setSound);
  const log = useDevice((s) => s.pausedLog ?? s.log);
  const paused = useDevice((s) => s.pausedLog != null);
  const setLogPaused = useDevice((s) => s.setLogPaused);
  const port = useDevice((s) => s.port);
  const zeroOffset = useDevice((s) => s.zeroOffset);
  const lineRateHz = useDevice((s) => s.lineRateHz);
  const [openLog, setOpenLog] = useState(false);
  const [storage, setStorage] = useState('Calculating');
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { current: '', next: '', confirm: '' } });

  useEffect(() => {
    void navigator.storage?.estimate().then((estimate) => {
      const used = estimate.usage ?? 0;
      setStorage(`${(used / (1024 * 1024)).toFixed(1)} MB`);
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-[880px] px-6 py-6">
      <h1 className="text-[24px] leading-8 font-semibold">Settings</h1>

      <Section title="Password">
        <form
          className="grid max-w-md gap-1"
          onSubmit={form.handleSubmit(async (values) => {
            const ok = await changePassword(values.current, values.next);
            if (!ok) {
              form.setError('current', { message: 'Incorrect password' });
              return;
            }
            form.reset();
            toast('Password changed.');
          })}
        >
          <Field label="Current password" error={form.formState.errors.current?.message}>
            <input type="password" className={inputClass} {...form.register('current')} />
          </Field>
          <Field label="New password" error={form.formState.errors.next?.message}>
            <input type="password" className={inputClass} {...form.register('next')} />
          </Field>
          <Field label="Confirm password" error={form.formState.errors.confirm?.message}>
            <input type="password" className={inputClass} {...form.register('confirm')} />
          </Field>
          <div className="mt-2">
            <Button type="submit">Change password</Button>
          </div>
          <p className="mt-3 text-[12px] leading-4 text-muted">If this password is lost, the data on this laptop cannot be unlocked.</p>
        </form>
      </Section>

      <Section title="Display">
        <div className="flex flex-wrap items-center gap-6">
          <label className="block text-[14px]">
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Default chart window</span>
            <select className={`${inputClass} w-40`} value={chartWindow} onChange={(event) => setChartWindow(event.target.value === '60' ? 60 : 30)}>
              <option value={30}>30 s</option>
              <option value={60}>60 s</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-[14px]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={sound} onChange={(event) => setSound(event.target.checked)} />
            Alert sound
          </label>
        </div>
      </Section>

      <Section title="Device">
        <dl className="grid grid-cols-[180px_1fr] gap-y-2 text-[14px]">
          <dt className="text-muted">Port</dt>
          <dd className="mono">{port}</dd>
          <dt className="text-muted">Zero offset</dt>
          <dd className="tabular">{zeroOffset}</dd>
          <dt className="text-muted">Measured line rate</dt>
          <dd className="tabular">{lineRateHz.toFixed(1)} Hz</dd>
        </dl>
        <button type="button" className="mt-4 text-[14px] text-primary" onClick={() => setOpenLog((value) => !value)}>
          {openLog ? 'Hide device log' : 'Device log'}
        </button>
        {openLog ? (
          <div className="mt-3">
            <div className="mb-2 flex gap-2">
              <Button variant="secondary" onClick={() => setLogPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</Button>
              <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(log.join('\n')).then(() => toast('Device log copied.'))}>Copy</Button>
            </div>
            <pre className="mono max-h-72 overflow-auto rounded-lg border border-border bg-surface-raised p-3 text-[12px] leading-5 text-muted">
              {log.length ? log.join('\n') : 'No lines received yet.'}
            </pre>
          </div>
        ) : null}
      </Section>

      <Section title="Data">
        <p className="text-[14px]">Storage used <span className="tabular">{storage}</span></p>
        <Button className="mt-4" variant="secondary" onClick={() => void allCsv().then((file) => saveFile(file.name, file.body))}>
          Download all sessions (CSV)
        </Button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="text-[16px] leading-6 font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
