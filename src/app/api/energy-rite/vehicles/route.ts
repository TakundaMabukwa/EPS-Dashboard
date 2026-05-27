import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_BASE = 'http://209.38.217.58:8000/api/vehicles';

let cachedData: any = null;
let cachedTime = 0;
const CACHE_TTL = 30_000;

export async function GET(request: NextRequest) {
  try {
    if (cachedData && Date.now() - cachedTime < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cachedData, cached: true }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const upstreamUrl = query ? `${API_BASE}?${query}` : API_BASE;

    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const list = Array.isArray(data) ? data : data?.data || [];
    cachedData = list;
    cachedTime = Date.now();

    return NextResponse.json({ success: true, data: list }, { status: 200 });
  } catch (error: any) {
    if (cachedData) {
      return NextResponse.json({ success: true, data: cachedData, cached: true }, { status: 200 });
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}
