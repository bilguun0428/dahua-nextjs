import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Product, InventoryItem, StockItem, Order, CartItem, HoldItem } from "./types";

// ---- Products ----
export async function getProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ ...d.data() } as Product));
}

// ---- Inventory ----
export async function getInventory(): Promise<Record<string, InventoryItem>> {
  const snap = await getDocs(collection(db, "inventory"));
  const inv: Record<string, InventoryItem> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as InventoryItem;
    inv[d.id] = data;
  });
  return inv;
}

export async function updateInventoryItem(
  model: string,
  updates: Partial<InventoryItem>
) {
  await updateDoc(doc(db, "inventory", model), updates);
}

export async function setInventoryItem(model: string, item: InventoryItem) {
  await setDoc(doc(db, "inventory", model), item);
}

export async function deleteInventoryItem(model: string) {
  await deleteDoc(doc(db, "inventory", model));
}

// ---- Stock Specs (overrides for inventory items missing catalog match) ----
export async function getStockSpecs(): Promise<
  Record<string, Partial<StockItem>>
> {
  const snap = await getDocs(collection(db, "stockSpecs"));
  const specs: Record<string, Partial<StockItem>> = {};
  snap.docs.forEach((d) => {
    specs[d.id] = d.data() as Partial<StockItem>;
  });
  return specs;
}

// ---- Merged stock items (products + inventory + overrides) ----
export function mergeStockItems(
  inventory: Record<string, InventoryItem>,
  products: Product[],
  stockSpecs: Record<string, Partial<StockItem>>,
  activeHolds?: HoldItem[]
): StockItem[] {
  // Calculate held qty per model
  const heldQty: Record<string, number> = {};
  if (activeHolds) {
    for (const h of activeHolds) {
      if (h.status !== "active" || h.expiresAt < Date.now()) continue;
      for (const item of h.items) {
        heldQty[item.model] = (heldQty[item.model] || 0) + item.qty;
      }
    }
  }
  const pick = <T>(a: T | null | undefined, b: T | null | undefined): T | null =>
    a !== undefined && a !== null && a !== "" ? (a as T) : b !== undefined ? (b as T) : null;

  const items: StockItem[] = [];
  for (const [model, info] of Object.entries(inventory)) {
    if (info.stock <= 0) continue;
    const matched = products.find((p) => {
      const pm = p.model.toUpperCase();
      return pm.includes(model) || model.includes(pm.replace("DH-", ""));
    });
    const ov = stockSpecs[model] || {};
    const availableStock = info.stock - (heldQty[model] || 0);
    if (availableStock <= 0) continue;
    items.push({
      model,
      name: info.name,
      stock: availableStock,
      priceMNT: info.priceMNT,
      priceCNY: matched?.price ?? null,
      mp: pick(matched?.mp, ov.mp) as number | null,
      ir: pick(matched?.ir, ov.ir) as number | null,
      ip: pick(matched?.ip, ov.ip) as string | null,
      type: pick(matched?.type, ov.type) as string | null,
      cat: pick(matched?.cat, ov.cat) as string | null,
      sub: pick(matched?.sub, ov.sub) as string | null,
      desc: (pick(matched?.desc, ov.desc) as string) || "",
      fullModel: matched?.model || model,
      discount: info.discount || 0,
      discountPrice: info.discount ? Math.round(info.priceMNT * (1 - info.discount / 100)) : undefined,
    });
  }
  return items;
}

// ---- Orders ----
export async function createOrder(order: Omit<Order, "id">) {
  const ref = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function getOrders(): Promise<Order[]> {
  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

// ---- Holds (7 day reservation) ----
export async function createHold(hold: Omit<HoldItem, "id">) {
  const ref = await addDoc(collection(db, "holds"), hold);
  return ref.id;
}

export async function getActiveHolds(): Promise<HoldItem[]> {
  const snap = await getDocs(collection(db, "holds"));
  const now = Date.now();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as HoldItem))
    .filter((h) => h.status === "active" && h.expiresAt > now);
}

export async function getUserHolds(userId: string): Promise<HoldItem[]> {
  const snap = await getDocs(
    query(collection(db, "holds"), where("userId", "==", userId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HoldItem));
}

export async function cancelHold(holdId: string) {
  await updateDoc(doc(db, "holds", holdId), { status: "expired" });
}
