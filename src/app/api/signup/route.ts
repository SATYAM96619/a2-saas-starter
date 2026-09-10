import { NextRequest, NextResponse } from "next/server";
import { signUp, EmailAlreadyExistsError } from "@/server/auth/signup";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name } = body as { email?: string; password?: string; name?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await signUp({ email, password, name });
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Signup failed:", err);
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }
}
