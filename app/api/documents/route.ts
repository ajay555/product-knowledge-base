/**
 * GET /api/documents
 * Returns the list of ingested documents with per-document stats.
 */

import { getDocumentStats } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const docs = await getDocumentStats();
    return NextResponse.json(docs);
  } catch (err) {
    console.error("[/api/documents] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
