"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { NewsItem } from "./types";

const STORAGE_PREFIX = "promo_popup_seen_";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

      // Өдөрт 1 удаа: localStorage-д <id>_<today> түлхүүрээр хадгална
      const key = `${STORAGE_PREFIX}${latest.id}_${todayKey()}`;
      if (typeof window !== "undefined" && window.localStorage.getItem(key)) return;

      setPopup(latest);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (popup?.id && typeof window !== "undefined") {
      const key = `${STORAGE_PREFIX}${popup.id}_${todayKey()}`;
      window.localStorage.setItem(key, "1");
    }
    setPopup(null);
  };

  if (!popup) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {popup.image && (
          <div
            className="h-56 bg-cover bg-center rounded-t-2xl"
            style={{ backgroundImage: `url(${popup.image})` }}
          />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700">
                🎉 Урамшуулал
              </span>
              <span className="text-xs text-gray-400">
                {new Date(popup.createdAt).toLocaleDateString("mn-MN")}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              aria-label="Хаах"
            >
              &times;
            </button>
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
