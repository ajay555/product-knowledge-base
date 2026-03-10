import { getDocumentStats } from "@/lib/db";
import { FileText, Image, Layers, Calendar, BookOpen } from "lucide-react";

// Revalidate every 5 minutes so stats stay reasonably fresh without SSR overhead
export const revalidate = 300;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortName(filename: string) {
  return filename.replace(/\.pdf$/i, "");
}

const CARD_PALETTES = [
  { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700" },
  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
  { bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700" },
  { bg: "bg-rose-50",   border: "border-rose-200",   badge: "bg-rose-100 text-rose-700" },
  { bg: "bg-cyan-50",   border: "border-cyan-200",   badge: "bg-cyan-100 text-cyan-700" },
];

function docColor(index: number) {
  return CARD_PALETTES[index % CARD_PALETTES.length];
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span className="font-medium text-slate-800">{value.toLocaleString()}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

export default async function DocumentsPage() {
  let docs = await getDocumentStats();

  const totalPages  = docs.reduce((s, d) => s + d.total_pages,  0);
  const totalImages = docs.reduce((s, d) => s + d.image_count,  0);
  const totalChunks = docs.reduce((s, d) => s + d.chunk_count,  0);

  return (
    <div className="py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          Knowledge Base
        </h1>
        <p className="text-slate-500 text-sm">
          Product documentation loaded into the vector database
        </p>
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <BookOpen size={18} />, label: "Documents", value: docs.length, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: <FileText size={18} />, label: "Pages",     value: totalPages,  color: "text-violet-600", bg: "bg-violet-50" },
          { icon: <Image size={18} />,    label: "Images",    value: totalImages, color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: <Layers size={18} />,   label: "Chunks",    value: totalChunks, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                {s.value.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Document cards */}
      {docs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No documents ingested yet</p>
          <p className="text-sm mt-1">
            Run <code className="bg-slate-100 px-1 rounded">python ingest.py --setup-schema --full-reload</code> to load PDFs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc, i) => {
            const colors = docColor(i);

            return (
              <div
                key={doc.doc_id}
                className={`${colors.bg} ${colors.border} border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${colors.badge}`}
                    >
                      PDF
                    </span>
                    <h2 className="font-semibold text-slate-900 text-sm leading-snug">
                      {shortName(doc.filename)}
                    </h2>
                  </div>
                  <div className="flex-shrink-0 w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
                    <FileText size={16} className="text-slate-500" />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <StatPill icon={<FileText size={13} />}  label="pages"  value={doc.total_pages} />
                  <StatPill icon={<Image size={13} />}     label="images" value={doc.image_count} />
                  <StatPill icon={<Layers size={13} />}    label="text chunks" value={doc.chunk_count} />
                </div>

                {/* Footer */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 border-t border-slate-200/80 pt-3">
                  <Calendar size={11} />
                  <span>Indexed {formatDate(doc.processed_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
