import { Children, isValidElement, useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';

export function Select({ label, name, defaultValue, children, disabled = false }: {
  label: string; name: string; defaultValue?: string; children: ReactNode; disabled?: boolean;
}) {
  const id = useId();
  const options = Children.toArray(children).filter(isValidElement<{ value: string; children: ReactNode }>);
  const [value, setValue] = useState(defaultValue ?? options[0]?.props.value ?? '');
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.props.value === value);
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault(); setOpen(true);
    requestAnimationFrame(() => {
      const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[index]?.focus();
    });
  }
  return <div className="field custom-select" onKeyDown={keyDown}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label id={id + '-label'} htmlFor={id}>{label}</label>
    <input type="hidden" name={name} value={value} disabled={disabled} />
    <button id={id} ref={trigger} type="button" className="select-trigger" disabled={disabled}
      aria-labelledby={id + '-label ' + id + '-value'} aria-haspopup="listbox"
      aria-expanded={open} aria-controls={id + '-options'} onClick={() => setOpen(!open)}>
      <span id={id + '-value'}>{selected?.props.children}</span><span aria-hidden="true" className="select-chevron" />
    </button>
    {open && <div id={id + '-options'} className="select-options" role="listbox" aria-labelledby={id + '-label'} ref={menu}>
      {options.map(option => <button type="button" role="option" aria-selected={value === option.props.value}
        key={option.props.value} onClick={() => { setValue(option.props.value); setOpen(false); trigger.current?.focus(); }}>
        {option.props.children}
      </button>)}
    </div>}
  </div>;
}
