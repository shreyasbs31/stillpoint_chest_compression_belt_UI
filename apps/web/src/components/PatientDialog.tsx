import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/data/db';
import { createId } from '@/data/ids';
import type { Patient } from '@/data/types';
import { Button, Field, Modal, inputClass } from './ui';

const schema = z.object({
  patientId: z.string().trim().min(1, 'Patient ID is required'),
  name: z.string().trim().min(1, 'Full name is required'),
  age: z.string().trim().refine((value) => {
    if (!value) return true;
    const age = Number(value);
    return Number.isInteger(age) && age >= 0 && age <= 120;
  }, 'Enter an age from 0 to 120'),
  sex: z.enum(['', 'Female', 'Male', 'Other']),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function PatientDialog({
  open,
  patient,
  onClose,
  onSaved,
}: {
  open: boolean;
  patient?: Patient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { patientId: '', name: '', age: '', sex: '', notes: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      patientId: patient?.patientId ?? '',
      name: patient?.name ?? '',
      age: patient?.age != null ? String(patient.age) : '',
      sex: patient?.sex ?? '',
      notes: patient?.notes ?? '',
    });
  }, [open, patient, form]);

  const submit = form.handleSubmit(async (values) => {
    const existing = await db.patients.where('patientId').equals(values.patientId).first();
    if (existing && existing.id !== patient?.id) {
      form.setError('patientId', { message: 'A patient with this ID already exists.' });
      return;
    }
    const now = new Date().toISOString();
    const next: Patient = {
      id: patient?.id ?? createId(),
      patientId: values.patientId,
      name: values.name,
      age: values.age ? Number(values.age) : undefined,
      sex: values.sex || undefined,
      notes: values.notes.trim() || undefined,
      createdAt: patient?.createdAt ?? now,
      updatedAt: now,
    };
    await db.patients.put(next);
    onSaved();
    onClose();
  });

  return (
    <Modal open={open} onClose={onClose} title={patient ? 'Edit patient' : 'New patient'}>
      <form onSubmit={submit} className="grid gap-1">
        <Field label="Patient ID" error={form.formState.errors.patientId?.message}>
          <input className={inputClass} autoFocus {...form.register('patientId')} />
        </Field>
        <Field label="Full name" error={form.formState.errors.name?.message}>
          <input className={inputClass} {...form.register('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age" error={form.formState.errors.age?.message}>
            <input className={inputClass} inputMode="numeric" placeholder="Years" {...form.register('age')} />
          </Field>
          <Field label="Sex" error={form.formState.errors.sex?.message}>
            <select className={inputClass} {...form.register('sex')}>
              <option value="">Not recorded</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </Field>
        </div>
        <Field label="Notes" error={form.formState.errors.notes?.message}>
          <textarea className={`${inputClass} h-20 resize-none py-2`} placeholder="Breathing observations" {...form.register('notes')} />
        </Field>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
