"use server";

import bcrypt from "bcryptjs";
import { db } from "@/server/db";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailAlreadyExistsError";
  }
}

export async function signUp(params: { email: string; password: string; name?: string }) {
  const email = params.email.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new EmailAlreadyExistsError();

  const passwordHash = await bcrypt.hash(params.password, 12);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name: params.name,
    },
  });

  return { id: user.id, email: user.email, name: user.name };
}
