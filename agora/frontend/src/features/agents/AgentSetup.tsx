import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentProfile } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { ParticipantFields, participantValues } from '../room/ParticipantFields';
import { ErrorNotice } from '../../components/ui/ErrorNotice';
import { Button } from '../../components/ui/Button';
import { useAgentProfiles } from './useAgentProfiles';

export function AgentSetup({ profile, onSaved, onCancel }: {
  profile?: AgentProfile; onSaved: (profile: AgentProfile) => void; onCancel?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  const { key } = useAgentProfiles();
  const save = useMutation({
    mutationFn: (data: FormData) => {
      const values = participantValues(data);
      const input = { ...values, latchToken: values.latchToken || undefined };
      return api<AgentProfile>('/agent-profiles' + (profile ? '/' + profile.id : ''), input);
    },
    onSuccess: saved => {
      client.setQueryData<{ profiles: AgentProfile[] }>(key, previous => ({
        profiles: [saved, ...(previous?.profiles ?? []).filter(item => item.id !== saved.id)]
      }));
      void client.invalidateQueries({ queryKey: key });
      onSaved(saved);
    }
  });
  function submit() {
    const fields = container.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]');
    const data = new FormData();
    for (const field of fields ?? []) {
      if (!field.reportValidity()) return;
      data.set(field.name, field.value);
    }
    save.mutate(data);
  }
  return <div ref={container} className="agent-setup">
    <fieldset disabled={save.isPending} className="agent-setup-fields"><ParticipantFields profile={profile} /></fieldset>
    <ErrorNotice error={save.error} />
    <div className="agent-setup-actions">{onCancel && <Button type="button" className="quiet" disabled={save.isPending} onClick={onCancel}>Cancel</Button>}
      <Button type="button" className="primary" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving…' : profile ? 'Save changes' : 'Save agent'}</Button></div>
    <p className="field-hint">Your Latch token and strategy are encrypted. Saved agents belong to your Agora account.</p>
  </div>;
}
