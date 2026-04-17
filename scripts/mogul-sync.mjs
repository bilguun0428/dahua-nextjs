#!/usr/bin/env node
// Mogul → Firestore sync script
// Ажиллуулах: node scripts/mogul-sync.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection } from "firebase/firestore";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ---- Firebase config ----
const app = initializeApp({
  apiKey: "AIzaSyDRyXQqpvF9L9D56a100Dk5J23WEGZW3eQ",
  authDomain: "dahua-price.firebaseapp.com",
  projectId: "dahua-price",
  storageBucket: "dahua-price.firebasestorage.app",
  messagingSenderId: "542938400540",
  appId: "1:542938400540:web:529c931d488cb94ee6dcd9",
});
const db = getFirestore(app);

// ---- Mogul config ----
const MOGUL_BASE = "https://green.mogul.mn:8988";
const LOGIN_BODY = { userid: "reseller", password: "12345", companyid: "ITZONE" };

// ---- Model нэрийг itemname-аас гаргах ----
function extractModel(itemname) {
  let m = itemname.match(/(?:DHI?-|DH-|IPC-)[\w-]+/i);
  if (m) return m[0];
  m = itemname.match(/\b(PFA\w+|PFB\w+|ST\d+\w+)\b/i);
  if (m) return m[1];
  m = itemname.match(/Dahua[- ]+([\w-]+)/i);
  if (m) return m[1];
  return null;
}

async function main() {
  console.log("🔄 Mogul → Firestore sync эхэллээ...\n");

  // 1) Login
  console.log("1️⃣  Mogul login...");
  const loginRes = await fetch(`${MOGUL_BASE}/api/auth-service/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(LOGIN_BODY),
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token || loginData.retdata?.access_token;
  if (!token) {
    console.error("❌ Token олдсонгүй!", JSON.stringify(loginData).slice(0, 300));
    process.exit(1);
  }
  console.log("   ✅ Token авлаа\n");

  // 2) Products татах
  console.log("2️⃣  Бүтээгдэхүүн татаж байна...");
  const prodRes = await fetch(
    `${MOGUL_BASE}/api/reseller/getResellerProducts?username=bilguunnewportal`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const prodData = await prodRes.json();
  const items = prodData.retdata || [];
  console.log(`   ✅ ${items.length} бүтээгдэхүүн татлаа\n`);

  if (items.length === 0) {
    console.log("⚠️  Бүтээгдэхүүн хоосон байна. Зогслоо.");
    process.exit(0);
  }

  // 3) Одоогийн inventory-г унших
  console.log("3️⃣  Firestore inventory унших...");
  const existingSnap = await getDocs(collection(db, "inventory"));
  const existingCount = existingSnap.size;
  console.log(`   📦 Одоо ${existingCount} бүтээгдэхүүн байна\n`);

  // 4) Firestore руу бичих
  console.log("4️⃣  Firestore руу бичиж байна...");
  let synced = 0;
  let skipped = 0;

  for (const item of items) {
    const model = extractModel(item.itemname);
    if (!model) {
      console.log(`   ⏭️  Алгассан (model олдоогүй): ${item.itemname.slice(0, 50)}`);
      skipped++;
      continue;
    }

    await setDoc(doc(db, "inventory", model), {
      name: item.itemname.replace(/^[^:]+:\s*Dahua\s*/i, "Dahua ").trim(),
      stock: item.balancestock,
      priceMNT: item.resprice,
      mogulItemId: item.itemid,
      mogulItemCode: item.itemcode,
      mogulCategory: item.categoryname,
      lastSyncedAt: Date.now(),
    }, { merge: true });

    synced++;
    process.stdout.write(`\r   ✍️  ${synced}/${items.length} бичигдлээ`);
  }

  // 5) lastMogulSync timestamp бичих (admin хуудас дээр харуулахын тулд)
  await setDoc(doc(db, "settings", "mogulSync"), {
    lastSyncedAt: Date.now(),
    synced,
    skipped,
    total: items.length,
  });

  console.log(`\n\n✅ Дууслаа!`);
  console.log(`   Шинэчлэгдсэн: ${synced}`);
  console.log(`   Алгассан: ${skipped}`);
  console.log(`   Нийт: ${items.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Алдаа:", err.message);
  process.exit(1);
});
