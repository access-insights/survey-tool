export function UserGuidePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl">User guide</h1>
      <p>Use this guide to create and launch surveys quickly.</p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Open Dashboard and select New survey.</li>
        <li>Enter title and setup text fields.</li>
        <li>Add or edit questions, then save draft.</li>
        <li>Use Preview draft survey to verify question flow.</li>
        <li>Publish, then create survey link for participants.</li>
        <li>Review responses in Reports and export CSV as needed.</li>
      </ol>
    </section>
  );
}
