import { auth } from "@/app/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await db`
    SELECT * FROM asset_snapshots
    WHERE user_id = ${userId}
    ORDER BY date DESC
  `;

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, portfolioValue, contributions, withdrawals, note } = body;

  if (!date || portfolioValue == null || contributions == null || withdrawals == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await db`
    INSERT INTO asset_snapshots (
      id, user_id, date, portfolio_value, contributions, withdrawals, note
    ) VALUES (
      gen_random_uuid(), ${userId}, ${date}, ${portfolioValue}, ${contributions}, ${withdrawals}, ${note}
    )
  `;

  return NextResponse.json({ success: true });
}
