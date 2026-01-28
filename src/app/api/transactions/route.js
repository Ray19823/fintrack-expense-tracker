import { prisma } from "../../../lib/prisma";

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
      orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        category: { select: { id: true, name: true, type: true } },
      },
      take: 50,
    });

    return Response.json({ transactions });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
