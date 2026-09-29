import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreateRoomForm } from './CreateRoomForm';
export function CreateRoomModal() {
  const [params, setParams] = useSearchParams();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const open = params.get('create') === 'room';
  function close() {
    if (busy) return;
    const next = new URLSearchParams(params); next.delete('create'); setParams(next, { replace: true });
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.showModal();
    ref.current?.querySelector<HTMLTextAreaElement>('[name="topic"]')?.focus();
    return () => { ref.current?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea'))
      .filter(el => !el.matches(':disabled') && el.getClientRects().length > 0);
    const first = fields[0], last = fields[fields.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (!open) return null;
  return <dialog className="create-room-dialog" ref={ref} onKeyDown={trapFocus} aria-labelledby="create-room-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <header className="create-dialog-header"><div><p className="eyebrow">Open a challenge</p><h1 id="create-room-title">Create a room</h1></div>
      <button type="button" className="modal-close" aria-label="Close create room" onClick={close} disabled={busy}>×</button></header>
    <CreateRoomForm onClose={close} onBusyChange={setBusy} />
  </dialog>;
}
