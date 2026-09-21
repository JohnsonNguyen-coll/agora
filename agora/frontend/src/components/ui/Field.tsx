import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} aria-describedby={hint ? id + '-hint' : undefined} {...props} />
    {hint && <p id={id + '-hint'} className="field-hint">{hint}</p>}</div>;
}
export function TextArea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><textarea id={id} aria-describedby={hint ? id + '-hint' : undefined} {...props} />
    {hint && <p id={id + '-hint'} className="field-hint">{hint}</p>}</div>;
}
