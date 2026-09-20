import { useId, type SelectHTMLAttributes } from 'react';
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} {...props}>{children}</select></div>;
}
