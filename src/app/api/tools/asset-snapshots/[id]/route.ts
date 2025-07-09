import { auth } from "@/app/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function getIdFromUrl(req: NextRequest): string | null {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  return segments[segments.length - 1] || null;
}

export async function PUT(req: NextRequest) {
  const id = getIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

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

export async function DELETE(req: NextRequest) {
  const id = getIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db`
    DELETE FROM asset_snapshots
    WHERE id = ${id} AND user_id = ${userId}
  `;

  return NextResponse.json({ success: true });
}
