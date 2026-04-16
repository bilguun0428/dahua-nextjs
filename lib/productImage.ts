// Model name-ээс зураг сонгодог helper
// - Эхлээд бүтэн нэрээр яг таарвал түүнийг сонгоно (special items)
// - Дараа нь prefix match-ээр ерөнхий зураг сонгоно
// - Олдохгүй бол placeholder буцаана

const EXACT_MATCH: Record<string, string> = {
  "DH-C5A": "/products/DH-C5A.webp",
  "DH-H5B": "/products/DH-H5B.jpeg",
  "DH-SD3A405-GN-A-PV1": "/products/DH-SD3A405-GN-A-PV1.jpeg",
  "DHI-HY-1025": "/products/DHI-HY-1025.png",
  "DHI-HY-1301": "/products/DHI-HY-1301.jpg",
  "DHI-HY-1500": "/products/DHI-HY-1500.png",
  "HY-1022R": "/products/HY-1022R.png",
};

// Prefix-ийн дарааллыг анхаарна уу — хамгийн урт/онцлох prefix-ээс эхэлнэ
const PREFIX_RULES: { prefix: string; image: string }[] = [
  { prefix: "HDBW", image: "/products/HDBW.jpeg" },
  { prefix: "HDW", image: "/products/HDW.png" },
  { prefix: "HFW", image: "/products/HFW.png" },
  { prefix: "NVR", image: "/products/NVR.png" },
  { prefix: "SD", image: "/products/PTZ.png" }, // PTZ камер ихэвчлэн SD-ээр эхэлдэг
  { prefix: "PTZ", image: "/products/PTZ.png" },
];

// Keyword-ээр таних (switch, etc.)
const KEYWORD_RULES: { keyword: string; image: string }[] = [
  { keyword: "6-port", image: "/products/switch-6port.png" },
  { keyword: "6 port", image: "/products/switch-6port.png" },
  { keyword: "8-port", image: "/products/switch-8port.png" },
  { keyword: "8 port", image: "/products/switch-8port.png" },
  { keyword: "switch", image: "/products/switch-8port.png" },
];

export function getProductImage(model: string | undefined | null, name?: string): string | null {
  if (!model) return null;
  const m = model.trim().toUpperCase();
  const n = (name || "").toLowerCase();

  // 1) Яг таарсан бүтэн нэр
  for (const key of Object.keys(EXACT_MATCH)) {
    if (m.includes(key.toUpperCase())) return EXACT_MATCH[key];
  }

  // 2) Prefix rules — камер нь "DH-IPC-HDW..." эсвэл "IPC-HDW..." гэх мэтээр эхэлж болно
  // тиймээс string-ийн аль хэсэгт prefix байгааг хардаг
  for (const { prefix, image } of PREFIX_RULES) {
    if (m.includes(prefix.toUpperCase())) return image;
  }

  // 3) Keyword (нэр дээр тулгуурлан)
  for (const { keyword, image } of KEYWORD_RULES) {
    if (n.includes(keyword) || m.includes(keyword.toUpperCase())) return image;
  }

  return null;
}

// Fallback emoji/icon for категориудад — зураг олдохгүй үед
export function getCategoryIcon(cat?: string | null): string {
  if (!cat) return "📦";
  if (cat.includes("Network Cameras")) return "📹";
  if (cat.includes("PTZ")) return "🎯";
  if (cat.includes("Wireless")) return "📡";
  if (cat.includes("Recorders")) return "💾";
  if (cat.includes("Fire")) return "🔥";
  if (cat.includes("Access")) return "🔐";
  if (cat.includes("Intercom")) return "☎️";
  if (cat.includes("Display")) return "🖥️";
  if (cat.includes("Accessories")) return "🔌";
  return "📦";
}
