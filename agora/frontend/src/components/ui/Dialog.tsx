import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Button } from './Button';
export function Dialog({ open, onClose, title, children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close(); }, [open]);
  return <dialog ref={ref} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-label={title}>
    <div className="dialog-heading"><h2>{title}</h2><Button className="quiet" onClick={onClose}>Close</Button></div>{children}
  </dialog>;
}
