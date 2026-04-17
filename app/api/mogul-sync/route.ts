import { NextRequest, NextResponse } from "next/server";

// Self-signed cert bypass
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MOGUL_BASE = "https://green.mogul.mn:8988";
const LOGIN_BODY = {
  userid: "reseller",
  password: "12345",
  companyid: "ITZONE",
};

// Энэ route зөвхөн Mogul API-г proxy хийнэ.
// Firestore бичилтийг admin хуудас client-side дээрээс хийнэ.
export async function POST(req: NextRequest) {
  try {
    // 1) Mogul login → token
    const loginRes = await fetch(`${MOGUL_BASE}/api/auth-service/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(LOGIN_BODY),
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      return NextResponse.json(
        { error: "Mogul login failed", status: loginRes.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const loginData = await loginRes.json();
    const token =
      loginData.access_token ||
      loginData.token ||
      loginData.retdata?.access_token ||
      loginData.retdata?.token;

    if (!token) {
      return NextResponse.json(
        { error: "Token not found in login response", details: JSON.stringify(loginData).slice(0, 500) },
        { status: 502 }
      );
    }

    // 2) Products татах
    const prodRes = await fetch(
      `${MOGUL_BASE}/api/reseller/getResellerProducts?username=bilguunnewportal`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!prodRes.ok) {
      const text = await prodRes.text();
      return NextResponse.json(
        { error: "Mogul products fetch failed", status: prodRes.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const prodData = await prodRes.json();

    if (prodData.rettype !== 0) {
      return NextResponse.json(
        { error: "Mogul API error", details: prodData.retmsg || JSON.stringify(prodData).slice(0, 500) },
        { status: 502 }
      );
    }

    // 3) Өгөгдлийг шууд буцаана — Firestore бичилтийг client хийнэ
    return NextResponse.json({
      success: true,
      products: prodData.retdata || [],
      total: prodData.totalrow || (prodData.retdata || []).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Mogul proxy error:", msg);
    return NextResponse.json(
      { error: "Mogul серверт холбогдож чадсангүй", details: msg },
      { status: 500 }
    );
  }
}
