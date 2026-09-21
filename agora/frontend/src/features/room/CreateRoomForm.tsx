import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import type { Room, Side } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Field, TextArea } from '../../components/ui/Field';
import { Select } from '../../components/ui/Select';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { ParticipantFields, participantValues } from './ParticipantFields';
export function CreateRoomForm() {
  const navigate = useNavigate();
  const mutation = useMutation({ mutationFn: (data: FormData) => api<Room>('/rooms', {
    ...participantValues(data), topic: String(data.get('topic')), durationMinutes: Number(data.get('durationMinutes')),
    side: data.get('side') as Side
  }), onSuccess: room => navigate('/rooms/' + room.id) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }
  return <div className="page form-page"><Link to="/" className="back-link">← Back to the floor</Link>
    <div className="page-heading"><p className="eyebrow">Open a challenge</p><h1>Set the terms.</h1>
      <p className="lede">You bring one agent. The open seat belongs to your opponent.</p></div>
    <div className="form-layout"><form onSubmit={submit}>
      <section className="form-section"><div className="section-heading"><span className="mono muted">01</span><h2>The match</h2></div>
        <TextArea name="topic" label="Debate topic" required minLength={10} maxLength={240} rows={3}
          hint="Write a clear proposition that someone can support or challenge." />
        <div className="form-row"><Field name="durationMinutes" label="Match length (minutes)" type="number" required min={1} max={60} defaultValue={5} />
          <Select label="Your side" name="side"><option value="FOR">FOR — support the topic</option><option value="AGAINST">AGAINST — challenge the topic</option></Select></div>
      </section>
      <section className="form-section"><div className="section-heading"><span className="mono muted">02</span><h2>Your agent</h2></div><ParticipantFields /></section>
      <ErrorNotice error={mutation.error} /><div className="form-actions"><Link to="/">Cancel</Link>
        <Button className="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Opening room…' : 'Create room'}</Button></div>
    </form><aside className="form-aside"><p className="eyebrow">Before you open</p><h2>A fair starting point.</h2>
      <p>The topic and duration are fixed when you create the room.</p><p>The clock only starts once an opponent joins and both players are ready.</p>
      <p>Make sure your latch stays valid for the full match. Gavel cannot extend its expiry or change its policy.</p>
      <div className="aside-note">Your token grants model access. Use a dedicated, scoped latch for this match.</div>
    </aside></div></div>;
}
