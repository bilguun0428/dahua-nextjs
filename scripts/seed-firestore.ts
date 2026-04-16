/**
 * Seed Firestore with products, inventory, and stock specs data.
 * Run: npx tsx scripts/seed-firestore.ts
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyDRyXQqpvF9L9D56a100Dk5J23WEGZW3eQ",
  authDomain: "dahua-price.firebaseapp.com",
  databaseURL: "https://dahua-price-default-rtdb.firebaseio.com",
  projectId: "dahua-price",
  storageBucket: "dahua-price.firebasestorage.app",
  messagingSenderId: "542938400540",
  appId: "1:542938400540:web:529c931d488cb94ee6dcd9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedProducts() {
  const raw = fs.readFileSync(
    path.join(__dirname, "../../products.json"),
    "utf-8"
  );
  const products = JSON.parse(raw);
  console.log(`Seeding ${products.length} products...`);

  // Firestore batch write (max 500 per batch)
  for (let i = 0; i < products.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = products.slice(i, i + 400);
    for (const p of chunk) {
      const docId = p.model.replace(/\//g, "_"); // safe doc ID
      batch.set(doc(db, "products", docId), {
        model: p.model,
        cat: p.category || p.cat || "",
        sub: p.subCategory || p.sub || "",
        type: p.cameraType || p.type || "",
        mp: p.mp ?? null,
        ir: p.irDistance ?? p.ir ?? null,
        ip: p.ipRating ?? p.ip ?? null,
        price: p.price || 0,
        desc: p.description || p.desc || "",
      });
    }
    await batch.commit();
    console.log(`  Batch ${Math.floor(i / 400) + 1} committed (${chunk.length} docs)`);
  }
  console.log("Products done!");
}

async function seedInventory() {
  const raw = fs.readFileSync(
    path.join(__dirname, "../../inv_lookup.json"),
    "utf-8"
  );
  const inv = JSON.parse(raw);
  const entries = Object.entries(inv);
  console.log(`Seeding ${entries.length} inventory items...`);

  const batch = writeBatch(db);
  for (const [model, info] of entries) {
    batch.set(doc(db, "inventory", model), info as Record<string, unknown>);
  }
  await batch.commit();
  console.log("Inventory done!");
}

async function seedStockSpecs() {
  // These are the manual spec overrides from the HTML app
  const STOCK_SPECS: Record<string, Record<string, unknown>> = {
    "DHI-HY-1022R": { cat: "Fire Alarm", sub: "HY-1022", type: null, desc: "Addressable fire alarm control panel with optional printer. Up to 2 loops, 504 addressable points." },
    "DHI-HY-1025": { cat: "Fire Alarm", sub: "HY-1025", type: null, desc: "Addressable fire alarm control panel (2 loops, 504 addressable points). LCD display, event log." },
    "DHI-HY-1301": { cat: "Fire Alarm", sub: "HY-1300", type: null, desc: "Addressable photoelectric smoke detector. Low-power design, LED indicator." },
    "DHI-HY-1200": { cat: "Fire Alarm", sub: "HY-1200", type: null, desc: "Addressable manual call point with glass break element." },
    "DHI-HY-1500": { cat: "Fire Alarm", sub: "HY-1500", type: null, desc: "Addressable sounder / fire alarm sounder." },
    "DHI-HY-1431": { cat: "Fire Alarm", sub: "HY-1400", type: null, desc: "Addressable fire alarm system module." },
    "DHI-HY-TCDZ": { cat: "Fire Alarm", sub: "HY-Module", type: null, desc: "Addressable single input/output module (TCDZ)." },
    "DHI-HY-MKDZ2": { cat: "Fire Alarm", sub: "HY-Module", type: null, desc: "Addressable dual input module (MKDZ2)." },
    "DHI-HY-ANDZ": { cat: "Fire Alarm", sub: "HY-Module", type: null, desc: "Addressable input module (ANDZ)." },
    "DHI-HY-SGDZ": { cat: "Fire Alarm", sub: "HY-Module", type: null, desc: "Addressable output/control module (SGDZ)." },
    "DH-NVR4104HS-4KS3": { cat: "Network Recorders", sub: "Lite 4KS3", type: null, desc: "4-channel compact 1U NVR, H.265+, 1 SATA, 4K HDMI." },
    "DH-NVR4108HS-4KS3": { cat: "Network Recorders", sub: "Lite 4KS3", type: null, desc: "8-channel compact 1U NVR, H.265+, 1 SATA, 4K HDMI." },
    "DH-NVR4116HS-4KS3": { cat: "Network Recorders", sub: "Lite 4KS3", type: null, desc: "16-channel compact 1U NVR, H.265+, 1 SATA, 4K HDMI." },
    "DH-NVR4232-4KS3": { cat: "Network Recorders", sub: "Lite 4KS3", type: null, desc: "32-channel 1U 2HDD NVR, H.265+, 2 SATA, 4K HDMI/VGA." },
    "DH-C5A": { cat: "Wireless Cameras", sub: "Wi-Fi Cube", type: "Box", mp: 5, ir: 10, ip: null, desc: "5MP indoor Wi-Fi cube camera, IR 10m, mic & speaker." },
    "DH-H5B": { cat: "Wireless Cameras", sub: "Wi-Fi P&T", type: "PTZ", mp: 5, ir: 10, ip: null, desc: "5MP indoor Wi-Fi pan & tilt camera, 355°/83° rotation, IR 10m." },
    "DH-IPC-HDW1839T-A-IL": { cat: "Network Cameras", sub: "Lite", type: "Dome", mp: 8, ir: 30, ip: "IP67", desc: "8MP Lite Eyeball Dual Illumination, IR 30m, built-in mic." },
    "DH-IPC-HDW1839TN-A-IL-0280B": { cat: "Network Cameras", sub: "Lite", type: "Dome", mp: 8, ir: 30, ip: "IP67", desc: "8MP Lite 2.8mm Eyeball Dual Illumination, IR 30m." },
    "DH-IPC-HFW1839T-A-IL": { cat: "Network Cameras", sub: "Lite", type: "Bullet", mp: 8, ir: 50, ip: "IP67", desc: "8MP Lite Bullet Dual Illumination, IR 50m." },
    "DH-IPC-HFW1839TN-A-IL-0280B": { cat: "Network Cameras", sub: "Lite", type: "Bullet", mp: 8, ir: 50, ip: "IP67", desc: "8MP Lite 2.8mm Bullet Dual Illumination, IR 50m." },
    "DH-IPC-HDW2849T-S-IL-0280B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Dome", mp: 8, ir: 30, ip: "IP67", desc: "8MP WizSense 2.0 Eyeball 2.8mm, IR 30m, SMD Plus." },
    "DH-IPC-HFW2849T-AS-IL": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Bullet", mp: 8, ir: 60, ip: "IP67", desc: "8MP WizSense 2.0 Bullet, IR 60m, SMD Plus." },
    "DH-IPC-HFW2849T-AS-IL-0360B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Bullet", mp: 8, ir: 60, ip: "IP67", desc: "8MP WizSense 2.0 Bullet 3.6mm, IR 60m." },
    "DH-IPC-HDW2449T-S-IL": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Dome", mp: 4, ir: 30, ip: "IP67", desc: "4MP WizSense 2.0 Eyeball, IR 30m, SMD Plus." },
    "DH-IPC-HDW2449T-S-IL-0280B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Dome", mp: 4, ir: 30, ip: "IP67", desc: "4MP WizSense 2.0 Eyeball 2.8mm, IR 30m." },
    "DH-IPC-HDW2449TP-S-IL-0280B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Dome", mp: 4, ir: 30, ip: "IP67", desc: "4MP WizSense 2.0 Eyeball 2.8mm PoE, IR 30m." },
    "DH-IPC-HFW2449T-AS-IL": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Bullet", mp: 4, ir: 60, ip: "IP67", desc: "4MP WizSense 2.0 Bullet, IR 60m, SMD Plus." },
    "DH-IPC-HFW2449T-AS-IL-0360B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Bullet", mp: 4, ir: 60, ip: "IP67", desc: "4MP WizSense 2.0 Bullet 3.6mm, IR 60m." },
    "DH-IPC-HDW2441T-S-0280B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Dome", mp: 4, ir: 40, ip: "IP67", desc: "4MP WizSense 2.0 Eyeball 2.8mm, IR 40m." },
    "DH-IPC-HDBW2441E-S-0280B": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Dome", mp: 4, ir: 40, ip: "IP67", desc: "4MP WizSense 2.0 Vandal Dome 2.8mm, IK10, IR 40m." },
    "DH-IPC-HFW2441T-ZAS-S2": { cat: "Network Cameras", sub: "WizSense 2.0", type: "Bullet", mp: 4, ir: 60, ip: "IP67", desc: "4MP WizSense 2.0 Vari-focal Bullet, 2.7-13.5mm, IR 60m." },
    "DH-IPC-HDBW3441F-AS-S2": { cat: "Network Cameras", sub: "WizSense Pro", type: "Dome", mp: 4, ir: 30, ip: "IP67", desc: "4MP WizSense Pro Vandal Dome, IK10, IR 30m, face detection." },
    "DH-IPC-HDBW3441FP-AS-S2": { cat: "Network Cameras", sub: "WizSense Pro", type: "Dome", mp: 4, ir: 30, ip: "IP67", desc: "4MP WizSense Pro Vandal Dome PoE, IK10, IR 30m." },
    "DH-IPC-HDBW3441E-AS-S2": { cat: "Network Cameras", sub: "WizSense Pro", type: "Dome", mp: 4, ir: 40, ip: "IP67", desc: "4MP WizSense Pro Eyeball Vandal Dome, IK10, IR 40m." },
    "DH-IPC-HFW3441T-ZAS-S2": { cat: "Network Cameras", sub: "WizSense Pro", type: "Bullet", mp: 4, ir: 60, ip: "IP67", desc: "4MP WizSense Pro Vari-focal Bullet, 2.7-13.5mm, IR 60m." },
    "DH-SD3A405-GN-A-PV1": { cat: "PTZ Cameras", sub: "WizSense TiOC", type: "PTZ", mp: 4, ir: 30, ip: "IP66", desc: "4MP 5x Starlight IR WizSense PTZ with active deterrence, IR 30m." },
    "DH-PFM350-900": { cat: "Accessories", sub: "Power Supply", type: null, desc: "12V DC switching power supply, 900W / 75A." },
  };

  console.log(`Seeding ${Object.keys(STOCK_SPECS).length} stock specs...`);
  const batch = writeBatch(db);
  for (const [model, spec] of Object.entries(STOCK_SPECS)) {
    batch.set(doc(db, "stockSpecs", model), spec);
  }
  await batch.commit();
  console.log("Stock specs done!");
}

async function main() {
  console.log("Starting Firestore seed...\n");
  await seedProducts();
  await seedInventory();
  await seedStockSpecs();
  console.log("\nAll done! Data is now in Firestore.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
