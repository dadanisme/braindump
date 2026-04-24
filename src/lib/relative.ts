export function formatRelativeDeadline(iso: string): string {
  const now = new Date();
  const target = new Date(iso);
  const dayMs = 1000 * 60 * 60 * 24;
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(target) - startOf(now)) / dayMs);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 0) return `in ${diffDays}d`;
  return `overdue ${Math.abs(diffDays)}d`;
}
