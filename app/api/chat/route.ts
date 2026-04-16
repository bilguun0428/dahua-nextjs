import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, message, productContext } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API key шаардлагатай" }, { status: 400 });
    }

    const systemPrompt = `Та Dahua бүтээгдэхүүний AI зөвлөх. Хэрэглэгчийн хэрэгцээнд тохирох Dahua бүтээгдэхүүн санал болгоно.
Хариултаа Монгол хэлээр өгнө. Бүтээгдэхүүний модел нэр, техникийн үзүүлэлт, үнэ (MNT)-г оруулна.
Хэрэв тохирох бүтээгдэхүүн олдвол ###MODELS###["model1","model2"]###END### хэлбэрээр модел жагсааж өгнө.

Бэлэн барааны жагсаалт:
${productContext || "Мэдээлэл байхгүй"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const aiText = data.content?.[0]?.text || "Хариу ирсэнгүй";

    // Extract recommended models
    let recommendedModels: string[] = [];
    const match = aiText.match(/###MODELS###(.+?)###END###/);
    if (match) {
      try { recommendedModels = JSON.parse(match[1]); } catch {}
    }

    const cleanResponse = aiText.replace(/###MODELS###.+?###END###/, "").trim();

    return NextResponse.json({ response: cleanResponse, recommendedModels });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}
