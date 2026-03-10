# Abrasives Q&A App

AI-powered chat interface for the 3M and Norton abrasives product knowledge base.
Built with Next.js 14, Vercel AI SDK, Neon pgvector, and Vercel Blob.

## Local development

```bash
cd qa-app/

npm install

# .env.local is pre-filled with credentials
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
npm install -g vercel

vercel link          # connect to your Vercel project
vercel env add DATABASE_URL
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add OPENAI_API_KEY

vercel --prod
```

Or push to GitHub and connect the repo in the Vercel dashboard — it auto-detects Next.js.

## App structure

| Route | Description |
|-------|-------------|
| `/` | Chat interface with streaming Q&A and image gallery |
| `/documents` | Knowledge base stats — documents, pages, images, chunks |
| `/api/chat` | RAG pipeline: embed → vector search → GPT-4o stream |
| `/api/documents` | Document stats JSON API |

## How RAG works

1. User question → OpenAI `text-embedding-3-small` → 1536-dim vector
2. pgvector cosine similarity search against `text_chunks` → top 5 chunks
3. Images fetched from `page_images` for the same `(doc_id, page_num)` pairs
4. GPT-4o streams the answer grounded in retrieved context
5. Images and source citations ride alongside the stream as message annotations

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `OPENAI_API_KEY` | OpenAI API key |
| `TOP_K_CHUNKS` | Chunks to retrieve per query (default: 5) |
| `MIN_SIMILARITY` | Min cosine similarity to include (default: 0.3) |
