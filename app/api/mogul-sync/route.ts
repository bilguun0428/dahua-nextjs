import { NextResponse } from "next/server";
import https from "node:https";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MOGUL_BASE = "https://green.mogul.mn:8988";
const LOGIN_BODY = JSON.stringify({
  userid: "reseller",
  password: "12345",
  companyid: "ITZONE",
});

const agent = new https.Agent({ rejectUnauthorized: false });

function httpsRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
        agent,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, data: body }));
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function extractModel(itemname: string): string | null {
  let m = itemname.match(/(?:DHI?-|DH-|IPC-)[\w-]+/i);
  if (m) return m[0];
  m = itemname.match(/\b(PFA\w+|PFB\w+|ST\d+\w+)\b/i);
  if (m) return m[1];
  m = itemname.match(/Dahua[- ]+([\w-]+)/i);
  if (m) return m[1];
  return null;
}

export async function POST() {
  try {
    // 1) Login
    const loginRes = await httpsRequest(`${MOGUL_BASE}/api/auth-service/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: LOGIN_BODY,
    });
    const loginData = JSON.parse(loginRes.data);
    const token =
      loginData.access_token || loginData.token ||
      loginData.retdata?.access_token || loginData.retdata?.token;

    if (!token) {
      return NextResponse.json({ error: "Token олдсонгүй", details: loginRes.data.slice(0, 300) }, { status: 502 });
    }

    // 2) Products
    const prodRes = await httpsRequest(
      `${MOGUL_BASE}/api/reseller/getResellerProducts?username=bilguunnewportal`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const prodData = JSON.parse(prodRes.data);
    const items = prodData.retdata || [];

    // 3) Firestore бичих
    let synced = 0;
    let skipped = 0;
    for (const item of items) {
      const model = extractModel(item.itemname);
      if (!model) { skipped++; continue; }
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
    }

    // 4) Sync status бичих
    await setDoc(doc(db, "settings", "mogulSync"), {
      lastSyncedAt: Date.now(),
      synced,
      skipped,
      total: items.length,
    });

    return NextResponse.json({ success: true, synced, skipped, total: items.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Sync алдаа", details: msg }, { status: 500 });
  }
}
