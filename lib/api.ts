import { NextResponse } from "next/server";

export async function safeJson<T = unknown>(request: Request): Promise<T> {
  const raw = await request.text();
  return (raw ? JSON.parse(raw) : {}) as T;
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
