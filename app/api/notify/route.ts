import { NextRequest, NextResponse } from "next/server";

// Simple email notification endpoint
// In production, connect to Resend, SendGrid, or Gmail API
export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    // Log for now — replace with actual email service
    console.log(`[NOTIFICATION] ${type}:`, JSON.stringify(data, null, 2));

    // TODO: Integrate with email service
    // Example with Resend:
    // await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     from: "noreply@itzone.mn",
    //     to: "bilguun.b@itzone.mn",
    //     subject: `Шинэ ${type === "order" ? "захиалга" : "hold"} ирлээ!`,
    //     html: `<h2>${type === "order" ? "Шинэ захиалга" : "Шинэ hold"}</h2><p>Дүн: ₮${data.totalMNT?.toLocaleString()}</p><p>${data.items?.length} бараа</p>`,
    //   }),
    // });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notification error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
