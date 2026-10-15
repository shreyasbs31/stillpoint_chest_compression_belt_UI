import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { PatientDialog } from '@/components/PatientDialog';
import { Button, EmptyState, buttonClass, inputClass } from '@/components/ui';
import { db } from '@/data/db';
import { formatWhen } from '@/data/ids';
import type { Patient, Session } from '@/data/types';

export function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [nextPatients, nextSessions] = await Promise.all([db.patients.toArray(), db.sessions.toArray()]);
    setPatients(nextPatients.sort((a, b) => a.name.localeCompare(b.name)));
    setSessions(nextSessions);
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((patient) => !q || patient.patientId.toLowerCase().includes(q) || patient.name.toLowerCase().includes(q));
  }, [patients, query]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-[24px] leading-8 font-semibold">Patients</h1>
        <span className="text-[14px] text-muted tabular">{patients.length}</span>
        <div className="ml-auto flex items-center gap-3">
          <label className="relative">
            <Search size={16} strokeWidth={1.5} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input className={`${inputClass} w-[280px] pl-9`} placeholder="Search ID or name" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Button onClick={() => setOpen(true)}>New patient</Button>
        </div>
      </header>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        {patients.length === 0 ? (
          <EmptyState icon={Users} title="No patients yet" action={<Button onClick={() => setOpen(true)}>New patient</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} title="No patients match this search." />
        ) : (
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="sticky top-0 bg-surface-raised text-[12px] leading-4 font-medium tracking-[0.06em] text-muted uppercase">
              <tr>
                {['Patient ID', 'Name', 'Age', 'Sex', 'Sessions', 'Last session', ''].map((heading) => (
                  <th key={heading} className="h-12 px-4 font-medium whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((patient) => {
                const own = sessions.filter((session) => session.patientRef === patient.id && session.endedAt);
                const last = [...own].sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1))[0];
                return (
                  <tr key={patient.id} className="cursor-pointer border-t border-border hover:bg-surface-raised" onClick={() => navigate(`/patients/${patient.id}`)}>
                    <td className="h-12 px-4"><span className="mono text-[13px]">{patient.patientId}</span></td>
                    <td className="px-4 whitespace-nowrap">{patient.name}</td>
                    <td className="px-4 tabular">{patient.age ?? ''}</td>
                    <td className="px-4">{patient.sex ?? ''}</td>
                    <td className="px-4 tabular">{own.length}</td>
                    <td className="px-4 text-muted">{last ? formatWhen(last.startedAt) : 'None'}</td>
                    <td className="px-4 text-right">
                      <button type="button" className={buttonClass('secondary')} onClick={(event) => { event.stopPropagation(); navigate(`/live/${patient.id}`); }}>
                        Start session
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <PatientDialog open={open} onClose={() => setOpen(false)} onSaved={() => void load()} />
    </div>
  );
}
