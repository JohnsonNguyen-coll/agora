export function responseWindow(startsAt: string, endsAt: string, lastAt: string | null, lastIndex: number, seconds: number, extension = 0) {
  const due = Date.parse(lastAt ?? startsAt) + seconds*1000 + extension;
  return due < Date.parse(endsAt) ? { at: new Date(due).toISOString(), side: (lastIndex+1)%2===0 ? 'FOR' as const : 'AGAINST' as const } : null;
}