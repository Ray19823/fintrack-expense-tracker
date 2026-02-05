// src/app/page.tsx

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 40, fontWeight: 700 }}>FinTrack</h1>

      <p style={{ marginTop: 8 }}>
        ✅ Week 3: Transactions CRUD, Cursor Pagination, Summary Aggregation
      </p>

      <h2 style={{ marginTop: 24 }}>API Endpoints</h2>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <a href="/api/categories" target="_blank">
            /api/categories
          </a>
        </li>
        <li>
          <a href="/api/transactions" target="_blank">
            /api/transactions
          </a>
        </li>
        <li>
          <a href="/api/transactions?take=2" target="_blank">
            /api/transactions?take=2 (pagination)
          </a>
        </li>
        <li>
          <a href="/api/transactions/summary" target="_blank">
            /api/transactions/summary (pie chart data)
          </a>
        </li>
      </ul>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        Next: dashboard UI + category pie chart.
      </p>
    </main>
  );
}
