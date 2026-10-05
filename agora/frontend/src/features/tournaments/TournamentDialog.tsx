import { useEffect, useRef, type PropsWithChildren } from 'react';
export function TournamentDialog({ title, open, busy = false, close, children }: PropsWithChildren<{ title: string; open: boolean; busy?: boolean; close: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; ref.current?.showModal(); ref.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => { ref.current?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return <dialog ref={ref} className="create-room-dialog tournament-dialog" aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) close(); }}>
    <header className="create-dialog-header"><div><p className="eyebrow">Agora tournaments</p><h2>{title}</h2></div><button type="button" className="modal-close" aria-label={'Close ' + title.toLowerCase()} disabled={busy} onClick={close}>×</button></header>{children}
  </dialog>;
}