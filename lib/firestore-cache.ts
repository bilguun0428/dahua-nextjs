// Module-level Firestore cache with TTL.
// Хуудас хооронд шилжихэд дахин татахгүй байхын тулд memory-д хадгална.

import { collection, getDocs, query as fbQuery, QueryConstraint } from "firebase/firestore";
import { db } from "./firebase";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60 * 1000; // 60 секунд
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function getCachedDocs<T>(
  collectionName: string,
  cacheKey?: string,
  ttlMs: number = DEFAULT_TTL_MS,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const key = cacheKey ?? collectionName;

  // Хадгалсан өгөгдөл байгаа бол
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data as T[];
  }

  // Нэг цагт олон хуудас ижил query хийвэл нэг л request гарна
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T[]>;

  const promise = (async () => {
    const col = collection(db, collectionName);
    const q = constraints.length ? fbQuery(col, ...constraints) : col;
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    inflight.delete(key);
    return data;
  })();

  inflight.set(key, promise);
  return promise;
}

// Write үйлдэл хийсний дараа cache-г хоослох.
// Key-тэй адил, эсвэл key-р эхэлдэг бүх entry-г устгана (user-specific keys-д хэрэгтэй).
export function invalidateCache(...keys: string[]) {
  if (keys.length === 0) {
    cache.clear();
    return;
  }
  for (const k of keys) {
    cache.delete(k);
    // Prefix-р эхлэх entries (жишээ: "orders:abc123")
    for (const existingKey of cache.keys()) {
      if (existingKey.startsWith(k + ":")) cache.delete(existingKey);
    }
  }
}
