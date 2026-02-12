import { prisma } from "@/lib/prisma";
import { randomBytes, scryptSync } from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    // Generate salt
    const salt = randomBytes(16).toString("hex");

    // Hash password
    const hash = scryptSync(password, salt, 64).toString("hex");

    // Create user
    await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        passwordSalt: salt,
      },
    });

    return NextResponse.json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
