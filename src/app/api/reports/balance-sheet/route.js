import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/reports/balance-sheet?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns:
 * - totals: { totalIncome, totalExpense, netCashflow, txCount }
 * - monthly: [{ month: "2026-01", income, expense, net }]
 */
export async function GET(request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // Build date filter
    const txnDateFilter = {};
    if (from) {
      const d = new Date(`${from}T00:00:00`);
      if (!Number.isNaN(d.getTime())) txnDateFilter.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        txnDateFilter.lt = nextDay;
      }
    }

    const dateWhere = Object.keys(txnDateFilter).length
      ? { txnDate: txnDateFilter }
      : {};

    // --- Totals ---
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id, direction: "INCOME", ...dateWhere },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { userId: user.id, direction: "EXPENSE", ...dateWhere },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);
    const netCashflow = totalIncome - totalExpense;
    const txCount = (incomeAgg._count ?? 0) + (expenseAgg._count ?? 0);

    // --- Monthly breakdown (fetch + aggregate in JS) ---
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id, ...dateWhere },
      select: {
        direction: true,
        amount: true,
        txnDate: true,
      },
      orderBy: { txnDate: "asc" },
    });

    const monthMap = new Map();

    for (const tx of transactions) {
      const d = new Date(tx.txnDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { month: key, income: 0, expense: 0 });
      }
      const bucket = monthMap.get(key);
      const amt = Number(tx.amount);
      if (tx.direction === "INCOME") bucket.income += amt;
      else bucket.expense += amt;
    }

    const monthly = [...monthMap.values()]
      .map((m) => ({
        month: m.month,
        income: m.income.toFixed(2),
        expense: m.expense.toFixed(2),
        net: (m.income - m.expense).toFixed(2),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return Response.json({
      range: { from: from ?? null, to: to ?? null },
      totals: {
        totalIncome: totalIncome.toFixed(2),
        totalExpense: totalExpense.toFixed(2),
        netCashflow: netCashflow.toFixed(2),
        txCount,
      },
      monthly,
    });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
