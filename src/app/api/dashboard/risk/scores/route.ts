import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_ROUTING || "http://164.90.217.196:8800/";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}api/dashboard/risk/scores`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
