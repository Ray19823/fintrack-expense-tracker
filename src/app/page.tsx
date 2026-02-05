// src/app/page.tsx

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h1>FinTrack</h1>

      <p>Week 3: Aggregation API + Pie Chart Dashboard ✅</p>

      <ul>
        <li>
          <a href="/api/categories">/api/categories</a>
        </li>
        <li>
          <a href="/api/transactions">/api/transactions</a>
        </li>
        <li>
          <a href="/api/transactions/summary">/api/transactions/summary</a>
        </li>
        <li>
          <a href="/dashboard">/dashboard</a>
        </li>
      </ul>
    </main>
  );
}