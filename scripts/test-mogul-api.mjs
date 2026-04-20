// Mogul API тест. Ажиллуулах: node scripts/test-mogul-api.mjs

const BASE = "https://green.mogul.mn:8988";

// 1) Login хийж token авах
async function getToken() {
  const res = await fetch(`${BASE}/api/auth-service/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userid: "reseller",
      password: "12345",
      companyid: "ITZONE",
    }),
  });
  const json = await res.json();
  console.log("=== LOGIN RESPONSE ===");
  console.log("Status:", res.status);
  console.log("Body:", JSON.stringify(json, null, 2).slice(0, 500));
  return json.access_token || json.token || json.retdata?.access_token || json.retdata?.token;
}

// 2) Token-оор бүтээгдэхүүн авах
async function getProducts(token) {
  const res = await fetch(`${BASE}/api/reseller/getResellerProducts?username=`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  console.log("\n=== PRODUCTS RESPONSE ===");
  console.log("Status:", res.status);
  console.log("rettype:", json.rettype);
  console.log("retmsg:", json.retmsg);
  console.log("totalrow:", json.totalrow);

  // retdata доторх бүтээгдэхүүнүүд
  const items = Array.isArray(json.retdata) ? json.retdata : [];
  console.log("Нийт бүтээгдэхүүн:", items.length);

  if (items.length > 0) {
    console.log("\n=== ЭХНИЙ БҮТЭЭГДЭХҮҮН (field бүтэц) ===");
    console.log(JSON.stringify(items[0], null, 2));
    console.log("\n=== Field нэрс ===");
    console.log(Object.keys(items[0]));
  }

  // Бүтэн хариуг файлд хадгалах
  const fs = await import("node:fs");
  fs.writeFileSync("scripts/mogul-products.json", JSON.stringify(json, null, 2));
  console.log("\nБүтэн хариуг scripts/mogul-products.json файлд хадгаллаа.");
}

// Node 18+ fetch нь self-signed cert-г reject хийдэг
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

try {
  const token = await getToken();
  if (!token) {
    console.error("\nToken олдсонгүй! Login хариуг дээрх мөрөөс харна уу.");
    process.exit(1);
  }
  console.log("\nToken:", token.slice(0, 30) + "...");
  await getProducts(token);
} catch (err) {
  console.error("Алдаа:", err.message);
}
