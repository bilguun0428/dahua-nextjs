import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { invalidateCache } from "@/lib/firestore-cache";

// Self-signed cert bypass (Mogul серверт хэрэгтэй)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MOGUL_BASE = "https://green.mogul.mn:8988";
const LOGIN_BODY = {
  userid: "reseller",
  password: "12345",
  companyid: "ITZONE",
};

// Model нэрийг itemname-аас гаргах
function extractModel(itemname: string): string | null {
  // DH-xxx, DHI-xxx, IPC-xxx
  let m = itemname.match(/(?:DHI?-|DH-|IPC-)[\w-]+/i);
  if (m) return m[0];
  // PFA/PFB accessories, HDD
  m = itemname.match(/\b(PFA\w+|PFB\w+|ST\d+\w+)\b/i);
  if (m) return m[1];
  // Fallback: Dahua-XXX
  m = itemname.match(/Dahua[- ]+([\w-]+)/i);
  if (m) return m[1];
  return null;
}

// Mogul categoryname → app-д тохирсон нэр
function mapCategory(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("nvr") || c.includes("recorder")) return "Network Recorders";
  if (c.includes("bullet")) return "Network Cameras";
  if (c.includes("dome")) return "Network Cameras";
  if (c.includes("ptz")) return "PTZ Cameras";
  if (c.includes("indoor box") || c.includes("pin hole")) return "Network Cameras";
  if (c.includes("fire") || c.includes("alarm")) return "Fire Alarm";
  if (c.includes("cctv")) return "Network Cameras";
  if (c.includes("switch") || c.includes("poe")) return "Accessories";
  if (c.includes("cable") || c.includes("connector") || c.includes("rj")) return "Accessories";
  if (c.includes("hdd") || c.includes("surveillance")) return "Accessories";
  if (c.includes("parts") || c.includes("accessories") || c.includes("other")) return "Accessories";
  if (c.includes("home display") || c.includes("video")) return "Wireless Cameras";
  if (c.includes("access control")) return "Accessories";
  return "Other";
}

interface MogulProduct {
  itemid: number;
  itemname: string;
  itemcode: string;
  categoryname: string;
  parentcatname: string;
  margin: number;
  resprice: number;
  balanceshop: number;
  balancestock: number;
  versionid: number;
  unitid: number;
}

export async function POST(req: NextRequest) {
  try {
    // Admin эрх шалгах (хялбаршуулсан — header-аас uid авна)
    const authHeader = req.headers.get("x-admin-uid");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Mogul-аас token авах
    const loginRes = await fetch(`${MOGUL_BASE}/api/auth-service/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(LOGIN_BODY),
      // @ts-expect-error — Node fetch дээр self-signed cert-д хэрэгтэй
      agent: undefined,
    });
    const loginData = await loginRes.json();
    const token =
      loginData.access_token ||
      loginData.token ||
      loginData.retdata?.access_token ||
      loginData.retdata?.token;

    if (!token) {
      return NextResponse.json(
        { error: "Mogul login failed", details: loginData },
        { status: 502 }
      );
    }

    // 2) Бүтээгдэхүүн татах
    const prodRes = await fetch(
      `${MOGUL_BASE}/api/reseller/getResellerProducts?username=bilguunnewportal`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const prodData = await prodRes.json();

    if (prodData.rettype !== 0 || !Array.isArray(prodData.retdata)) {
      return NextResponse.json(
        { error: "Mogul products fetch failed", details: prodData.retmsg },
        { status: 502 }
      );
    }

    const mogulItems: MogulProduct[] = prodData.retdata;

    // 3) Одоогийн inventory унших
    const existingSnap = await getDocs(collection(db, "inventory"));
    const existingModels = new Set(existingSnap.docs.map((d) => d.id));

    // 4) Mogul бүтээгдэхүүн → Firestore inventory бичих
    let synced = 0;
    let skipped = 0;
    const syncedModels = new Set<string>();

    for (const item of mogulItems) {
      const model = extractModel(item.itemname);
      if (!model) {
        skipped++;
        continue;
      }

      const cat = mapCategory(item.categoryname);

      // Firestore inventory doc
      await setDoc(doc(db, "inventory", model), {
        name: item.itemname.replace(/^[^:]+:\s*Dahua\s*/i, "Dahua ").trim(),
        stock: item.balancestock,
        priceMNT: item.resprice,
        mogulItemId: item.itemid,
        mogulItemCode: item.itemcode,
        mogulCategory: item.categoryname,
        mappedCategory: cat,
        mogulMargin: item.margin,
        lastSyncedAt: Date.now(),
      }, { merge: true });

      syncedModels.add(model);
      synced++;
    }

    // 5) Cache хоослох
    invalidateCache("inventory", "products", "holds");

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: mogulItems.length,
      existingBefore: existingModels.size,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error("Mogul sync error:", msg);
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
