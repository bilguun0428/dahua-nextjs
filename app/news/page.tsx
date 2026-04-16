"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NewsItem } from "@/lib/types";

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "news" | "faq">("all");
  const [selected, setSelected] = useState<NewsItem | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, "news"), orderBy("createdAt", "desc")))
      .then((snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsItem))))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "all" ? items : items.filter((i) => i.type === tab);
  const pinned = filtered.filter((i) => i.pinned);
  const rest = filtered.filter((i) => !i.pinned);
  const all = [...pinned, ...rest];

  // First item = hero, rest = grid
  const hero = all[0];
  const grid = all.slice(1);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} минутын өмнө`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} цагийн өмнө`;
    const days = Math.floor(hours / 24);
    return `${days} өдрийн өмнө`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-4xl animate-pulse">📰</div></div>;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Мэдээ & FAQ</h2>
        <div className="flex gap-2">
          {([
            { key: "all" as const, label: "Бүгд" },
            { key: "news" as const, label: "📰 Мэдээ" },
            { key: "faq" as const, label: "❓ FAQ" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-900"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-gray-500">Мэдээлэл байхгүй байна</h3>
        </div>
      ) : (
        <>
          {/* Hero - first article */}
          {hero && (
            <div onClick={() => setSelected(hero)} className="cursor-pointer mb-6 rounded-2xl overflow-hidden bg-white border border-gray-100 hover:shadow-xl transition group">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {hero.image ? (
                  <div className="h-64 md:h-80 bg-cover bg-center" style={{ backgroundImage: `url(${hero.image})` }} />
                ) : (
                  <div className="h-64 md:h-80 bg-gradient-to-br from-blue-900 to-indigo-800 flex items-center justify-center">
                    <span className="text-6xl opacity-50">{hero.type === "news" ? "📰" : "❓"}</span>
                  </div>
                )}
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    {hero.pinned && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-200 text-yellow-800">📌 Чухал</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hero.type === "news" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {hero.type === "news" ? "Мэдээ" : "FAQ"}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(hero.createdAt)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition">{hero.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-4 leading-relaxed">{hero.body}</p>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {grid.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grid.map((item) => (
                <div key={item.id} onClick={() => setSelected(item)}
                  className="cursor-pointer bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                  {item.image ? (
                    <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} />
                  ) : (
                    <div className="h-44 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <span className="text-4xl opacity-40">{item.type === "news" ? "📰" : "❓"}</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {item.pinned && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-200 text-yellow-800">📌</span>}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.type === "news" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {item.type === "news" ? "Мэдээ" : "FAQ"}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(item.createdAt)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 mb-1 line-clamp-2 group-hover:text-blue-700 transition">{item.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selected.image && (
              <div className="h-64 bg-cover bg-center rounded-t-2xl" style={{ backgroundImage: `url(${selected.image})` }} />
            )}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {selected.pinned && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-200 text-yellow-800">📌 Чухал</span>}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selected.type === "news" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {selected.type === "news" ? "📰 Мэдээ" : "❓ FAQ"}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(selected.createdAt).toLocaleDateString("mn-MN")}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selected.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
