export interface Product {
  model: string;
  cat: string;      // category e.g. "Network Cameras"
  sub: string;      // subcategory/series
  type: string;     // Dome, Bullet, PTZ, Box
  mp: number | null;
  ir: number | null;
  ip: string | null;
  price: number;    // CNY price
  desc: string;
}

export interface InventoryItem {
  model: string;
  name: string;
  stock: number;
  priceMNT: number;
  discount?: number; // 0-100 хувь
}

export interface StockItem extends InventoryItem {
  priceCNY: number | null;
  mp: number | null;
  ir: number | null;
  ip: string | null;
  type: string | null;
  cat: string | null;
  sub: string | null;
  desc: string;
  fullModel: string;
  discountPrice?: number; // auto-calculated
}

export interface CartItem {
  model: string;
  name: string;
  priceMNT: number;
  priceCNY: number;
  qty: number;
}

export interface Order {
  id?: string;
  userId?: string;
  userEmail?: string;
  items: CartItem[];
  totalMNT: number;
  createdAt: Date;
  status: "pending" | "confirmed" | "delivered";
  deliveryType: "delivery" | "pickup";
  address?: string;
  pickupLocation?: string;
  note?: string;
}

export interface HoldItem {
  id?: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  createdAt: number;
  expiresAt: number; // 7 days from createdAt
  status: "active" | "expired" | "completed";
}

export const PICKUP_LOCATIONS = [
  { id: "office", name: "ITZONE Оффис", address: "УБ, СБД, 1-р хороо, Энхтайваны өргөн чөлөө 5" },
  { id: "warehouse", name: "ITZONE Агуулах", address: "УБ, БЗД, 3-р хороо, Зүүн 4 зам" },
];

// Category label translations
export const catMN: Record<string, string> = {
  "Network Cameras": "Сүлжээний камер",
  "PTZ Cameras": "PTZ камер",
  "Thermal Cameras": "Дулааны камер",
  "Wireless Cameras": "Утасгүй камер",
  "Network Recorders": "NVR бичигч",
  "Accessories": "Дагалдах хэрэгсэл",
  "Access Control&Time Attendance": "Нэвтрэх хяналт",
  "Display": "Дэлгэц",
  "Transmission": "Дамжуулалт",
  "Traffic": "Замын хөдөлгөөн",
  "Mobile": "Мобайл",
  "Video Intercoms": "Видео интерком",
  "Fire Alarm": "Галын дохиолол",
  "Software": "Программ хангамж",
  "Alarms": "Дохиолол",
  "Interactive Whiteboard": "Интерактив самбар",
  "Control": "Удирдлага",
  "Dahua Memory": "Санах ой",
  "Intelligent Computing": "Ухаалаг тооцоолол",
  "Storage": "Хадгалалт",
};

export const typeMN: Record<string, string> = {
  Bullet: "Bullet (Сумтай)",
  Dome: "Dome (Бөмбөрцөг)",
  PTZ: "PTZ (Эргэлддэг)",
  Box: "Box (Хайрцагтай)",
  "Multi-Sensor": "Multi-Sensor",
};

// Quick category config for UI
export const QUICK_CATEGORIES = [
  { key: "Network Cameras", icon: "📹", label: "CCTV" },
  { key: "PTZ Cameras", icon: "🎯", label: "PTZ" },
  { key: "Wireless Cameras", icon: "📡", label: "Wi-Fi" },
  { key: "Network Recorders", icon: "💾", label: "NVR" },
  { key: "Fire Alarm", icon: "🔥", label: "Галын дохиолол" },
  { key: "Accessories", icon: "🔌", label: "Дагалдах" },
];

// Bundles (багц)
export interface BundleItem {
  model: string;
  qty: number;
}

export interface Bundle {
  id?: string;
  name: string;         // "4 камертай багц"
  description: string;  // Тодорхойлолт
  items: BundleItem[];  // Бүтээгдэхүүнүүд
  priceMNT: number;     // Багцын нийт үнэ (хямдарсан)
  originalMNT?: number; // Тус тусдаа авсан бол
  image?: string;
  tag?: string;         // "4 камер", "8 камер", "16 камер"
  active: boolean;
}

// CNY to MNT conversion
export function calcOrderMNT(priceCNY: number): number {
  return Math.round(priceCNY * 520 * 1.47);
}

// News / FAQ
export interface NewsItem {
  id?: string;
  title: string;
  body: string;
  type: "news" | "faq";
  image?: string; // URL
  createdAt: number;
  pinned?: boolean;
  isPopup?: boolean; // Нэвтэрсэн хэрэглэгчид popup хэлбэрээр харуулах уу
}
