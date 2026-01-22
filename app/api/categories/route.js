import prisma from "../../../src/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return Response.json({ categories });
}
