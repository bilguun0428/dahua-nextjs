"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth } from "@/lib/firebase";
import type { InventoryItem, NewsItem, HoldItem } from "@/lib/types";
import { cancelHold } from "@/lib/data";
import { invalidateCache } from "@/lib/firestore-cache";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast";

import type { Bundle, BundleItem, Order } from "@/lib/types";

type Tab = "dashboard" | "orders" | "inventory" | "news" | "holds" | "bundles" | "users";

export default function AdminPage() {
  const { role } = useAuth();
  const { confirm: showConfirm } = useToast();

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold text-gray-600">Зөвхөн админ хандах боломжтой</h2>
          <p className="text-sm text-gray-400 mt-1">Энэ хуудсыг үзэх эрх байхгүй байна</p>
        </div>
      </div>
    );
  }
  const [tab, setTab] = useState<Tab>("dashboard");
  // --- Inventory state ---
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [loading, setLoading] = useState(true);
  const [editModel, setEditModel] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", stock: 0, priceMNT: 0, discount: 0 });
  const [newModel, setNewModel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  // --- News state ---
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [showNewsAdd, setShowNewsAdd] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: "", body: "", type: "news" as "news" | "faq", pinned: false, image: "", isPopup: false });
  const [editNewsId, setEditNewsId] = useState<string | null>(null);
  // --- Holds state ---
  const [holds, setHolds] = useState<HoldItem[]>([]);
  // --- Orders state ---
  const [orders, setOrders] = useState<Order[]>([]);
  // --- Bundles state ---
  const [bundlesList, setBundlesList] = useState<Bundle[]>([]);
  const [showBundleAdd, setShowBundleAdd] = useState(false);
  const [bundleForm, setBundleForm] = useState({ name: "", description: "", tag: "", discount: 10, active: true });
  const [bundleItems, setBundleItems] = useState<{model:string;qty:number}[]>([]);
  const [bundleAddModel, setBundleAddModel] = useState("");
  // --- Users state ---
  const [users, setUsers] = useState<{id:string;email:string;name?:string;role?:string;createdAt?:number}[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", role: "user" });
  // --- Mogul Sync state ---
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; total: number } | null>(null);

  async function loadInventory() {
    const snap = await getDocs(collection(db, "inventory"));
    const inv: Record<string, InventoryItem> = {};
    snap.docs.forEach((d) => (inv[d.id] = d.data() as InventoryItem));
    setInventory(inv);
    setLoading(false);
  }
  async function loadNews() {
    const snap = await getDocs(query(collection(db, "news"), orderBy("createdAt", "desc")));
    setNewsItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsItem)));
  }
  async function loadHolds() {
    const snap = await getDocs(collection(db, "holds"));
    setHolds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HoldItem)).sort((a, b) => b.createdAt - a.createdAt));
  }

  async function loadOrders() {
    const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
    setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
  }
  async function loadBundles() {
    const snap = await getDocs(collection(db, "bundles"));
    setBundlesList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bundle)));
  }
  async function loadUsers() {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as {id:string;email:string;name?:string;role?:string;createdAt?:number})).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  }

  useEffect(() => { loadInventory(); loadNews(); loadHolds(); loadOrders(); loadBundles(); loadUsers(); }, []);

  // --- Mogul Sync handler ---
  async function handleMogulSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/mogul-sync", {
        method: "POST",
        headers: { "x-admin-uid": "admin" },
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({ synced: data.synced, skipped: data.skipped, total: data.total });
        invalidateCache("inventory");
        await loadInventory();
      } else {
        alert("Sync алдаа: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Sync алдаа: " + String(err));
    } finally {
      setSyncing(false);
    }
  }

  // --- Inventory handlers ---
  async function handleSave(model: string) {
    setSaving(true);
    await updateDoc(doc(db, "inventory", model), { name: editForm.name, stock: editForm.stock, priceMNT: editForm.priceMNT, discount: editForm.discount || 0 });
    setEditModel(null); await loadInventory(); setSaving(false);
  }
  async function handleAdd() {
    if (!newModel.trim()) return;
    setSaving(true);
    await setDoc(doc(db, "inventory", newModel.trim()), { model: newModel.trim(), name: editForm.name, stock: editForm.stock, priceMNT: editForm.priceMNT, discount: editForm.discount || 0 });
    setShowAdd(false); setNewModel(""); setEditForm({ name: "", stock: 0, priceMNT: 0, discount: 0 }); await loadInventory(); setSaving(false);
  }
  async function handleDelete(model: string) {
    if (!(await showConfirm(`"${model}" устгах уу?`))) return;
    await deleteDoc(doc(db, "inventory", model)); await loadInventory();
  }
  // --- News handlers ---
  async function handleNewsAdd() {
    if (!newsForm.title.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "news"), { ...newsForm, createdAt: Date.now() });
    setShowNewsAdd(false); setNewsForm({ title: "", body: "", type: "news", pinned: false, image: "", isPopup: false }); await loadNews(); setSaving(false);
  }
  async function handleNewsUpdate(id: string) {
    setSaving(true);
    await updateDoc(doc(db, "news", id), { title: newsForm.title, body: newsForm.body, type: newsForm.type, pinned: newsForm.pinned, image: newsForm.image || "", isPopup: newsForm.isPopup });
    setEditNewsId(null); await loadNews(); setSaving(false);
  }
  async function handleNewsDelete(id: string) {
    if (!(await showConfirm("Устгах уу?"))) return;
    await deleteDoc(doc(db, "news", id)); await loadNews();
  }
  // --- Hold handlers ---
  async function handleCancelHold(id: string) {
    if (!(await showConfirm("Hold цуцлах уу?"))) return;
    await cancelHold(id); await loadHolds();
  }
  // --- User handler ---
  async function handleAddUser() {
    if (!newUserEmail.trim() || !newUserPass.trim()) return;
    setSaving(true); setUserMsg("");
    try {
      // Use secondary Firebase app so current admin session is not lost
      const secondaryApp = initializeApp(auth.app.options, "secondary-" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail.trim(), newUserPass.trim());
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: newUserEmail.trim(),
        name: newUserName.trim() || newUserEmail.trim(),
        role: "user",
        createdAt: Date.now(),
      });
      setUserMsg(`✅ ${newUserEmail} амжилттай үүсгэлээ!`);
      setNewUserEmail(""); setNewUserPass(""); setNewUserName("");
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) setUserMsg("❌ Энэ и-мэйл бүртгэлтэй байна");
      else if (msg.includes("weak-password")) setUserMsg("❌ Нууц үг хамгийн багадаа 6 тэмдэгт");
      else setUserMsg("❌ Алдаа: " + msg);
    } finally { setSaving(false); }
  }

  const entries = Object.entries(inventory).sort(([, a], [, b]) => b.stock - a.stock);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500 animate-pulse">Ачааллаж байна...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: "dashboard" as Tab, label: "📊 Dashboard" },
            { key: "orders" as Tab, label: "🧾 Захиалга", count: orders.filter(o => o.status === "pending").length },
            { key: "inventory" as Tab, label: "📦 Агуулах", count: entries.length },
            { key: "news" as Tab, label: "📰 Мэдээ", count: newsItems.length },
            { key: "holds" as Tab, label: "🔒 Hold", count: holds.filter(h => h.status === "active" && h.expiresAt > Date.now()).length },
            { key: "bundles" as Tab, label: "📦 Багц", count: bundlesList.length },
            { key: "users" as Tab, label: "👤 Хэрэглэгч" },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${tab === t.key ? "bg-blue-900 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-900"}`}>
              {t.label} {t.count !== undefined ? <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">{t.count}</span> : null}
            </button>
          ))}
        </div>

        {/* ===== DASHBOARD ===== */}
        {tab === "dashboard" && (() => {
          const totalRevenue = orders.reduce((s, o) => s + (o.totalMNT || 0), 0);
          const pendingOrders = orders.filter(o => o.status === "pending").length;
          const confirmedOrders = orders.filter(o => o.status === "confirmed").length;
          const deliveredOrders = orders.filter(o => o.status === "delivered").length;
          const activeHoldsCount = holds.filter(h => h.status === "active" && h.expiresAt > Date.now()).length;
          const holdValue = holds.filter(h => h.status === "active" && h.expiresAt > Date.now()).reduce((s, h) => s + h.items.reduce((ss, i) => ss + i.priceMNT * i.qty, 0), 0);
          const totalStock = Object.values(inventory).reduce((s, i) => s + i.stock, 0);
          const totalStockValue = Object.values(inventory).reduce((s, i) => s + i.stock * i.priceMNT, 0);
          return (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Dashboard</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500 mb-1">Нийт захиалга</div><div className="text-2xl font-extrabold text-blue-700">{orders.length}</div></div>
                <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500 mb-1">Нийт орлого</div><div className="text-2xl font-extrabold text-green-700">₮{totalRevenue.toLocaleString()}</div></div>
                <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500 mb-1">Хэрэглэгчид</div><div className="text-2xl font-extrabold text-purple-700">{users.length}</div></div>
                <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500 mb-1">Агуулахын нийт бараа</div><div className="text-2xl font-extrabold text-gray-700">{totalStock.toLocaleString()} ш</div></div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4"><div className="text-xs text-yellow-700 mb-1">⏳ Хүлээгдэж буй</div><div className="text-2xl font-extrabold text-yellow-700">{pendingOrders}</div></div>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4"><div className="text-xs text-blue-700 mb-1">✅ Баталгаажсан</div><div className="text-2xl font-extrabold text-blue-700">{confirmedOrders}</div></div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-4"><div className="text-xs text-green-700 mb-1">📦 Хүргэгдсэн</div><div className="text-2xl font-extrabold text-green-700">{deliveredOrders}</div></div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><div className="text-xs text-amber-700 mb-1">🔒 Идэвхтэй Hold</div><div className="text-2xl font-extrabold text-amber-700">{activeHoldsCount} (₮{holdValue.toLocaleString()})</div></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500 mb-1">Агуулахын нийт үнэ цэнэ</div><div className="text-2xl font-extrabold text-blue-700">₮{totalStockValue.toLocaleString()}</div></div>
                <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500 mb-1">Дундаж захиалга</div><div className="text-2xl font-extrabold text-gray-700">{orders.length > 0 ? `₮${Math.round(totalRevenue / orders.length).toLocaleString()}` : "—"}</div></div>
              </div>
              {/* Mogul Sync */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">🔄 Mogul Sync</h3>
                    <p className="text-xs text-blue-600 mt-0.5">Mogul системээс бараа, үнэ, нөөцийг шинэчлэх</p>
                  </div>
                  <button
                    onClick={handleMogulSync}
                    disabled={syncing}
                    className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {syncing ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sync хийж байна...</>
                    ) : (
                      "🔄 Mogul-оос шинэчлэх"
                    )}
                  </button>
                </div>
                {syncResult && (
                  <div className="mt-3 bg-white rounded-lg p-3 text-sm">
                    <span className="text-green-700 font-bold">✅ Амжилттай!</span>
                    <span className="text-gray-600 ml-2">{syncResult.synced}/{syncResult.total} бүтээгдэхүүн шинэчлэгдсэн</span>
                    {syncResult.skipped > 0 && <span className="text-orange-600 ml-2">({syncResult.skipped} алгассан)</span>}
                  </div>
                )}
              </div>

              {/* Recent orders */}
              {orders.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Сүүлийн захиалгууд</h3>
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o) => {
                      const d = o.createdAt instanceof Date ? o.createdAt : new Date((o.createdAt as unknown as {seconds:number}).seconds * 1000);
                      return (
                        <div key={o.id} className="bg-white rounded-lg border px-4 py-2 flex items-center justify-between text-sm">
                          <span className="text-gray-500">{d.toLocaleDateString("mn-MN")}</span>
                          <span className="text-gray-700">{o.items.length} бараа</span>
                          <span className="font-bold text-blue-700">₮{(o.totalMNT||0).toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${o.status==="pending"?"bg-yellow-100 text-yellow-800":o.status==="confirmed"?"bg-blue-100 text-blue-800":"bg-green-100 text-green-800"}`}>{o.status==="pending"?"Хүлээгдэж буй":o.status==="confirmed"?"Баталгаажсан":"Хүргэгдсэн"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ===== ORDERS ===== */}
        {tab === "orders" && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🧾 Захиалгууд ({orders.length})</h2>
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📭</div><p className="text-sm">Захиалга байхгүй</p></div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => {
                  const d = o.createdAt instanceof Date ? o.createdAt : new Date((o.createdAt as unknown as {seconds:number}).seconds * 1000);
                  const stMap: Record<string, {label:string;color:string}> = {
                    pending: {label:"Хүлээгдэж буй", color:"bg-yellow-100 text-yellow-800"},
                    confirmed: {label:"Баталгаажсан", color:"bg-blue-100 text-blue-800"},
                    delivered: {label:"Хүргэгдсэн", color:"bg-green-100 text-green-800"},
                  };
                  const st = stMap[o.status] || stMap.pending;
                  return (
                    <div key={o.id} className="bg-white rounded-xl border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                          <span className="text-xs text-gray-400">{d.toLocaleDateString("mn-MN")} {d.toLocaleTimeString("mn-MN",{hour:"2-digit",minute:"2-digit"})}</span>
                          {o.deliveryType === "delivery" ? <span className="text-xs text-gray-400">🚚</span> : <span className="text-xs text-gray-400">🏢</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-extrabold text-blue-700">₮{(o.totalMNT||0).toLocaleString()}</span>
                          {/* Status change buttons */}
                          {o.status === "pending" && (
                            <button onClick={async () => { await updateDoc(doc(db, "orders", o.id!), { status: "confirmed" }); await loadOrders(); }} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">✅ Батлах</button>
                          )}
                          {o.status === "confirmed" && (
                            <button onClick={async () => { await updateDoc(doc(db, "orders", o.id!), { status: "delivered" }); await loadOrders(); }} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">📦 Хүргэсэн</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {o.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.model.startsWith("BUNDLE:") ? item.name : item.model}</span>
                            <span className="text-gray-500">{item.qty} ш — ₮{(item.priceMNT * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {o.address && <div className="text-xs text-gray-400 mt-2">📍 {o.address}</div>}
                      {o.note && <div className="text-xs text-gray-400 mt-1">📝 {o.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== INVENTORY ===== */}
        {tab === "inventory" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Агуулахын бараа ({entries.length})</h2>
              <button onClick={() => { setShowAdd(true); setEditForm({ name: "", stock: 0, priceMNT: 0, discount: 0 }); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+ Шинэ бараа</button>
            </div>
            {showAdd && (
              <div className="bg-white border-2 border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-sm mb-3">Шинэ бараа</h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <input placeholder="Model" value={newModel} onChange={(e) => setNewModel(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="Нэр" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Нөөц" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Үнэ (MNT)" value={editForm.priceMNT} onChange={(e) => setEditForm({ ...editForm, priceMNT: Number(e.target.value) })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Хөнгөлөлт %" value={editForm.discount || ""} onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAdd} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "..." : "Нэмэх"}</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Болих</button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Model</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Нэр</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Нөөц</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Үнэ</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Хөнгөлөлт</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([model, info]) => (
                    <tr key={model} className="border-b last:border-0 hover:bg-gray-50">
                      {editModel === model ? (
                        <>
                          <td className="px-4 py-3 font-mono text-xs font-bold">{model}</td>
                          <td className="px-4 py-3"><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" /></td>
                          <td className="px-4 py-3"><input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} className="w-20 px-2 py-1 border rounded text-sm text-right" /></td>
                          <td className="px-4 py-3"><input type="number" value={editForm.priceMNT} onChange={(e) => setEditForm({ ...editForm, priceMNT: Number(e.target.value) })} className="w-28 px-2 py-1 border rounded text-sm text-right" /></td>
                          <td className="px-4 py-3"><input type="number" value={editForm.discount || ""} onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })} className="w-16 px-2 py-1 border rounded text-sm text-right" placeholder="0" /></td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleSave(model)} disabled={saving} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold mr-1 disabled:opacity-50">💾</button>
                            <button onClick={() => setEditModel(null)} className="px-3 py-1 bg-gray-200 rounded text-xs">✕</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">{model}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{info.name}</td>
                          <td className="px-4 py-3 text-right"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-xs">{info.stock}</span></td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-700">₮{info.priceMNT?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{info.discount ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold text-xs">-{info.discount}%</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => { setEditModel(model); setEditForm({ name: info.name, stock: info.stock, priceMNT: info.priceMNT, discount: info.discount || 0 }); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold mr-1 hover:bg-blue-200">✏️</button>
                            <button onClick={() => handleDelete(model)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200">🗑️</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ===== NEWS ===== */}
        {tab === "news" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Мэдээ / FAQ ({newsItems.length})</h2>
              <button onClick={() => { setShowNewsAdd(true); setEditNewsId(null); setNewsForm({ title: "", body: "", type: "news", pinned: false, image: "", isPopup: false }); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+ Шинэ мэдээ</button>
            </div>
            {(showNewsAdd || editNewsId) && (
              <div className="bg-white border-2 border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-sm mb-3">{editNewsId ? "Засах" : "Шинэ мэдээ"}</h3>
                <div className="space-y-3">
                  <input placeholder="Гарчиг" value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <input placeholder="🖼️ Зургийн URL (заавал биш)" value={newsForm.image} onChange={(e) => setNewsForm({ ...newsForm, image: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  {newsForm.image && <div className="h-32 rounded-lg bg-cover bg-center border" style={{ backgroundImage: `url(${newsForm.image})` }} />}
                  <textarea placeholder="Агуулга..." value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
                  <div className="flex items-center gap-4">
                    <select value={newsForm.type} onChange={(e) => setNewsForm({ ...newsForm, type: e.target.value as "news" | "faq" })} className="px-3 py-2 border rounded-lg text-sm">
                      <option value="news">📰 Мэдээ</option><option value="faq">❓ FAQ</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={newsForm.pinned} onChange={(e) => setNewsForm({ ...newsForm, pinned: e.target.checked })} className="w-4 h-4 rounded" />📌 Чухал
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={newsForm.isPopup} onChange={(e) => setNewsForm({ ...newsForm, isPopup: e.target.checked })} className="w-4 h-4 rounded" />🎉 Popup (нэвтрэхэд гарна)
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => editNewsId ? handleNewsUpdate(editNewsId) : handleNewsAdd()} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "..." : "Хадгалах"}</button>
                  <button onClick={() => { setShowNewsAdd(false); setEditNewsId(null); }} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Болих</button>
                </div>
              </div>
            )}
            {newsItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📭</div><p className="text-sm">Мэдээ байхгүй</p></div>
            ) : (
              <div className="space-y-3">
                {newsItems.map((item) => (
                  <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.pinned ? "border-yellow-300 bg-yellow-50" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.pinned && <span className="text-xs font-bold text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">📌</span>}
                          {item.isPopup && <span className="text-xs font-bold text-pink-700 bg-pink-200 px-2 py-0.5 rounded-full">🎉 Popup</span>}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === "news" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{item.type === "news" ? "📰" : "❓"}</span>
                          <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString("mn-MN")}</span>
                        </div>
                        <h3 className="font-bold text-sm">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditNewsId(item.id!); setShowNewsAdd(false); setNewsForm({ title: item.title, body: item.body, type: item.type, pinned: item.pinned || false, image: item.image || "", isPopup: item.isPopup || false }); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200">✏️</button>
                        <button onClick={() => handleNewsDelete(item.id!)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== HOLDS ===== */}
        {tab === "holds" && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 Бүх Hold ({holds.length})</h2>
            {holds.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📭</div><p className="text-sm">Hold байхгүй</p></div>
            ) : (
              <div className="space-y-3">
                {holds.map((hold) => {
                  const now = Date.now();
                  const isActive = hold.status === "active" && hold.expiresAt > now;
                  const daysLeft = Math.max(0, Math.ceil((hold.expiresAt - now) / (1000 * 60 * 60 * 24)));
                  const holdTotal = hold.items.reduce((s, i) => s + i.priceMNT * i.qty, 0);
                  return (
                    <div key={hold.id} className={`bg-white rounded-xl border-2 p-4 ${isActive ? "border-amber-200" : "border-gray-200 opacity-50"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isActive ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">⏳ {daysLeft} хоног</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">Дууссан</span>
                          )}
                          <span className="text-xs text-gray-500">👤 {hold.userEmail}</span>
                          <span className="text-xs text-gray-400">{new Date(hold.createdAt).toLocaleDateString("mn-MN")} → {new Date(hold.expiresAt).toLocaleDateString("mn-MN")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-extrabold text-blue-700">₮{holdTotal.toLocaleString()}</span>
                          {isActive && <button onClick={() => handleCancelHold(hold.id!)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">Цуцлах</button>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {hold.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.model}</span>
                            <span className="text-gray-500">{item.qty} ш — ₮{(item.priceMNT * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== BUNDLES ===== */}
        {tab === "bundles" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">📦 Багц ({bundlesList.length})</h2>
              <button onClick={() => { setShowBundleAdd(true); setBundleForm({ name: "", description: "", tag: "", discount: 10, active: true }); setBundleItems([]); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+ Шинэ багц</button>
            </div>
            {showBundleAdd && (() => {
              const originalMNT = bundleItems.reduce((s, bi) => s + (inventory[bi.model]?.priceMNT || 0) * bi.qty, 0);
              const priceMNT = Math.round(originalMNT * (1 - bundleForm.discount / 100));
              return (
              <div className="bg-white border-2 border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-sm mb-3">Шинэ багц нэмэх</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input placeholder="Багцын нэр" value={bundleForm.name} onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                    <input placeholder="Шошго (жишээ: 4 камер)" value={bundleForm.tag} onChange={(e) => setBundleForm({ ...bundleForm, tag: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 whitespace-nowrap">Хямдрал:</span>
                      <input type="number" value={bundleForm.discount} onChange={(e) => setBundleForm({ ...bundleForm, discount: Number(e.target.value) })} min={0} max={50} className="w-20 px-3 py-2 border rounded-lg text-sm text-center" />
                      <span className="text-sm font-bold">%</span>
                    </div>
                  </div>
                  <textarea placeholder="Тодорхойлолт..." value={bundleForm.description} onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />

                  {/* Add item from inventory */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Бараа нэмэх:</label>
                    <div className="flex gap-2">
                      <select value={bundleAddModel} onChange={(e) => setBundleAddModel(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm">
                        <option value="">-- Бараа сонгох --</option>
                        {Object.entries(inventory).filter(([m]) => !bundleItems.find(bi => bi.model === m)).map(([model, info]) => (
                          <option key={model} value={model}>{model} — ₮{info.priceMNT?.toLocaleString()} ({info.stock} ш)</option>
                        ))}
                      </select>
                      <button onClick={() => { if (bundleAddModel) { setBundleItems([...bundleItems, { model: bundleAddModel, qty: 1 }]); setBundleAddModel(""); } }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+</button>
                    </div>
                  </div>

                  {/* Selected items */}
                  {bundleItems.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {bundleItems.map((bi, idx) => {
                        const info = inventory[bi.model];
                        return (
                          <div key={bi.model} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-800">{bi.model}</div>
                              <div className="text-[10px] text-gray-400">₮{info?.priceMNT?.toLocaleString() || "?"} × {bi.qty} = ₮{((info?.priceMNT || 0) * bi.qty).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setBundleItems(bundleItems.map((b, i) => i === idx ? { ...b, qty: Math.max(1, b.qty - 1) } : b))} className="w-7 h-7 bg-white border rounded text-xs font-bold">-</button>
                              <span className="w-8 text-center text-sm font-bold">{bi.qty}</span>
                              <button onClick={() => setBundleItems(bundleItems.map((b, i) => i === idx ? { ...b, qty: b.qty + 1 } : b))} className="w-7 h-7 bg-white border rounded text-xs font-bold">+</button>
                            </div>
                            <button onClick={() => setBundleItems(bundleItems.filter((_, i) => i !== idx))} className="w-7 h-7 bg-red-50 text-red-500 rounded text-xs hover:bg-red-100">✕</button>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 mt-2 flex justify-between items-center">
                        <div className="text-xs text-gray-500">Тусдаа: <span className="line-through">₮{originalMNT.toLocaleString()}</span></div>
                        <div className="text-lg font-extrabold text-blue-700">Багц: ₮{priceMNT.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={async () => {
                    if (!bundleForm.name || bundleItems.length === 0) { return; return; }
                    setSaving(true);
                    await addDoc(collection(db, "bundles"), { name: bundleForm.name, description: bundleForm.description, tag: bundleForm.tag, priceMNT, originalMNT, items: bundleItems, active: true });
                    setShowBundleAdd(false); setBundleItems([]); await loadBundles(); setSaving(false);
                  }} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "..." : `📦 Багц үүсгэх (₮${priceMNT.toLocaleString()})`}</button>
                  <button onClick={() => setShowBundleAdd(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Болих</button>
                </div>
              </div>
              );
            })()}
            {bundlesList.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📦</div><p className="text-sm">Багц байхгүй</p></div>
            ) : (
              <div className="space-y-3">
                {bundlesList.map((b) => (
                  <div key={b.id} className={`bg-white rounded-xl border p-4 ${b.active ? "" : "opacity-50"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {b.tag && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{b.tag}</span>}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${b.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{b.active ? "Идэвхтэй" : "Идэвхгүй"}</span>
                        </div>
                        <h3 className="font-bold text-sm">{b.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{b.description}</p>
                        <div className="text-xs text-gray-400 mt-1 font-mono">{b.items.map(i => `${i.model} ×${i.qty}`).join(" • ")}</div>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-lg font-extrabold text-blue-700">₮{b.priceMNT.toLocaleString()}</span>
                          {b.originalMNT && <span className="text-sm text-gray-400 line-through">₮{b.originalMNT.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={async () => { await updateDoc(doc(db, "bundles", b.id!), { active: !b.active }); await loadBundles(); }} className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold hover:bg-amber-200">{b.active ? "⏸" : "▶"}</button>
                        <button onClick={async () => { if (!(await showConfirm("Устгах уу?"))) return; await deleteDoc(doc(db, "bundles", b.id!)); await loadBundles(); }} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== USERS ===== */}
        {tab === "users" && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">👤 Хэрэглэгчид ({users.length})</h2>

            {/* Users list */}
            {users.length > 0 && (
              <div className="bg-white rounded-xl border overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Нэр</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">И-мэйл</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Эрх</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Бүртгэсэн</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                        {editUserId === u.id ? (
                          <>
                            <td className="px-4 py-3"><input value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" /></td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{u.email}</td>
                            <td className="px-4 py-3">
                              <select value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} className="px-2 py-1 border rounded text-sm">
                                <option value="user">👤 User</option>
                                <option value="admin">👑 Admin</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("mn-MN") : "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={async () => { await updateDoc(doc(db, "users", u.id), { name: editUserForm.name, role: editUserForm.role }); setEditUserId(null); await loadUsers(); }} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold mr-1">💾</button>
                              <button onClick={() => setEditUserId(null)} className="px-3 py-1 bg-gray-200 rounded text-xs">✕</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold text-gray-800">{u.name || "—"}</td>
                            <td className="px-4 py-3 text-gray-600">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                {u.role === "admin" ? "👑 Admin" : "👤 User"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("mn-MN") : "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => { setEditUserId(u.id); setEditUserForm({ name: u.name || "", role: u.role || "user" }); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200">✏️</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add user form */}
            <div className="bg-white rounded-xl border p-6 max-w-lg">
              <h3 className="font-bold text-sm mb-3">Шинэ хэрэглэгч нэмэх</h3>
              <p className="text-xs text-gray-400 mb-4">Зөвхөн админ шинэ хэрэглэгч үүсгэнэ. Гаднаас бүртгүүлэх боломжгүй.</p>
              {userMsg && <div className={`text-sm px-4 py-3 rounded-lg mb-4 ${userMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{userMsg}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Нэр" className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none" />
                <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="И-мэйл" className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none" />
                <input type="text" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} placeholder="Нууц үг (6+ тэмдэгт)" className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <button onClick={handleAddUser} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? "Үүсгэж байна..." : "👤 Хэрэглэгч үүсгэх"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
