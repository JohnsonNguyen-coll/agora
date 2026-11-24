import { useQuery } from '@tanstack/react-query';
import type { RuntimeStatus } from '../../../../shared/src/types';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, type FormEvent } from 'react';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Field, TextArea } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { AgentPicker } from '../agents/AgentPicker';
export function CreateRoomForm({ onClose, onBusyChange }: { onClose: () => void; onBusyChange: (busy: boolean) => void }) {
  const navigate = useNavigate();
  const runtime = useQuery({ queryKey: ['runtime'], queryFn: () => api<RuntimeStatus>('/runtime'), refetchInterval: 5000 });
  const [step, setStep] = useState(0);
  const [agentReady, setAgentReady] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const mutation = useMutation({ mutationFn: (data: FormData) => api<Room>('/rooms', {
    agentProfileId: String(data.get('agentProfileId')), topic: String(data.get('topic')), durationMinutes: Number(data.get('durationMinutes')),
    side: data.get('side') as Side
  }), onSuccess: room => navigate('/app/rooms/' + room.id), onSettled: () => onBusyChange(false) });
  function changeStep(next: number) {
    if (next === 1) {
      const fields = form.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('fieldset:first-of-type input:not([type="hidden"]), fieldset:first-of-type textarea');
      for (const field of fields ?? []) if (!field.reportValidity()) return;
    }
    setStep(next);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(next ? '[role="tab"]' : '[name="topic"]')?.focus());
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!step) { changeStep(1); return; }
    if (!agentReady) return;
    onBusyChange(true); mutation.mutate(new FormData(event.currentTarget));
  }
  return <form ref={form} onSubmit={submit} onKeyDown={event => {
    if (step === 0 && event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault(); changeStep(1);
    }
  }} className="create-room-form">
    <div className="create-dialog-body">
      <ol className="create-steps" aria-label="Room setup"><li aria-current={step === 0 ? 'step' : undefined}><button type="button" disabled={mutation.isPending} onClick={() => changeStep(0)}>Match details</button></li>
        <li aria-current={step === 1 ? 'step' : undefined}><button type="button" disabled={mutation.isPending} onClick={() => changeStep(1)}>Your agent</button></li></ol>
      <p className="create-mode-note">Latch-hosted room. Using Codex or Claude? <Link to="/app/connect">Connect through MCP</Link></p>
      <fieldset hidden={step !== 0} disabled={mutation.isPending} className="create-fields"><legend className="sr-only">Match details</legend>
        <TextArea name="topic" label="Debate topic" required minLength={10} maxLength={240} rows={3}
          hint="A clear proposition that someone can support or challenge." autoFocus />
        <div className="form-row"><Field name="durationMinutes" label="Duration (minutes)" type="number" required min={1} max={60} defaultValue={5} />
          <Select label="Your side" name="side"><option value="FOR">FOR — support</option><option value="AGAINST">AGAINST — challenge</option></Select></div>
        <p className="create-context">The clock starts when both players are ready. Your topic and duration are fixed once the room opens.</p>
      </fieldset>
      <fieldset hidden={step !== 1} disabled={step !== 1 || mutation.isPending} className="create-fields"><legend className="sr-only">Your agent</legend>
        <AgentPicker onReadyChange={setAgentReady} /><p className="create-context">{runtime.data?.debateAvailable ? 'Once both players are ready, your agents exchange arguments automatically until the clock runs out.' : runtime.isPending ? 'Checking automated match availability…' : runtime.data?.reason ?? 'Match availability could not be checked. Try again before readying up.'}</p>
      </fieldset>
      <ErrorNotice error={mutation.error} />
    </div>
    <footer className="create-dialog-actions"><Button type="button" className="quiet" disabled={mutation.isPending} onClick={() => step ? changeStep(0) : onClose()}>{step ? 'Back to match details' : 'Cancel'}</Button>
      <Button type={step ? "submit" : "button"} onClick={step ? undefined : () => changeStep(1)} className="primary" disabled={mutation.isPending || (step === 1 && !agentReady)}>{!step ? 'Continue' : mutation.isPending ? 'Opening room…' : 'Create room'}</Button></footer>
  </form>;
}
