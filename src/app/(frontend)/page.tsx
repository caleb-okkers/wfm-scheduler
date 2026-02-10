export default function HomePage() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>WFM Scheduler</h1>

      <p>
        This application demonstrates a configurable Workforce Management (WFM)
        scheduling system built with Payload CMS.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>How to use</h2>
        <ol>
          <li>
            Open the <a href="/admin">Admin UI</a> and create the first admin user.
          </li>
          <li>
            Configure <strong>Skills</strong>, <strong>Users</strong>,
            <strong> Shifts</strong>, <strong>Rule Templates</strong>, and
            <strong> Rules</strong>.
          </li>
          <li>
            Go to <strong>Schedule Runs</strong> in the Admin UI and use the
            <em> “Run Scheduler”</em> panel to generate a schedule for a date range.
          </li>
          <li>
            Review the generated schedule output directly in the
            <strong> Schedule Runs</strong> collection.
          </li>
        </ol>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Key features</h2>
        <ul>
          <li>Multiple skills per user with skill levels</li>
          <li>Hard and soft rule enforcement</li>
          <li>Configurable rules via Admin UI (no code changes)</li>
          <li>Manual scheduling trigger with persisted results</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Quick links</h2>
        <ul>
          <li>
            <a href="/admin">Admin Dashboard</a>
          </li>
          <li>
            POST <code>/api/run-schedule</code> (manual trigger)
          </li>
        </ul>
      </section>
    </main>
  )
}
