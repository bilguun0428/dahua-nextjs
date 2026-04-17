"use client";

import { useEffect, useState, useMemo } from "react";
import { mergeStockItems } from "@/lib/data";
import { getCachedDocs } from "@/lib/firestore-cache";
import { catMN, typeMN, QUICK_CATEGORIES } from "@/lib/types";
import type { Product, InventoryItem, StockItem, HoldItem, Bundle } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast";
import { getProductIcon } from "@/lib/product-icons";
import { getProductImage } from "@/lib/productImage";

const GROUP_ORDER = [
  "Network Cameras",
  "PTZ Cameras",
  "Wireless Cameras",
  "Network Recorders",
  "Fire Alarm",
  "Accessories",
  "Other",
];
const GROUP_ICON: Record<string, string> = {
  "Network Cameras": "📹",
  "PTZ Cameras": "🎯",
  "Wireless Cameras": "📡",
  "Network Recorders": "💾",
  "Fire Alarm": "🔥",
  Accessories: "🔌",
  Other: "📦",
};

// Extract channel/port count from NVR/Switch model names
// e.g. NVR4104 → 4, NVR4108 → 8, NVR4116 → 16, NVR4232 → 32
function getChannels(model: string): number {
  const m = model.toUpperCase();
  const nvr = m.match(/NVR\d{2}(\d{2})/);
  if (nvr) return parseInt(nvr[1], 10);
  const sw = m.match(/(?:PFS|S\d+).*?(\d{1,2})(?:ET|GT|GF|EP)/i);
  if (sw) return parseInt(sw[1], 10);
  return 0;
}

