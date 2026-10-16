import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button, inputClass } from '@/components/ui';
import { useAuth } from '@/auth/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const ready = useAuth((s) => s.ready);
  const hasPassword = useAuth((s) => s.hasPassword);
  const unlocked = useAuth((s) => s.unlocked);
  const unlock = useAuth((s) => s.unlock);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) void useAuth.getState().load();
  }, [ready]);

  if (ready && !hasPassword) return <Navigate to="/setup" replace />;
  if (ready && unlocked) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await unlock(password);
    if (!ok) {
      setError('Incorrect password');
      return;
    }
    navigate('/');
  };

  return (
    <AuthFrame>
      <form onSubmit={(event) => void submit(event)}>
        <label className="block text-[12px] leading-4 font-medium text-muted" htmlFor="password">Password</label>
        <input id="password" autoFocus type="password" className={`${inputClass} mt-1.5`} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} />
        {error ? <p className="mt-2 text-[12px] leading-4 text-danger">{error}</p> : <p className="mt-2 h-4" />}
        <Button type="submit" block>Unlock</Button>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full place-items-center bg-bg px-4">
      <div className="relative w-[400px]">
        <div
          className="pointer-events-none absolute top-0 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-8 rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--wave) 22%, transparent), transparent 68%)' }}
        />
        <div className="relative flex flex-col items-center pt-4">
          <Logo large />
          <p className="mt-2 text-[14px] leading-5 text-muted">Real-time breathing monitor</p>
        </div>
        <div className="relative mt-8 rounded-xl border border-border bg-surface p-6">{children}</div>
      </div>
    </div>
  );
}
