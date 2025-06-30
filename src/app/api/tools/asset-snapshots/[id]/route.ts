import { auth } from "@/app/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// ✅ Do NOT type the second argument — let Next.js handle it
export async function PUT(req: NextRequest, { params }: any) {
  const { id } = params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${email}`;

  const body = await req.json();
  const { date, portfolioValue, contributions, withdrawals, note } = body;

  if (!date || portfolioValue == null || contributions == null || withdrawals == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await db`
    UPDATE asset_snapshots
    SET
      date = ${date},
      portfolio_value = ${portfolioValue},
      contributions = ${contributions},
      withdrawals = ${withdrawals},
      note = ${note},
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: any) {
  const { id } = params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${email}`;

  await db`
    DELETE FROM asset_snapshots
    WHERE id = ${id} AND user_id = ${userId}
  `;

  return NextResponse.json({ success: true });
}