export default function Home() {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [stockSpecs, setStockSpecs] = useState<Record<string, Partial<StockItem>>>({});
  const [holds, setHolds] = useState<HoldItem[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("stock-desc");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  // Sidebar filters
  const [filterType, setFilterType] = useState<Set<string>>(new Set());
  const [filterMp, setFilterMp] = useState<Set<number>>(new Set());
  const [filterIp, setFilterIp] = useState<Set<string>>(new Set());
  const [filterCh, setFilterCh] = useState<Set<number>>(new Set());
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [prodArr, invArr, specArr, holdsArr, bundleArr] = await Promise.all([
          getCachedDocs<Product & { id: string }>("products"),
          getCachedDocs<InventoryItem & { id: string }>("inventory"),
          getCachedDocs<Partial<StockItem> & { id: string }>("stockSpecs"),
          getCachedDocs<HoldItem>("holds"),
          getCachedDocs<Bundle>("bundles"),
        ]);
        setProducts(prodArr as Product[]);
        const inv: Record<string, InventoryItem> = {};
        invArr.forEach((d) => (inv[d.id] = d as InventoryItem));
        setInventory(inv);
        const specs: Record<string, Partial<StockItem>> = {};
        specArr.forEach((d) => (specs[d.id] = d as Partial<StockItem>));
        setStockSpecs(specs);
        setHolds(holdsArr as HoldItem[]);
        setBundles((bundleArr as Bundle[]).filter((b) => b.active));
      } catch (err) {
        console.error("Firebase load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allItems = useMemo(
    () => mergeStockItems(inventory, products, stockSpecs, holds),
    [inventory, products, stockSpecs, holds]
  );

  const stockItems = useMemo(() => {
    let items = [...allItems];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.model.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.fullModel.toLowerCase().includes(q) ||
          s.desc.toLowerCase().includes(q)
      );
    }
    if (activeCat) items = items.filter((s) => s.cat === activeCat);
    if (onlyDiscount) items = items.filter((s) => s.discount && s.discount > 0);
    if (filterType.size) items = items.filter((s) => s.type && filterType.has(s.type));
    if (filterMp.size) items = items.filter((s) => s.mp && filterMp.has(s.mp));
    if (filterIp.size) items = items.filter((s) => s.ip && filterIp.has(s.ip));
    if (filterCh.size) items = items.filter((s) => { const ch = getChannels(s.model); return ch > 0 && filterCh.has(ch); });
    const pMin = Number(priceMin) || 0;
    const pMax = Number(priceMax) || Infinity;
    if (pMin > 0 || pMax < Infinity) items = items.filter((s) => s.priceMNT >= pMin && s.priceMNT <= pMax);
    if (sort === "stock-desc") items.sort((a, b) => b.stock - a.stock);
    else if (sort === "stock-asc") items.sort((a, b) => a.stock - b.stock);
    else if (sort === "price-asc") items.sort((a, b) => a.priceMNT - b.priceMNT);
    else if (sort === "price-desc") items.sort((a, b) => b.priceMNT - a.priceMNT);
    return items;
  }, [allItems, search, sort, activeCat, onlyDiscount, filterType, filterMp, filterIp, filterCh, priceMin, priceMax]);

  // Available filter options from allItems
  const filterOptions = useMemo(() => {
    const types = [...new Set(allItems.map((s) => s.type).filter(Boolean))] as string[];
    const mps = [...new Set(allItems.map((s) => s.mp).filter(Boolean))].sort((a, b) => (a as number) - (b as number)) as number[];
    const ips = [...new Set(allItems.map((s) => s.ip).filter(Boolean))] as string[];
    const channels = [...new Set(allItems.map((s) => getChannels(s.model)).filter((c) => c > 0))].sort((a, b) => a - b);
    return { types, mps, ips, channels };
  }, [allItems]);

  const toggleFilter = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  const clearAllFilters = () => {
    setFilterType(new Set()); setFilterMp(new Set()); setFilterIp(new Set()); setFilterCh(new Set());
    setPriceMin(""); setPriceMax(""); setSearch(""); setActiveCat(null); setOnlyDiscount(false);
  };

  const grouped = useMemo(() => {
    const groups: Record<string, StockItem[]> = {};
    for (const s of stockItems) {
      const g = s.cat && GROUP_ORDER.includes(s.cat) ? s.cat : "Other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    }
    return groups;
  }, [stockItems]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of allItems) c[s.cat || "Other"] = (c[s.cat || "Other"] || 0) + 1;
    return c;
  }, [allItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📡</div>
          <p className="text-gray-500 text-sm font-medium">Мэдээлэл ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="Бэлэн бараанаас хайх... (жишээ: NVR, dome, bullet)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none transition"
          />
          {showSuggestions && search.length >= 2 && (() => {
            const q = search.toLowerCase();
            const suggestions = allItems.filter(s =>
              s.model.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.fullModel.toLowerCase().includes(q)
            ).slice(0, 6);
            if (suggestions.length === 0) return null;
            return (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", marginTop: 4, overflow: "hidden" }}>
                {suggestions.map((s) => (
                  <div key={s.model} onClick={() => { setSearch(s.model); setShowSuggestions(false); }}
                    style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="hover:bg-blue-50"
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{s.fullModel || s.model}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.name}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1d4ed8" }}>₮{s.priceMNT.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="flex gap-6">
          {/* ===== LEFT SIDEBAR FILTERS ===== */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="sticky top-16 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-800">Шүүлтүүр</span>
                <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:underline">Цэвэрлэх</button>
              </div>

              {/* Camera type */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">📷 Камерын хэлбэр</h4>
                <div className="space-y-1">
                  {filterOptions.types.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-1 py-1 rounded">
                      <input type="checkbox" checked={filterType.has(t)} onChange={() => toggleFilter(filterType, t, setFilterType)} className="w-3.5 h-3.5 rounded" />
                      {typeMN[t] || t}
                    </label>
                  ))}
                </div>
              </div>

              {/* MP */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">🔍 Нягтрал (MP)</h4>
                <div className="flex flex-wrap gap-1">
                  {filterOptions.mps.map((m) => (
                    <button key={m} onClick={() => toggleFilter(filterMp, m, setFilterMp)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterMp.has(m) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
                      {m}MP
                    </button>
                  ))}
                </div>
              </div>

              {/* IP Rating */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">🛡️ Хамгаалалт</h4>
                <div className="flex flex-wrap gap-1">
                  {filterOptions.ips.map((ip) => (
                    <button key={ip} onClick={() => toggleFilter(filterIp, ip, setFilterIp)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterIp.has(ip) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
                      {ip}
                    </button>
                  ))}
                </div>
              </div>

              {/* NVR Channels */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">💾 NVR суваг</h4>
                <div className="flex flex-wrap gap-1">
                  {[4, 8, 16, 32].map((ch) => (
                    <button key={ch} onClick={() => toggleFilter(filterCh, ch, setFilterCh)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterCh.has(ch) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
                      {ch}ch
                    </button>
                  ))}
                </div>
              </div>

              {/* Switch Ports */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">🔌 Switch port</h4>
                <div className="flex flex-wrap gap-1">
                  {[4, 8, 16, 24].map((p) => (
                    <button key={`sw${p}`} onClick={() => toggleFilter(filterCh, p, setFilterCh)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterCh.has(p) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
                      {p} port
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">💰 Үнийн хязгаар</h4>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Доод" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs" />
                  <span className="text-gray-400 text-xs">—</span>
                  <input type="number" placeholder="Дээд" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs" />
                </div>
              </div>
            </div>
          </aside>

          {/* ===== RIGHT CONTENT ===== */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">
                Агуулахад байгаа бараа: <span className="text-blue-700">{stockItems.length}</span>
              </h2>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="stock-desc">Нөөц: Их → Бага</option>
                <option value="stock-asc">Нөөц: Бага → Их</option>
                <option value="price-asc">Үнэ: Бага → Их</option>
                <option value="price-desc">Үнэ: Их → Бага</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => { setActiveCat(null); setOnlyDiscount(false); }}
            className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition flex items-center gap-2 ${
              !activeCat && !onlyDiscount ? "bg-blue-900 border-blue-900 text-white shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-blue-900 hover:text-blue-900"
            }`}
          >
            📋 Бүгд <span className="bg-black/10 px-2 py-0.5 rounded-full text-xs font-bold">{allItems.length}</span>
          </button>
          {/* DISCOUNT BUTTON */}
          {(() => { const dc = allItems.filter((s) => s.discount && s.discount > 0).length; return dc > 0 ? (
            <button
              onClick={() => { setOnlyDiscount(!onlyDiscount); setActiveCat(null); }}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition flex items-center gap-2 ${
                onlyDiscount ? "bg-red-600 border-red-600 text-white shadow-md" : "bg-white border-red-200 text-red-600 hover:border-red-600"
              }`}
            >
              🏷️ Хямдралтай <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${onlyDiscount ? "bg-white/25" : "bg-red-50"}`}>{dc}</span>
            </button>
          ) : null; })()}
          {QUICK_CATEGORIES.map((qc) => {
            const count = catCounts[qc.key] || 0;
            if (count === 0) return null;
            return (
              <button
                key={qc.key}
                onClick={() => setActiveCat(activeCat === qc.key ? null : qc.key)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition flex items-center gap-2 ${
                  activeCat === qc.key ? "bg-blue-900 border-blue-900 text-white shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-blue-900 hover:text-blue-900"
                }`}
              >
                {qc.icon} {qc.label} <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeCat === qc.key ? "bg-white/25" : "bg-black/5"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {stockItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-lg font-bold text-gray-600">Бэлэн бараа олдсонгүй</h3>
            <p className="text-gray-400 text-sm">Хайлтаа өөрчилж үзнэ үү</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" style={{ alignItems: "start" }}>
            {/* BUNDLES as cards */}
            {bundles.length > 0 && (
              <div className="contents">
                <div className="col-span-full pt-1">
                  <h3 className="text-base font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-2">
                    📦 БЭЛЭН БАГЦ
                    <span className="bg-blue-900 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">{bundles.length}</span>
                  </h3>
                </div>
                {bundles.map((b) => {
                  const discount = b.originalMNT ? Math.round((1 - b.priceMNT / b.originalMNT) * 100) : 0;
                  return (
                    <div key={b.id} className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl p-4 text-white flex flex-col overflow-hidden relative" style={{ height: "290px" }}>
                      {discount > 0 && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-bl-xl">-{discount}%</div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {b.tag && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20">{b.tag}</span>}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/30 text-green-200">Багц</span>
                      </div>
                      <h3 className="text-lg font-extrabold mb-1">{b.name}</h3>
                      <p className="text-[11px] text-blue-200 mb-2 line-clamp-2">{b.description}</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl font-extrabold">₮{b.priceMNT.toLocaleString()}</span>
                        {b.originalMNT && <span className="text-xs text-blue-300 line-through">₮{b.originalMNT.toLocaleString()}</span>}
                      </div>
                      <div className="space-y-1 mb-2 flex-1 min-h-0 overflow-hidden">
                        {b.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-blue-100 truncate">{item.model}</span>
                            <span className="text-blue-300 whitespace-nowrap ml-2">×{item.qty}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          addItem({ model: `BUNDLE:${b.id}`, name: `📦 ${b.name}`, priceMNT: b.priceMNT, priceCNY: 0 });
                          toast("Багц сагсанд нэмэгдлээ!");
                        }}
                        className="w-full mt-auto py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition"
                      >
                        🛒 Багц авах
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {GROUP_ORDER.map((g) => {
              const arr = grouped[g];
              if (!arr || arr.length === 0) return null;
              const label = (catMN[g] || g).toUpperCase();
              return (
                <div key={g} className="contents">
                  <div className="col-span-full mt-4 first:mt-0 pt-3 border-t border-gray-200">
                    <h3 className="text-base font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-2">
                      {GROUP_ICON[g] || "📦"} {label}
                      <span className="bg-blue-900 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">{arr.length}</span>
                    </h3>
                  </div>
                  {arr.map((s) => (
                    <div
                      key={s.model}
                      onClick={() => setSelectedItem(s)}
                      className={`bg-white rounded-xl border p-3 hover:shadow-lg cursor-pointer transition-all flex flex-col overflow-hidden ${s.discount ? "border-red-200 ring-1 ring-red-100" : "border-gray-100 hover:border-blue-200"}`}
                      style={{ height: "290px" }}
                    >
                      {/* IMAGE AREA */}
                      <div className="relative -mx-3 -mt-3 mb-2 h-20 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                        {(() => {
                          const img = getProductImage(s.fullModel || s.model, s.name);
                          return img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={s.model} className="max-h-16 max-w-[65%] object-contain drop-shadow-sm" />
                          ) : (
                            <div className="text-3xl opacity-60">{getProductIcon(s.type, s.cat)}</div>
                          );
                        })()}
                        {/* BADGES */}
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <div className="bg-green-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow">{s.stock}ш</div>
                          {!!s.discount && s.discount > 0 && (
                            <div className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-extrabold shadow">-{s.discount}%</div>
                          )}
                        </div>
                      </div>
                      <div className="mb-1.5">
                        <div className="text-[11px] font-bold text-gray-800 break-all leading-tight line-clamp-2">{s.fullModel || s.model}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5">{s.name}</div>
                      </div>
                      {s.discount && s.discountPrice ? (
                        <div className="mb-1.5">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-base font-extrabold text-red-600">₮{s.discountPrice.toLocaleString()}</span>
                            <span className="text-[11px] text-gray-400 line-through">₮{s.priceMNT.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-base font-extrabold text-blue-700 mb-1.5">₮{s.priceMNT.toLocaleString()}</div>
                      )}
                      <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
                        {s.type && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">{typeMN[s.type] || s.type}</span>}
                        {s.mp && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700">{s.mp}MP</span>}
                        {s.ir && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700">IR{s.ir}м</span>}
                        {s.ip && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 text-sky-700">{s.ip}</span>}
                      </div>
                      <div className="flex-1 min-h-0"></div>
                      <div className="flex items-center gap-1.5 mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                          <button
                            onClick={(e) => {
                              const inp = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement);
                              if (inp && +inp.value > 1) inp.value = String(+inp.value - 1);
                            }}
                            style={{ width: 24, height: 28, background: "#f9fafb", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#374151" }}
                          >−</button>
                          <input
                            type="number"
                            defaultValue={1}
                            min={1}
                            style={{ width: 28, height: 28, textAlign: "center", fontSize: 12, fontWeight: 700, border: "none", borderLeft: "1.5px solid #e5e7eb", borderRight: "1.5px solid #e5e7eb", outline: "none", MozAppearance: "textfield", WebkitAppearance: "none" } as React.CSSProperties}
                            data-qty-input={s.model}
                          />
                          <button
                            onClick={(e) => {
                              const inp = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement);
                              if (inp) inp.value = String(+inp.value + 1);
                            }}
                            style={{ width: 24, height: 28, background: "#f9fafb", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#374151" }}
                          >+</button>
                        </div>
                        <button
                          onClick={() => {
                            const inp = document.querySelector(`[data-qty-input="${s.model}"]`) as HTMLInputElement;
                            const qty = Math.max(1, +(inp?.value || 1));
                            addItem({ model: s.fullModel || s.model, name: s.name, priceMNT: s.discountPrice || s.priceMNT, priceCNY: s.priceCNY || 0 }, qty);
                            if (inp) inp.value = "1";
                            toast(`${qty} ширхэг сагсанд нэмэгдлээ!`);
                          }}
                          className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 transition"
                        >
                          🛒 Нэмэх
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
          </div>{/* end right content */}
        </div>{/* end flex sidebar+content */}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedItem.fullModel || selectedItem.model}</h2>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">{selectedItem.name}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Агуулахын үлдэгдэл</div>
                <div className="text-2xl font-bold text-green-700">{selectedItem.stock} ширхэг</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Борлуулах үнэ</div>
                <div className="text-2xl font-bold text-blue-700">₮{selectedItem.priceMNT.toLocaleString()}</div>
              </div>
              {selectedItem.cat && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Ангилал</div>
                  <div className="font-semibold text-sm">{catMN[selectedItem.cat] || selectedItem.cat}</div>
                </div>
              )}
              {selectedItem.sub && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Цуврал</div>
                  <div className="font-semibold text-sm">{selectedItem.sub}</div>
                </div>
              )}
              {selectedItem.type && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Камерын хэлбэр</div>
                  <div className="font-semibold text-sm">{typeMN[selectedItem.type] || selectedItem.type}</div>
                </div>
              )}
              {selectedItem.mp && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Нягтрал</div>
                  <div className="font-semibold text-sm">{selectedItem.mp} МП</div>
                </div>
              )}
              {selectedItem.ir && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">IR зай</div>
                  <div className="font-semibold text-sm">{selectedItem.ir} метр</div>
                </div>
              )}
              {selectedItem.ip && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Хамгаалалт</div>
                  <div className="font-semibold text-sm">{selectedItem.ip}</div>
                </div>
              )}
            </div>
            {selectedItem.desc && (
              <div>
                <h3 className="text-sm font-bold mb-2">Тайлбар</h3>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-5">{selectedItem.desc}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
