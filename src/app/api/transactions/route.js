import { prisma } from "@/lib/prisma";

// GET /api/transactions
export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: "default@fintrack.local" },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "Default user not found" }, { status: 500 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        createdAt: true,
        category: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return Response.json({ transactions });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      userEmail = "default@fintrack.local",
      categoryId,
      direction,
      amount,
      txnDate,
      description,
    } = body ?? {};

    // ---- Basic validation ----
    if (!userEmail || typeof userEmail !== "string") {
      return Response.json({ error: "userEmail is required" }, { status: 400 });
    }

    if (!categoryId || typeof categoryId !== "string") {
      return Response.json({ error: "categoryId is required" }, { status: 400 });
    }

    if (direction !== "INCOME" && direction !== "EXPENSE") {
      return Response.json(
        { error: "direction must be INCOME or EXPENSE" },
        { status: 400 }
      );
    }

    const parsedAmount =
      typeof amount === "number" ? amount : Number.parseFloat(String(amount));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return Response.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    // txnDate: expect "YYYY-MM-DD"
    if (!txnDate || typeof txnDate !== "string") {
      return Response.json(
        { error: "txnDate is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const dateObj = new Date(`${txnDate}T00:00:00.000Z`);
    if (Number.isNaN(dateObj.getTime())) {
      return Response.json(
        { error: "txnDate must be a valid date string (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // ---- Resolve user (temporary approach until auth exists) ----
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // ---- Ensure category belongs to this user ----
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id },
      select: { id: true },
    });

    if (!category) {
      return Response.json(
        { error: "Category not found for this user" },
        { status: 404 }
      );
    }

    // ---- Create transaction ----
    const created = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        direction,
        amount: parsedAmount.toFixed(2), // Prisma Decimal accepts string
        txnDate: dateObj,
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
      },
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        createdAt: true,
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return Response.json({ transaction: created }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
