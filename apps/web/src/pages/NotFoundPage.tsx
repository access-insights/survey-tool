import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className="target-size rounded border border-base-border px-3 py-2" to="/">
        Return home
      </Link>
    </section>
  );
}
