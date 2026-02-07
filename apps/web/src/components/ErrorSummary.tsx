import { useEffect, useRef } from 'react';

interface ErrorSummaryProps {
  errors: { id: string; message: string }[];
}

export function ErrorSummary({ errors }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) {
      ref.current?.focus();
    }
  }, [errors]);

  if (!errors.length) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="mb-4 rounded border-2 border-base-danger bg-base-surface p-4"
      role="alert"
      aria-labelledby="error-summary-title"
    >
      <h2 id="error-summary-title" className="mb-2 text-lg font-semibold">
        Please fix the following issues
      </h2>
      <ul className="list-disc pl-6">
        {errors.map((error) => (
          <li key={error.id}>
            <a href={`#${error.id}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
