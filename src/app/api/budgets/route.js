import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

function parseMonthStart(value) {
  const raw = String(value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;

  return d;
}

export async function GET(req) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const monthStartRaw = url.searchParams.get("monthStart");

    const where = { userId: user.id };

    if (monthStartRaw) {
      const monthStart = parseMonthStart(monthStartRaw);
      if (!monthStart) {
        return Response.json(
          { error: "monthStart must be YYYY-MM-DD" },
          { status: 400 },
        );
      }
      where.monthStart = monthStart;
    }

    const budgets = await prisma.budget.findMany({
      where,
      select: {
        id: true,
        monthStart: true,
        limitAmount: true,
        category: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ monthStart: "desc" }, { category: { name: "asc" } }],
    });

    return Response.json({ budgets });
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const categoryId = String(body.categoryId ?? "").trim();
    const monthStart = parseMonthStart(body.monthStart);
    const limitAmount = Number.parseFloat(String(body.limitAmount ?? ""));

    if (!categoryId) {
      return Response.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    if (!monthStart) {
      return Response.json(
        { error: "monthStart must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      return Response.json(
        { error: "limitAmount must be a positive number" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId },
      select: { id: true, type: true },
    });

    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.type !== "EXPENSE") {
      return Response.json(
        { error: "Budgets can only be created for EXPENSE categories" },
        { status: 400 },
      );
    }

    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId,
        monthStart,
        limitAmount: limitAmount.toFixed(2),
      },
      select: {
        id: true,
        monthStart: true,
        limitAmount: true,
        category: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return Response.json({ budget }, { status: 201 });
  } catch (err) {
    console.error(err);

    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (err?.code === "P2002") {
      return Response.json(
        { error: "Budget already exists for this category and month" },
        { status: 409 },
      );
    }

    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const budgetId = String(body.budgetId ?? "").trim();
    const limitAmount = Number.parseFloat(String(body.limitAmount ?? ""));

    if (!budgetId) {
      return Response.json({ error: "budgetId is required" }, { status: 400 });
    }

    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      return Response.json(
        { error: "limitAmount must be a positive number" },
        { status: 400 },
      );
    }

    const existing = await prisma.budget.findFirst({
      where: { id: budgetId, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Budget not found" }, { status: 404 });
    }

    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data: { limitAmount: limitAmount.toFixed(2) },
      select: {
        id: true,
        monthStart: true,
        limitAmount: true,
        category: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return Response.json({ budget });
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const budgetId = String(body.budgetId ?? "").trim();

    if (!budgetId) {
      return Response.json({ error: "budgetId is required" }, { status: 400 });
    }

    const deleted = await prisma.budget.deleteMany({
      where: {
        id: budgetId,
        userId: user.id,
      },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Budget not found" }, { status: 404 });
    }

    return Response.json({ success: true, deletedCount: deleted.count });
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
