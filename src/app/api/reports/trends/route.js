import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/reports/trends?months=12
 *
 * Returns monthly income, expense, and net cashflow for the last N months.
 * Useful for line/bar chart historical trends.
 */
export async function GET(request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);

    const monthsParam = url.searchParams.get("months");
    const months = Math.min(60, Math.max(1, Number(monthsParam) || 12));

    // Calculate the start date (first day of N months ago)
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months + 1,
      1,
    );

    // Fetch all transactions from startDate onwards
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        txnDate: { gte: startDate },
      },
      select: {
        direction: true,
        amount: true,
        txnDate: true,
      },
      orderBy: { txnDate: "asc" },
    });

    // Aggregate by month in JS
    const monthMap = new Map();

    // Pre-fill all months so we get zeros for empty months
    for (let i = 0; i < months; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { month: key, income: 0, expense: 0, count: 0 });
    }

    for (const tx of transactions) {
      const d = new Date(tx.txnDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthMap.get(key);
      if (!bucket) continue; // outside range
      const amt = Number(tx.amount);
      if (tx.direction === "INCOME") bucket.income += amt;
      else bucket.expense += amt;
      bucket.count++;
    }

    let cumulative = 0;
    const data = [...monthMap.values()].map((m) => {
      const net = m.income - m.expense;
      cumulative += net;
      return {
        month: m.month,
        income: m.income.toFixed(2),
        expense: m.expense.toFixed(2),
        net: net.toFixed(2),
        netWorth: cumulative.toFixed(2),
        txCount: m.count,
      };
    });

    return Response.json({
      months,
      startDate: startDate.toISOString().slice(0, 10),
      data,
    });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
