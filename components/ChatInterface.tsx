"use client";

import { useChat, type Message } from "ai/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  User,
  Bot,
  Loader2,
  ZoomIn,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SAMPLE_QUESTIONS } from "@/lib/sampleQuestions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageAnnotation {
  image_id: string;
  blob_url: string;
  doc_filename: string;
  page_num: number;
  caption_text: string | null;
  width: number;
  height: number;
}

interface SourceAnnotation {
  doc_filename: string;
  page_num: number;
  section_heading: string | null;
  similarity: number;
}

interface MessageAnnotation {
  type: "images" | "sources";
  payload: ImageAnnotation[] | SourceAnnotation[];
}

function getAnnotations(message: Message) {
  const raw = (message.annotations ?? []) as unknown as MessageAnnotation[];
  const images = (raw.find((a) => a.type === "images")?.payload ?? []) as ImageAnnotation[];
  const sources = (raw.find((a) => a.type === "sources")?.payload ?? []) as SourceAnnotation[];
  return { images, sources };
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({
  img,
  onClose,
}: {
  img: ImageAnnotation;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl overflow-hidden max-w-3xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white rounded-full p-1 shadow-md hover:bg-slate-100"
        >
          <X size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.blob_url}
          alt={img.caption_text ?? "Product image"}
          className="w-full object-contain max-h-[70vh]"
        />
        {img.caption_text && (
          <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
            {img.caption_text}
          </div>
        )}
        <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-100">
          {img.doc_filename} — Page {img.page_num}
        </div>
      </div>
    </div>
  );
}

// ─── Image gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: ImageAnnotation[] }) {
  const [lightbox, setLightbox] = useState<ImageAnnotation | null>(null);

  if (images.length === 0) return null;

  // Show up to 6 images
  const visible = images.slice(0, 6);

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {visible.map((img) => (
          <button
            key={img.image_id}
            onClick={() => setLightbox(img)}
            className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-blue-300 transition-colors aspect-video flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.blob_url}
              alt={img.caption_text ?? "Product image"}
              className="object-contain w-full h-full p-1"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn
                size={20}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
              />
            </div>
            {img.caption_text && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                {img.caption_text}
              </div>
            )}
          </button>
        ))}
      </div>
      {images.length > 6 && (
        <p className="text-xs text-slate-400 mt-1.5">
          +{images.length - 6} more images on these pages
        </p>
      )}
      {lightbox && (
        <Lightbox img={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

// ─── Source citations ─────────────────────────────────────────────────────────

function SourceCitations({ sources }: { sources: SourceAnnotation[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  // Deduplicate by filename+page
  const unique = [
    ...new Map(sources.map((s) => [`${s.doc_filename}:${s.page_num}`, s])).values(),
  ];

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <FileText size={12} />
        <span>{unique.length} source{unique.length !== 1 ? "s" : ""}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unique.map((s) => (
            <span
              key={`${s.doc_filename}:${s.page_num}`}
              className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full"
            >
              <FileText size={10} />
              {s.doc_filename.replace(".pdf", "")} · p.{s.page_num}
              {s.similarity >= 0.7 && (
                <span className="ml-0.5 text-blue-500 font-medium">
                  {Math.round(s.similarity * 100)}%
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const { images, sources } = getAnnotations(message);
  const content = typeof message.content === "string" ? message.content : "";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex items-end gap-2 max-w-[80%]">
          <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
            {content}
          </div>
          <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={14} className="text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2 max-w-[90%]">
        <div className="flex-shrink-0 w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center mt-0.5">
          <Bot size={14} className="text-slate-600" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex-1">
          <div className={`prose-chat ${isStreaming && !content ? "cursor-blink" : ""}`}>
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <span className="text-slate-400 text-sm">Thinking…</span>
            )}
          </div>
          {images.length > 0 && <ImageGallery images={images} />}
          {sources.length > 0 && <SourceCitations sources={sources} />}
        </div>
      </div>
    </div>
  );
}

// ─── Welcome / empty state ────────────────────────────────────────────────────

function WelcomeScreen({ onQuestion }: { onQuestion: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
        <Bot size={28} className="text-white" />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        Product Knowledge Base
      </h1>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-md">
        Ask any question about your product catalog — specifications,
        comparisons, applications, and safety guidelines.
      </p>

      <div className="w-full max-w-2xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Sample questions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onQuestion(q)}
              className="text-left text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm leading-snug"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, setMessages } =
    useChat({ api: "/api/chat" });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
        // Reset textarea height
        if (inputRef.current) inputRef.current.style.height = "auto";
      }
    }
  };

  const handleSampleQuestion = (q: string) => {
    setInput(q);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const hasMessages = messages.length > 0;
  // The last message is streaming if it's assistant role and loading is true
  const streamingIndex =
    isLoading && messages.at(-1)?.role === "assistant"
      ? messages.length - 1
      : -1;

  return (
    <div
      className="flex flex-col"
      style={{
        height: `calc(100vh - var(--header-height))`,
      }}
    >
      {/* Messages / Welcome */}
      <div className="flex-1 overflow-y-auto chat-scroll">
        {!hasMessages ? (
          <WelcomeScreen onQuestion={handleSampleQuestion} />
        ) : (
          <div className="py-6 space-y-5">
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                isStreaming={i === streamingIndex}
              />
            ))}
            {/* Loading indicator when waiting for first token */}
            {isLoading && messages.at(-1)?.role === "user" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                    <Bot size={14} className="text-slate-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <Loader2 size={16} className="text-blue-500 animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {hasMessages && (
          <div className="flex justify-end max-w-5xl mx-auto mb-2">
            <button
              onClick={handleNewChat}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              + New chat
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              handleSubmit(e);
              if (inputRef.current) inputRef.current.style.height = "auto";
            }
          }}
          className="flex items-end gap-3 max-w-5xl mx-auto"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your products…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed transition-all"
            style={{ maxHeight: "160px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          Answers are grounded in your uploaded product documentation · Press{" "}
          <kbd className="bg-slate-100 px-1 rounded text-[10px]">Enter</kbd> to
          send,{" "}
          <kbd className="bg-slate-100 px-1 rounded text-[10px]">
            Shift+Enter
          </kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  );
}
