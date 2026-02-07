interface ProgressProps {
  completed: number;
  total: number;
}

export function Progress({ completed, total }: ProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div aria-live="polite" className="mb-4">
      <p className="mb-1 text-sm">
        Progress: {completed} of {total} answered ({percent}%)
      </p>
      <div className="h-3 w-full rounded bg-base-border" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-3 rounded bg-base-action" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
