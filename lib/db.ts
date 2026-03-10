/**
 * db.ts
 * Neon serverless PostgreSQL client + typed query helpers.
 * Uses HTTP transport — no persistent connections needed in Vercel serverless.
 */

import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ChunkResult {
  chunk_id: string;
  doc_id: string;
  doc_filename: string;
  page_num: number;
  chunk_index: number;
  text: string;
  section_heading: string | null;
  bbox: Record<string, number> | null;
  similarity: number;
}

export interface ImageResult {
  image_id: string;
  doc_id: string;
  doc_filename: string;
  page_num: number;
  image_index: number;
  blob_url: string;
  width: number;
  height: number;
  caption_text: string | null;
  bbox: Record<string, number> | null;
}

export interface DocumentStats {
  doc_id: string;
  filename: string;
  total_pages: number;
  processed_at: string;
  chunk_count: number;
  image_count: number;
}

// ─── Vector search ────────────────────────────────────────────────────────────

/**
 * Find the top-k most semantically similar text chunks for a query embedding.
 */
export async function searchChunks(
  queryEmbedding: number[],
  topK = 5,
  minSimilarity = 0.3
): Promise<ChunkResult[]> {
  const sql = getDb();
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const rows = await sql`
    SELECT
      chunk_id,
      doc_id,
      doc_filename,
      page_num,
      chunk_index,
      text,
      section_heading,
      bbox,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM text_chunks
    WHERE 1 - (embedding <=> ${vectorStr}::vector) >= ${minSimilarity}
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  return rows as ChunkResult[];
}

/**
 * Return all images from the pages that contained the matching chunks.
 * Deduplicated and ordered by page then image_index.
 */
export async function getImagesForChunks(
  chunks: ChunkResult[]
): Promise<ImageResult[]> {
  if (chunks.length === 0) return [];

  const sql = getDb();

  // Build a unique list of (doc_id, page_num) pairs
  const pagePairs = [
    ...new Map(
      chunks.map((c) => [`${c.doc_id}:${c.page_num}`, { doc_id: c.doc_id, page_num: c.page_num }])
    ).values(),
  ];

  // Query images for all relevant pages in one round-trip
  const docIds = [...new Set(pagePairs.map((p) => p.doc_id))];
  const pageNums = [...new Set(pagePairs.map((p) => p.page_num))];

  const rows = await sql`
    SELECT
      image_id,
      doc_id,
      doc_filename,
      page_num,
      image_index,
      blob_url,
      width,
      height,
      caption_text,
      bbox
    FROM page_images
    WHERE doc_id = ANY(${docIds}::uuid[])
      AND page_num = ANY(${pageNums}::int[])
    ORDER BY page_num, image_index
  `;

  // Filter to only include images whose (doc_id, page_num) is in our pairs set
  const pairSet = new Set(pagePairs.map((p) => `${p.doc_id}:${p.page_num}`));
  return (rows as ImageResult[]).filter((r) =>
    pairSet.has(`${r.doc_id}:${r.page_num}`)
  );
}

// ─── Document stats ───────────────────────────────────────────────────────────

export async function getDocumentStats(): Promise<DocumentStats[]> {
  const sql = getDb();

  const rows = await sql`
    SELECT
      d.doc_id,
      d.filename,
      d.total_pages,
      d.processed_at,
      COUNT(DISTINCT tc.chunk_id)::int  AS chunk_count,
      COUNT(DISTINCT pi.image_id)::int  AS image_count
    FROM documents d
    LEFT JOIN text_chunks  tc ON tc.doc_id = d.doc_id
    LEFT JOIN page_images  pi ON pi.doc_id = d.doc_id
    GROUP BY d.doc_id, d.filename, d.total_pages, d.processed_at
    ORDER BY d.filename
  `;

  return rows as DocumentStats[];
}
