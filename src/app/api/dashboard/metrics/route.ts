import { prisma } from "@/lib/prisma";

function parseDateParam(s: string | null) {
  if (!s) return null;
  // Expect YYYY-MM-DD
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userEmail = url.searchParams.get("userEmail") ?? "default@fintrack.local";

    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));

    // User (temporary until auth is wired)
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const whereDate =
      from || to
        ? {
            txnDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {};

    // Income totals
    const incomeAgg = await prisma.transaction.aggregate({
      where: { userId: user.id, direction: "INCOME", ...whereDate },
      _sum: { amount: true },
      _count: true,
    });

    // Expense totals
    const expenseAgg = await prisma.transaction.aggregate({
      where: { userId: user.id, direction: "EXPENSE", ...whereDate },
      _sum: { amount: true },
      _count: true,
    });

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    const netCashflow = income - expense;

    return Response.json({
      range: {
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
      },
      metrics: {
        totalIncome: income.toFixed(2),
        totalExpense: expense.toFixed(2),
        netCashflow: netCashflow.toFixed(2),
        txCount: (incomeAgg._count ?? 0) + (expenseAgg._count ?? 0),
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}