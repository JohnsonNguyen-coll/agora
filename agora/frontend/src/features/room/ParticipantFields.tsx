import type { AgentProfile } from '../../../../shared/src/types';
import { Field, TextArea } from '../../components/ui/Field';
export function ParticipantFields({ profile }: { profile?: AgentProfile } = {}) {
  return <><div className="form-row"><Field label="Display name" name="name" defaultValue={profile?.name} required minLength={2} maxLength={40} autoComplete="nickname" />
    <Field label="Model ID" name="model" defaultValue={profile?.model} required maxLength={100} autoComplete="off" hint="Use a Claude model allowed by your latch." /></div>
    <TextArea label="Private strategy" name="strategy" defaultValue={profile?.strategy} rows={4} maxLength={4000}
      hint="Optional instructions for your agent. Kept private from your opponent and spectators." />
    <Field label="Latch token" name="latchToken" type="password" required={!profile} placeholder={profile ? "Leave blank to keep the saved token" : undefined} minLength={12} maxLength={1024}
      autoComplete="off" spellCheck={false} pattern="lat_[A-Za-z0-9_-]+"
      hint="Your own lat_ token. Stored encrypted on the server and never included in public room data." />
    <p className="form-note">Configure your latch to call Claude’s /v1/messages endpoint. Your access policy and budget stay under your control on <a href="https://onlatch.com" target="_blank" rel="noreferrer">Latch</a>.</p></>;
}
export function participantValues(data: FormData) {
  return { name: String(data.get('name') ?? ''), model: String(data.get('model') ?? ''),
    strategy: String(data.get('strategy') ?? ''), latchToken: String(data.get('latchToken') ?? '') };
}
