// Use dynamic ESM imports to satisfy lint rules without changing package.json.

(async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { Pool } = await import("pg");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { randomBytes, scryptSync } = await import("crypto");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  async function main() {
    // USER MUST BE DEFINED HERE
    const defaultEmail = "default@fintrack.local";

    const user =
      (await prisma.user.findUnique({ where: { email: defaultEmail } })) ??
      (await prisma.user.create({
        data: (() => {
          const salt = randomBytes(16).toString("hex");
          const hash = scryptSync("123456", salt, 64).toString("hex");
          return {
            email: defaultEmail,
            passwordSalt: salt,
            passwordHash: hash,
          };
        })(),
      }));

    // CATEGORY SEEDING
    const categories = [
      { name: "Salary", type: "INCOME" },
      { name: "Bonus", type: "INCOME" },
      { name: "Food", type: "EXPENSE" },
      { name: "Transport", type: "EXPENSE" },
      { name: "Bills", type: "EXPENSE" },
      { name: "Shopping", type: "EXPENSE" },
    ];

    for (const c of categories) {
      await prisma.category.upsert({
        where: {
          name_type: {
            name: c.name,
            type: c.type,
          },
        },
        update: {},
        create: c,
      });
    }

    console.log("Seeded default user + categories");

    // TRANSACTION SEEDING — inside main
    const salary = await prisma.category.findFirst({
      where: { name: "Salary", type: "INCOME" },
      select: { id: true },
    });

    const food = await prisma.category.findFirst({
      where: { name: "Food", type: "EXPENSE" },
      select: { id: true },
    });

    const transport = await prisma.category.findFirst({
      where: { name: "Transport", type: "EXPENSE" },
      select: { id: true },
    });

    const bills = await prisma.category.findFirst({
      where: { name: "Bills", type: "EXPENSE" },
      select: { id: true },
    });

    // ✅ Step 1: sanity check
    if (!salary || !food || !transport || !bills) {
      throw new Error("Missing seeded categories");
    }

    // ✅ Step 2: reset transactions
    await prisma.transaction.deleteMany({
      where: { userId: user.id },
    });

    // ✅ Step 3: define sample transactions
    const sampleTxns = [
      // Jan 2026
      {
        userId: user.id,
        categoryId: salary.id,
        direction: "INCOME",
        amount: "3200.00",
        txnDate: new Date("2026-01-01"),
        description: "January salary",
      },
      {
        userId: user.id,
        categoryId: food.id,
        direction: "EXPENSE",
        amount: "12.50",
        txnDate: new Date("2026-01-03"),
        description: "Lunch",
      },
      {
        userId: user.id,
        categoryId: transport.id,
        direction: "EXPENSE",
        amount: "2.20",
        txnDate: new Date("2026-01-03"),
        description: "MRT",
      },
      {
        userId: user.id,
        categoryId: bills.id,
        direction: "EXPENSE",
        amount: "120.00",
        txnDate: new Date("2026-01-05"),
        description: "Utilities",
      },
      // Feb 2026
      {
        userId: user.id,
        categoryId: food.id,
        direction: "EXPENSE",
        amount: "18.90",
        txnDate: new Date("2026-02-02"),
        description: "Dinner",
      },
      {
        userId: user.id,
        categoryId: transport.id,
        direction: "EXPENSE",
        amount: "3.10",
        txnDate: new Date("2026-02-04"),
        description: "Bus",
      },
    ];

    // ✅ Step 4: insert data(sample transactions)
    await prisma.transaction.createMany({ data: sampleTxns });
    console.log("Seeded sample transactions");
  }

  await main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
})();
