"use client";

import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createOrder, createHold } from "@/lib/data";
import { PICKUP_LOCATIONS } from "@/lib/types";
import type { Bundle } from "@/lib/types";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/lib/toast";
import { getProductImage } from "@/lib/productImage";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, totalMNT } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);

  useEffect(() => {
    getDocs(collection(db, "bundles")).then((snap) => {
      setBundles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bundle)));
    });
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("pickup");
  const [address, setAddress] = useState("");
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATIONS[0].id);

  const handleOrder = async () => {
    if (!user) { router.push("/login"); return; }
    if (items.length === 0) return;
    if (deliveryType === "delivery" && !address.trim()) { toast("Хүргэлтийн хаяг оруулна уу", "error"); return; }
    setSubmitting(true);
    try {
      // Firestore `undefined` утгыг хүлээн авдаггүй — зөвхөн тодорхой талбаруудыг нэмнэ
      const orderData: Parameters<typeof createOrder>[0] = {
        items,
        totalMNT,
        createdAt: new Date(),
        status: "pending",
        deliveryType,
        userId: user.uid,
        userEmail: user.email || "",
      };
      if (deliveryType === "delivery") orderData.address = address;
      if (deliveryType === "pickup") orderData.pickupLocation = pickupLocation;

      await createOrder(orderData);
      clearCart(); setSuccess(true);
      // Notify admin
      fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "order", data: { totalMNT, items, email: user.email } }) }).catch(() => {});
    } catch (err) {
      console.error("Order submission error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast(`Захиалга илгээхэд алдаа гарлаа: ${msg}`, "error");
    }
    finally { setSubmitting(false); }
  };

  const handleHold = async () => {
    if (!user) { router.push("/login"); return; }
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const now = Date.now();
      await createHold({ userId: user.uid, userEmail: user.email || "", items, createdAt: now, expiresAt: now + 7 * 24 * 60 * 60 * 1000, status: "active" });
      clearCart(); toast("Бараа 7 хоногийн турш хадгалагдлаа!");
    } catch { toast("Hold хийхэд алдаа гарлаа", "error"); }
    finally { setSubmitting(false); }
  };

  const generateInvoice = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const d = new jsPDF();
    const date = new Date().toLocaleDateString("mn-MN");
    // Header
    d.setFontSize(20); d.setTextColor(30, 58, 138); d.text("ITZONE LLC", 14, 20);
    d.setFontSize(10); d.setTextColor(100); d.text("Dahua Product Finder", 14, 27);
    d.setFontSize(16); d.setTextColor(30); d.text("NEHEMJLEH", 150, 20);
    d.setFontSize(10); d.setTextColor(100); d.text(date, 150, 27);
    // Table
    const tableData = items.map((item, i) => [
      i + 1,
      item.model.startsWith("BUNDLE:") ? item.name : item.model,
      item.qty,
      `${item.priceMNT.toLocaleString()} MNT`,
      `${(item.priceMNT * item.qty).toLocaleString()} MNT`,
    ]);
    autoTable(d, {
      startY: 35,
      head: [["#", "Baraa", "Too", "Negj une", "Niit"]],
      body: tableData,
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 9 },
    });
    // Total
    const finalY = (d as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    d.setFontSize(14); d.setTextColor(30, 58, 138); d.text(`Niit dun: ${totalMNT.toLocaleString()} MNT`, 14, finalY);
    d.setFontSize(8); d.setTextColor(150); d.text("ITZONE LLC | bilguun.b@itzone.mn", 14, finalY + 15);
    d.save(`nehemjleh-${Date.now()}.pdf`);
    toast("PDF nehemjleh tatlagdlaa!");
  };

  if (success) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Захиалга амжилттай!</h2>
          <p className="text-gray-500 text-sm mb-6">Бид тантай удахгүй холбогдоно</p>
          <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Нүүр хуудас</Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🛒</div>
          <h2 className="text-lg font-bold text-gray-600 mb-2">Сагс хоосон байна</h2>
          <p className="text-gray-400 text-sm mb-6">Бараа нэмэхийн тулд нүүр хуудас руу очно уу</p>
          <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Бэлэн бараа</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">🛒 Сагс</h2>
        <span className="text-sm text-gray-500">{items.length} бараа</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const isBundle = item.model.startsWith("BUNDLE:");
            const bundleId = isBundle ? item.model.replace("BUNDLE:", "") : null;
            const bundle = bundleId ? bundles.find((b) => b.id === bundleId) : null;
            return (
              <div key={item.model} className={`bg-white rounded-xl border p-4 ${isBundle ? "border-blue-200 bg-blue-50/30" : "border-gray-100"}`}>
                <div className="flex items-center gap-4">
                  {!isBundle && (() => {
                    const img = getProductImage(item.model, item.name);
                    return img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={item.model} className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 object-contain p-1.5 flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-3xl flex-shrink-0">📦</div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800">{isBundle ? item.name : item.model}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{!isBundle && item.name !== item.model ? item.name : ""}</div>
                    <div className="text-base font-extrabold text-blue-700 mt-1">₮{item.priceMNT.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => updateQty(item.model, item.qty - 1)} className="w-8 h-8 rounded-md bg-white border text-sm font-bold hover:bg-gray-100 transition">-</button>
                    <span className="w-10 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.model, item.qty + 1)} className="w-8 h-8 rounded-md bg-white border text-sm font-bold hover:bg-gray-100 transition">+</button>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <div className="text-sm font-extrabold text-gray-800">₮{(item.priceMNT * item.qty).toLocaleString()}</div>
                  </div>
                  <button onClick={() => removeItem(item.model)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition">✕</button>
                </div>
                {/* Bundle items detail */}
                {isBundle && bundle && (
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Багцад орсон бараа:</div>
                    <div className="space-y-1">
                      {bundle.items.map((bi, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-600">{bi.model}</span>
                          <span className="text-gray-400">×{bi.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT: Summary + Delivery + Actions */}
        <div className="space-y-4">
          {/* Total */}
          <div className="bg-white rounded-xl border p-5">
            <div className="text-sm text-gray-500 mb-1">Нийт дүн</div>
            <div className="text-3xl font-extrabold text-blue-700 mb-1">₮{totalMNT.toLocaleString()}</div>
            <div className="text-xs text-gray-400">{items.reduce((s, i) => s + i.qty, 0)} бараа</div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Хүлээн авах</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setDeliveryType("pickup")}
                className={`py-2 rounded-lg text-xs font-semibold border-2 transition ${deliveryType === "pickup" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600"}`}>
                🏢 Очиж авах
              </button>
              <button onClick={() => setDeliveryType("delivery")}
                className={`py-2 rounded-lg text-xs font-semibold border-2 transition ${deliveryType === "delivery" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600"}`}>
                🚚 Хүргүүлэх
              </button>
            </div>
            {deliveryType === "pickup" ? (
              <div className="space-y-2">
                {PICKUP_LOCATIONS.map((loc) => (
                  <label key={loc.id} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${pickupLocation === loc.id ? "border-blue-500 bg-blue-50" : "border-gray-100"}`}>
                    <input type="radio" name="pickup" checked={pickupLocation === loc.id} onChange={() => setPickupLocation(loc.id)} className="mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-800">{loc.name}</div>
                      <div className="text-gray-500">{loc.address}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <textarea placeholder="Хаяг оруулна уу..." value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-xs focus:border-blue-500 focus:outline-none resize-none" />
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button onClick={handleOrder} disabled={submitting}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition disabled:opacity-50">
              {submitting ? "Илгээж байна..." : "📦 Захиалга илгээх"}
            </button>
            <button onClick={handleHold} disabled={submitting}
              className="w-full py-3 bg-amber-50 text-amber-800 border-2 border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition disabled:opacity-50">
              🔒 7 хоног Hold хийх
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={generateInvoice} className="py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition">
                📄 Нэхэмжлэх
              </button>
              <button onClick={clearCart} className="py-2.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-100 transition">
                🗑️ Цэвэрлэх
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
