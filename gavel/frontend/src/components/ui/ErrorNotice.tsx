import { RequestError } from '../../lib/api';
export function ErrorNotice({ error }: { error: Error | null }) {
  if (!error) return null;
  return <div className="error-notice" role="alert"><p>{error.message}</p>
    {error instanceof RequestError && error.payload.details !== undefined &&
      <pre>{JSON.stringify(error.payload.details, null, 2)}</pre>}</div>;
}
