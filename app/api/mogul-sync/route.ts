import { NextResponse } from "next/server";
import https from "node:https";

const MOGUL_BASE = "https://green.mogul.mn:8988";
const LOGIN_BODY = JSON.stringify({
  userid: "reseller",
  password: "12345",
  companyid: "ITZONE",
});

// Self-signed cert-тэй серверт хандах agent
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
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, data: body }));
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function POST() {
  try {
    // 1) Login → token
    const loginRes = await httpsRequest(`${MOGUL_BASE}/api/auth-service/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: LOGIN_BODY,
    });

    if (loginRes.status !== 200) {
      return NextResponse.json(
        { error: "Mogul login failed", status: loginRes.status, details: loginRes.data.slice(0, 300) },
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
      `${MOGUL_BASE}/api/reseller/getResellerProducts?username=bilguunnewportal`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (prodRes.status !== 200) {
      return NextResponse.json(
        { error: "Mogul products fetch failed", status: prodRes.status, details: prodRes.data.slice(0, 300) },
        { status: 502 }
      );
    }

    const prodData = JSON.parse(prodRes.data);

    if (prodData.rettype !== 0) {
      return NextResponse.json(
        { error: "Mogul API алдаа", details: prodData.retmsg || "Unknown" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      products: prodData.retdata || [],
      total: (prodData.retdata || []).length,
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
