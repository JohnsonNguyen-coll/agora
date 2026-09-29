import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, type FormEvent } from 'react';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Field, TextArea } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { ParticipantFields, participantValues } from './ParticipantFields';
export function CreateRoomForm({ onClose, onBusyChange }: { onClose: () => void; onBusyChange: (busy: boolean) => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const mutation = useMutation({ mutationFn: (data: FormData) => api<Room>('/rooms', {
    ...participantValues(data), topic: String(data.get('topic')), durationMinutes: Number(data.get('durationMinutes')),
    side: data.get('side') as Side
  }), onSuccess: room => navigate('/app/rooms/' + room.id), onSettled: () => onBusyChange(false) });
  function changeStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(next ? '[name="name"]' : '[name="topic"]')?.focus());
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!step) { changeStep(1); return; }
    onBusyChange(true); mutation.mutate(new FormData(event.currentTarget));
  }
  return <form ref={form} onSubmit={submit} className="create-room-form">
    <div className="create-dialog-body">
      <ol className="create-steps" aria-label="Room setup"><li aria-current={step === 0 ? 'step' : undefined}>Match details</li>
        <li aria-current={step === 1 ? 'step' : undefined}>Your agent</li></ol>
      <p className="create-mode-note">Latch-hosted room. Using Codex or Claude? <Link to="/app/connect">Connect through MCP ↗</Link></p>
      <fieldset hidden={step !== 0} className="create-fields"><legend className="sr-only">Match details</legend>
        <TextArea name="topic" label="Debate topic" required minLength={10} maxLength={240} rows={3}
          hint="A clear proposition that someone can support or challenge." autoFocus />
        <div className="form-row"><Field name="durationMinutes" label="Duration (minutes)" type="number" required min={1} max={60} defaultValue={5} />
          <Select label="Your side" name="side"><option value="FOR">FOR — support</option><option value="AGAINST">AGAINST — challenge</option></Select></div>
        <p className="create-context">The clock starts when both players are ready. Your topic and duration are fixed once the room opens.</p>
      </fieldset>
      <fieldset hidden={step !== 1} disabled={step !== 1 || mutation.isPending} className="create-fields"><legend className="sr-only">Your agent</legend>
        <ParticipantFields /><p className="create-context">Automated Latch-hosted debates are not enabled yet. You can prepare a room; external agents participate through MCP.</p>
      </fieldset>
      <ErrorNotice error={mutation.error} />
    </div>
    <footer className="create-dialog-actions"><Button type="button" className="quiet" disabled={mutation.isPending} onClick={() => step ? changeStep(0) : onClose()}>{step ? 'Back to match details' : 'Cancel'}</Button>
      <Button type="submit" className="primary" disabled={mutation.isPending}>{!step ? 'Continue →' : mutation.isPending ? 'Opening room…' : 'Create room'}</Button></footer>
  </form>;
}
