"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";
import { cancelHold } from "@/lib/data";
import type { Order, HoldItem } from "@/lib/types";

type Tab = "all" | "orders" | "holds" | "invoices";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { confirm: showConfirm } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [holds, setHolds] = useState<HoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, "orders"), where("userId", "==", user.uid))),
      getDocs(query(collection(db, "holds"), where("userId", "==", user.uid))),
    ]).then(([orderSnap, holdSnap]) => {
      const userOrders = orderSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .sort((a, b) => {
          const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : ((a.createdAt as unknown as { seconds: number })?.seconds ?? 0) * 1000;
          const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : ((b.createdAt as unknown as { seconds: number })?.seconds ?? 0) * 1000;
          return tb - ta;
        });
      setOrders(userOrders);
      setHolds(holdSnap.docs.map((d) => ({ id: d.id, ...d.data() } as HoldItem)).sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
  }, [user]);

  const handleCancelHold = async (holdId: string) => {
    if (!(await showConfirm("Hold цуцлах уу?"))) return;
    await cancelHold(holdId);
    setHolds((prev) => prev.map((h) => (h.id === holdId ? { ...h, status: "expired" as const } : h)));
  };

  // Stats
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (o.totalMNT || 0), 0);
    const activeHolds = holds.filter((h) => h.status === "active" && h.expiresAt > Date.now()).length;
    const holdTotal = holds.filter((h) => h.status === "active" && h.expiresAt > Date.now())
      .reduce((s, h) => s + h.items.reduce((ss, i) => ss + i.priceMNT * i.qty, 0), 0);
    return { totalOrders, totalSpent, activeHolds, holdTotal };
  }, [orders, holds]);

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: "Хүлээгдэж буй", color: "bg-yellow-100 text-yellow-800" },
    confirmed: { text: "Баталгаажсан", color: "bg-blue-100 text-blue-800" },
    delivered: { text: "Хүргэгдсэн", color: "bg-green-100 text-green-800" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-pulse">📋</div>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Миний түүх</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Нийт захиалга</div>
          <div className="text-2xl font-extrabold text-blue-700">{stats.totalOrders}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Нийт зарцуулалт</div>
          <div className="text-2xl font-extrabold text-green-700">₮{stats.totalSpent.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Идэвхтэй Hold</div>
          <div className="text-2xl font-extrabold text-amber-600">{stats.activeHolds}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Hold дүн</div>
          <div className="text-2xl font-extrabold text-amber-600">₮{stats.holdTotal.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: "all" as Tab, label: "Бүгд", icon: "📋" },
          { key: "orders" as Tab, label: "Захиалга", icon: "📦" },
          { key: "holds" as Tab, label: "Hold", icon: "🔒" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition ${
              tab === t.key ? "bg-blue-900 border-blue-900 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-900"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {(tab === "all" || tab === "orders") && orders.length > 0 && (
        <div className="mb-6">
          {tab === "all" && <h3 className="text-base font-bold text-gray-700 mb-3">📦 Захиалгууд</h3>}
          <div className="space-y-3">
            {orders.map((order) => {
              const st = statusLabel[order.status] || statusLabel.pending;
              const date = order.createdAt instanceof Date
                ? order.createdAt.toLocaleDateString("mn-MN")
                : new Date((order.createdAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString("mn-MN");
              return (
                <div key={order.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.text}</span>
                      <span className="text-xs text-gray-400">{date}</span>
                      {order.deliveryType === "delivery" ? (
                        <span className="text-xs text-gray-400">🚚 Хүргэлт</span>
                      ) : (
                        <span className="text-xs text-gray-400">🏢 Очиж авах</span>
                      )}
                    </div>
                    <span className="text-lg font-extrabold text-blue-700">₮{(order.totalMNT || 0).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.model}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500">{item.qty} ш</span>
                          <span className="font-semibold text-gray-800">₮{(item.priceMNT * item.qty).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.address && <div className="text-xs text-gray-400 mt-2">📍 {order.address}</div>}
                  {order.note && <div className="text-xs text-gray-400 mt-1">📝 {order.note}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Holds */}
      {(tab === "all" || tab === "holds") && holds.length > 0 && (
        <div className="mb-6">
          {tab === "all" && <h3 className="text-base font-bold text-gray-700 mb-3">🔒 Hold түүх</h3>}
          <div className="space-y-3">
            {holds.map((hold) => {
              const now = Date.now();
              const isActive = hold.status === "active" && hold.expiresAt > now;
              const isExpired = hold.status === "expired" || hold.expiresAt <= now;
              const daysLeft = Math.max(0, Math.ceil((hold.expiresAt - now) / (1000 * 60 * 60 * 24)));
              const holdTotal = hold.items.reduce((s, i) => s + i.priceMNT * i.qty, 0);
              return (
                <div key={hold.id} className={`bg-white rounded-xl border-2 p-4 ${isActive ? "border-amber-200" : "border-gray-200 opacity-60"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">⏳ {daysLeft} хоног үлдсэн</span>
                      ) : isExpired ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">Дууссан</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Дууссан</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(hold.createdAt).toLocaleDateString("mn-MN")} — {new Date(hold.expiresAt).toLocaleDateString("mn-MN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-blue-700">₮{holdTotal.toLocaleString()}</span>
                      {isActive && (
                        <button onClick={() => handleCancelHold(hold.id!)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">
                          Цуцлах
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {hold.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.model}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500">{item.qty} ш</span>
                          <span className="font-semibold text-gray-800">₮{(item.priceMNT * item.qty).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && holds.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-gray-500">Түүх хоосон байна</h3>
          <p className="text-gray-400 text-sm mt-1">Захиалга, hold хийснээр энд харагдана</p>
        </div>
      )}
    </main>
  );
}
