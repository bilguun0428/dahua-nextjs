"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { NewsItem } from "./types";

// Popup нь мэдээ үүсгэснээс хойш энэ хугацааны турш харагдана
const POPUP_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 өдөр

export function PromoPopup() {
  const { user } = useAuth();
  const [popup, setPopup] = useState<NewsItem | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // isPopup=true мэдээг татах (composite index хэрэггүй болгохын тулд client-side sort)
      const snap = await getDocs(query(collection(db, "news"), where("isPopup", "==", true)));
      if (cancelled) return;

      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as NewsItem))
        .sort((a, b) => b.createdAt - a.createdAt);

      const latest = items[0];
      if (!latest || !latest.id) return;

      // Мэдээ үүсгэснээс хойш 3 өдөр өнгөрсөн бол popup гаргахгүй
      if (Date.now() - latest.createdAt > POPUP_DURATION_MS) return;

      // 3 өдрийн турш нэвтрэх бүрт харуулна (localStorage check хийхгүй)
      setPopup(latest);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setPopup(null);
  };

  if (!popup) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleIn relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 text-2xl leading-none shadow-md"
          aria-label="Хаах"
        >
          &times;
        </button>
        {popup.image && (
          <div className="w-full bg-gray-50 rounded-t-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={popup.image}
              alt={popup.title}
              className="w-full max-h-[45vh] object-contain"
            />
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700">
              🎉 Урамшуулал
            </span>
            <span className="text-xs text-gray-400">
              {new Date(popup.createdAt).toLocaleDateString("mn-MN")}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{popup.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {popup.body}
          </p>
          <button
            onClick={handleClose}
            className="mt-6 w-full py-3 bg-blue-900 text-white rounded-xl font-semibold hover:bg-blue-800 transition"
          >
            Ойлголоо
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
