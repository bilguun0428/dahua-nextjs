"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const { items, totalItems, totalMNT, removeItem, updateQty } = useCart();
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Бэлэн бараа", icon: "📦", adminOnly: false },
    { href: "/news", label: "Мэдээ", icon: "📰", adminOnly: false },
    { href: "/my-orders", label: "Түүх", icon: "📋", adminOnly: false },
    { href: "/admin", label: "Admin", icon: "⚙️", adminOnly: true },
  ];

  return (
    <header className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center font-bold text-base">D</div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight leading-tight">Dahua Product Finder</h1>
            <p className="text-[10px] text-gray-400">ITZONE LLC</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            if (link.adminOnly && role !== "admin") return null;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition relative ${isActive ? "bg-white/20 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <span className="mr-1">{link.icon}</span>
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            );
          })}

          {/* Cart button with dropdown */}
          <div className="relative"
            onMouseEnter={() => setCartOpen(true)}
            onMouseLeave={() => setCartOpen(false)}
          >
            <Link href="/cart"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition relative ${pathname === "/cart" ? "bg-white/20 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
              <span className="mr-1">🛒</span>
              <span className="hidden md:inline">Сагс</span>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
              )}
            </Link>

            {/* Dropdown preview */}
            {cartOpen && totalItems > 0 && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 text-gray-800 z-50"
                style={{ animation: "toastPop 0.15s ease" }}
              >
                <div className="p-3 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500">🛒 Сагс ({totalItems})</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.model} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{item.model.startsWith("BUNDLE:") ? item.name : item.model}</div>
                        <div className="text-[10px] text-gray-400">₮{item.priceMNT.toLocaleString()} × {item.qty}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.preventDefault(); updateQty(item.model, item.qty - 1); }} className="w-6 h-6 bg-gray-100 rounded text-xs font-bold hover:bg-gray-200">-</button>
                        <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                        <button onClick={(e) => { e.preventDefault(); updateQty(item.model, item.qty + 1); }} className="w-6 h-6 bg-gray-100 rounded text-xs font-bold hover:bg-gray-200">+</button>
                      </div>
                      <div className="text-xs font-extrabold text-blue-700 w-20 text-right">₮{(item.priceMNT * item.qty).toLocaleString()}</div>
                      <button onClick={(e) => { e.preventDefault(); removeItem(item.model); }} className="w-5 h-5 text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">Нийт:</span>
                    <span className="text-base font-extrabold text-blue-700">₮{totalMNT.toLocaleString()}</span>
                  </div>
                  <Link href="/cart" className="block w-full py-2 bg-green-600 text-white text-center rounded-lg text-xs font-bold hover:bg-green-700 transition">
                    Сагс руу очих →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <>
              <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
              <button onClick={() => signOut()} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition">Гарах</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
