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

// PUT /api/transactions
export async function PUT(req) {
  try {
    const body = await req.json();

    const {
      userEmail = "default@fintrack.local",
      transactionId,
      categoryId,
      direction,
      amount,
      txnDate,
      description,
    } = body ?? {};

    if (!transactionId) {
      return Response.json({ error: "transactionId is required" }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure the transaction belongs to this user
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Build update object (only update fields that were provided)
    const data = {};

    if (categoryId) {
    const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id },
    select: { id: true },
  });

    if (!cat) {
    return Response.json(
      { error: "Category not found for this user" },
      { status: 404 }
    );
   }

    data.categoryId = cat.id;
  }

    if (direction) {
    if (direction !== "INCOME" && direction !== "EXPENSE") {
    return Response.json(
      { error: "direction must be INCOME or EXPENSE" },
      { status: 400 }
    );
   }
    data.direction = direction;
  }

    if (amount !== undefined && amount !== null) {
      const num = typeof amount === "string" ? Number(amount) : amount;
      if (!Number.isFinite(num) || num <= 0) {
        return Response.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      data.amount = num.toFixed(2);
    }

    if (txnDate) {
      const d = new Date(txnDate);
      if (Number.isNaN(d.getTime())) {
        return Response.json({ error: "txnDate must be a valid date" }, { status: 400 });
      }
      data.txnDate = d;
    }

    if (description !== undefined) {
      data.description = description === "" ? null : description;
    }

    // Nothing to update?
    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No fields provided to update" }, { status: 400 });
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data,
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        updatedAt: true,
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return Response.json({ transaction: updated });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/transactions
export async function DELETE(req) {
  try {
    const body = await req.json();

    const {
      userEmail = "default@fintrack.local",
      transactionId,
    } = body ?? {};

    if (!transactionId) {
      return Response.json({ error: "transactionId is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Only delete if it belongs to the user
    const deleted = await prisma.transaction.deleteMany({
      where: { id: transactionId, userId: user.id },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    return Response.json({ success: true, deletedCount: deleted.count });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
