/**
 * POST /api/chat
 *
 * RAG pipeline:
 *  1. Embed the latest user message
 *  2. Vector-search text_chunks (cosine similarity via pgvector)
 *  3. Fetch images from the same pages as the top chunks
 *  4. Build a grounded system prompt with retrieved context
 *  5. Stream GPT-4o response back via Vercel AI SDK data stream
 *     — relevant images and source citations travel as message annotations
 */

import { createDataStreamResponse, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { Message } from "ai";
import { embedQuery } from "@/lib/embeddings";
import { searchChunks, getImagesForChunks } from "@/lib/db";

const TOP_K    = Number(process.env.TOP_K_CHUNKS    ?? 5);
const MIN_SIM  = Number(process.env.MIN_SIMILARITY  ?? 0.3);

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildSystemPrompt(contextBlocks: string[]): string {
  const context = contextBlocks.length
    ? contextBlocks.join("\n\n---\n\n")
    : "No relevant product information was found for this query.";

  return `You are a knowledgeable product assistant. Answer the user's question using ONLY the product information provided in the context below.
Be specific, accurate, and cite the document and page number when you reference a fact.
If the context does not contain enough information to answer fully, say so clearly rather than guessing.

FORMAT GUIDELINES:
- Use clear, concise prose. Avoid unnecessary filler.
- When comparing products, use a short structured list.
- Always include relevant safety information if the question involves grinding or cutting operations.
- At the end of your answer, include a "Sources:" line listing the document filename and page numbers you referenced.

CONTEXT:
${context}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  // Extract the latest user message text
  const userMessage = messages.filter((m) => m.role === "user").at(-1);
  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }
  const query =
    typeof userMessage.content === "string"
      ? userMessage.content
      : (userMessage.content as { type: string; text?: string }[])
          .filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join(" ");

  // ── 1. Embed the query ──────────────────────────────────────────────────────
  const queryEmbedding = await embedQuery(query);

  // ── 2. Retrieve relevant chunks ─────────────────────────────────────────────
  const chunks = await searchChunks(queryEmbedding, TOP_K, MIN_SIM);

  // ── 3. Retrieve images from the same pages ──────────────────────────────────
  const images = await getImagesForChunks(chunks);

  // ── 4. Build context for the LLM ────────────────────────────────────────────
  const contextBlocks = chunks.map((c) => {
    const heading = c.section_heading ? `[${c.section_heading}] ` : "";
    return `SOURCE: ${c.doc_filename}, Page ${c.page_num}\n${heading}${c.text}`;
  });

  const sources = chunks.map((c) => ({
    doc_filename:    c.doc_filename,
    page_num:        c.page_num,
    section_heading: c.section_heading,
    similarity:      Math.round(c.similarity * 100) / 100,
  }));

  const imageAnnotations = images.map((img) => ({
    image_id:     img.image_id,
    blob_url:     img.blob_url,
    doc_filename: img.doc_filename,
    page_num:     img.page_num,
    caption_text: img.caption_text,
    width:        img.width,
    height:       img.height,
  }));

  // ── 5. Stream response ───────────────────────────────────────────────────────
  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Write images + sources as message annotations — they attach to this
      // specific assistant message in the useChat hook
      dataStream.writeMessageAnnotation({
        type:    "images",
        payload: imageAnnotations,
      });
      dataStream.writeMessageAnnotation({
        type:    "sources",
        payload: sources,
      });

      const result = streamText({
        model:    openai("gpt-4o"),
        system:   buildSystemPrompt(contextBlocks),
        messages: messages.map((m) => ({
          role:    m.role as "user" | "assistant" | "system",
          content: typeof m.content === "string" ? m.content : query,
        })),
        temperature: 0.2, // low temperature for factual Q&A
        maxTokens:   1024,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      console.error("[/api/chat] error:", error);
      return error instanceof Error ? error.message : "An error occurred";
    },
  });
}
