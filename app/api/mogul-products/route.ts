import { NextResponse } from "next/server";
import https from "node:https";
import type { InventoryItem } from "@/lib/types";

// Энэ route-ыг dynamic байлгана (Next build-д caching хийхгүй)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MOGUL_BASE = process.env.MOGUL_BASE || "https://green.mogul.mn:8988";
const MOGUL_USERID = process.env.MOGUL_USERID || "reseller";
const MOGUL_PASSWORD = process.env.MOGUL_PASSWORD || "12345";
const MOGUL_COMPANYID = process.env.MOGUL_COMPANYID || "ITZONE";
const MOGUL_RESELLER_USERNAME =
  process.env.MOGUL_RESELLER_USERNAME || "bilguunnewportal";

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
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, data: body })
        );
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

interface MogulItem {
  itemid: number;
  itemname: string;
  itemcode: string;
  categoryname: string;
  parentcatname?: string;
  margin?: number;
  resprice: number;
  balanceshop?: number;
  balancestock: number;
}

export async function GET() {
  try {
    // 1) Login
    const loginRes = await httpsRequest(
      `${MOGUL_BASE}/api/auth-service/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userid: MOGUL_USERID,
          password: MOGUL_PASSWORD,
          companyid: MOGUL_COMPANYID,
        }),
      }
    );

    if (loginRes.status < 200 || loginRes.status >= 300) {
      return NextResponse.json(
        {
          error: "Mogul login амжилтгүй",
          status: loginRes.status,
          details: loginRes.data.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const loginData = JSON.parse(loginRes.data);
    const token =
      loginData.access_token ||
      loginData.token ||
      loginData.retdata?.access_token ||
      loginData.retdata?.token;

    if (!token) {
      return NextResponse.json(
        { error: "Token олдсонгүй", details: loginRes.data.slice(0, 300) },
        { status: 502 }
      );
    }

    // 2) Products татах
    const prodRes = await httpsRequest(
      `${MOGUL_BASE}/api/reseller/getResellerProducts?username=${encodeURIComponent(
        MOGUL_RESELLER_USERNAME
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (prodRes.status < 200 || prodRes.status >= 300) {
      return NextResponse.json(
        {
          error: "Mogul бараа татаж чадсангүй",
          status: prodRes.status,
          details: prodRes.data.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const prodData = JSON.parse(prodRes.data);
    const items: MogulItem[] = prodData.retdata || [];

    // 3) InventoryItem хэлбэрт хөрвүүлэх
    const inventory: (InventoryItem & { model: string })[] = [];
    let skipped = 0;
    for (const item of items) {
      const model = extractModel(item.itemname);
      if (!model) {
        skipped++;
        continue;
      }
      inventory.push({
        model,
        name: item.itemname.replace(/^[^:]+:\s*Dahua\s*/i, "Dahua ").trim(),
        stock: item.balancestock ?? 0,
        priceMNT: item.resprice ?? 0,
      });
    }

    return NextResponse.json(
      {
        success: true,
        count: inventory.length,
        skipped,
        total: items.length,
        syncedAt: Date.now(),
        inventory,
      },
      {
        headers: {
          // Browser-ыг cache хийлгэхгүй, үргэлж шинэчилнэ
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Mogul API алдаа", details: msg },
      { status: 500 }
    );
  }
}
