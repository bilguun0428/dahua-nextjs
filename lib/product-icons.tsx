// Simple SVG icons for each product type
// Used on stock cards to visually distinguish camera types

export function DomeIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="44" rx="22" ry="6" fill="#E5E7EB"/>
      <path d="M10 44C10 44 10 28 32 20C54 28 54 44 54 44" fill="#1E3A8A" stroke="#1E3A8A" strokeWidth="2"/>
      <circle cx="32" cy="36" r="6" fill="#3B82F6" stroke="#fff" strokeWidth="2"/>
      <circle cx="32" cy="36" r="2.5" fill="#1E3A8A"/>
      <ellipse cx="32" cy="44" rx="22" ry="6" fill="none" stroke="#94A3B8" strokeWidth="1.5"/>
    </svg>
  );
}

export function BulletIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="22" width="40" height="20" rx="4" fill="#1E3A8A"/>
      <rect x="44" y="26" width="14" height="12" rx="2" fill="#334155"/>
      <circle cx="28" cy="32" r="7" fill="#3B82F6" stroke="#fff" strokeWidth="2"/>
      <circle cx="28" cy="32" r="3" fill="#1E3A8A"/>
      <rect x="4" y="28" width="8" height="8" rx="2" fill="#64748B"/>
      <rect x="20" y="42" width="4" height="8" rx="1" fill="#94A3B8"/>
      <rect x="36" y="42" width="4" height="8" rx="1" fill="#94A3B8"/>
    </svg>
  );
}

export function PTZIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="44" width="16" height="12" rx="2" fill="#94A3B8"/>
      <rect x="20" y="54" width="24" height="4" rx="2" fill="#64748B"/>
      <ellipse cx="32" cy="32" rx="16" ry="14" fill="#1E3A8A"/>
      <ellipse cx="32" cy="32" rx="12" ry="10" fill="#334155"/>
      <circle cx="32" cy="32" r="6" fill="#3B82F6" stroke="#fff" strokeWidth="1.5"/>
      <circle cx="32" cy="32" r="2.5" fill="#1E3A8A"/>
      <path d="M18 20L22 24M46 20L42 24M18 44L22 40M46 44L42 40" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function TurretIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="46" rx="18" ry="5" fill="#E5E7EB"/>
      <circle cx="32" cy="32" r="16" fill="#1E3A8A"/>
      <circle cx="32" cy="32" r="12" fill="#334155"/>
      <circle cx="32" cy="32" r="7" fill="#3B82F6" stroke="#fff" strokeWidth="2"/>
      <circle cx="32" cy="32" r="3" fill="#1E3A8A"/>
      <path d="M32 46V52" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="32" cy="46" rx="18" ry="5" fill="none" stroke="#94A3B8" strokeWidth="1.5"/>
    </svg>
  );
}

export function NVRIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="18" width="52" height="28" rx="4" fill="#1E3A8A"/>
      <rect x="10" y="22" width="20" height="12" rx="2" fill="#334155"/>
      <rect x="10" y="22" width="20" height="12" rx="2" stroke="#3B82F6" strokeWidth="1"/>
      <circle cx="42" cy="28" r="4" fill="#334155" stroke="#3B82F6" strokeWidth="1"/>
      <rect x="36" y="36" width="16" height="2" rx="1" fill="#3B82F6"/>
      <rect x="10" y="36" width="8" height="2" rx="1" fill="#64748B"/>
      <circle cx="14" cy="28" r="1.5" fill="#22C55E"/>
      <circle cx="20" cy="28" r="1.5" fill="#3B82F6"/>
      <rect x="8" y="46" width="10" height="4" rx="1" fill="#64748B"/>
      <rect x="46" y="46" width="10" height="4" rx="1" fill="#64748B"/>
    </svg>
  );
}

export function SwitchIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="22" width="52" height="20" rx="3" fill="#1E3A8A"/>
      <rect x="10" y="26" width="4" height="6" rx="1" fill="#3B82F6"/>
      <rect x="16" y="26" width="4" height="6" rx="1" fill="#3B82F6"/>
      <rect x="22" y="26" width="4" height="6" rx="1" fill="#3B82F6"/>
      <rect x="28" y="26" width="4" height="6" rx="1" fill="#3B82F6"/>
      <rect x="34" y="26" width="4" height="6" rx="1" fill="#64748B"/>
      <rect x="40" y="26" width="4" height="6" rx="1" fill="#64748B"/>
      <rect x="46" y="26" width="4" height="6" rx="1" fill="#64748B"/>
      <circle cx="12" cy="36" r="1.5" fill="#22C55E"/>
      <circle cx="18" cy="36" r="1.5" fill="#22C55E"/>
      <circle cx="24" cy="36" r="1.5" fill="#22C55E"/>
      <circle cx="30" cy="36" r="1.5" fill="#22C55E"/>
      <circle cx="36" cy="36" r="1.5" fill="#64748B"/>
      <circle cx="42" cy="36" r="1.5" fill="#64748B"/>
      <circle cx="48" cy="36" r="1.5" fill="#64748B"/>
    </svg>
  );
}

export function FireAlarmIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="20" fill="#FEE2E2" stroke="#DC2626" strokeWidth="2"/>
      <path d="M32 18C32 18 24 26 24 34C24 38.4 27.6 42 32 42C36.4 42 40 38.4 40 34C40 26 32 18 32 18Z" fill="#DC2626"/>
      <path d="M32 28C32 28 28 32 28 36C28 38.2 29.8 40 32 40C34.2 40 36 38.2 36 36C36 32 32 28 32 28Z" fill="#F97316"/>
      <circle cx="32" cy="36" r="2" fill="#FDE68A"/>
    </svg>
  );
}

export function PowerSupplyIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="16" width="44" height="32" rx="4" fill="#1E3A8A"/>
      <rect x="14" y="20" width="36" height="24" rx="2" fill="#334155"/>
      <path d="M30 26L26 34H32L28 42" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="42" cy="26" r="2" fill="#22C55E"/>
      <rect x="38" y="32" width="8" height="2" rx="1" fill="#64748B"/>
      <rect x="38" y="36" width="8" height="2" rx="1" fill="#64748B"/>
    </svg>
  );
}

export function WifiCameraIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="20" width="32" height="24" rx="6" fill="#1E3A8A"/>
      <circle cx="32" cy="32" r="7" fill="#3B82F6" stroke="#fff" strokeWidth="2"/>
      <circle cx="32" cy="32" r="3" fill="#1E3A8A"/>
      <path d="M22 14C26 10 38 10 42 14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
      <path d="M26 18C28.5 15.5 35.5 15.5 38 18" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
      <rect x="24" y="44" width="16" height="6" rx="2" fill="#64748B"/>
    </svg>
  );
}

// Map product type/category to icon component
export function getProductIcon(type: string | null, cat: string | null): React.ReactNode {
  // By camera type first
  if (type === "Dome") return <DomeIcon />;
  if (type === "Bullet") return <BulletIcon />;
  if (type === "PTZ") return <PTZIcon />;
  if (type === "Box") return <WifiCameraIcon />;

  // By category
  if (cat === "Network Recorders") return <NVRIcon />;
  if (cat === "Fire Alarm") return <FireAlarmIcon />;
  if (cat === "Accessories") return <PowerSupplyIcon />;
  if (cat === "Wireless Cameras") return <WifiCameraIcon />;
  if (cat === "PTZ Cameras") return <PTZIcon />;

  // Default dome
  return <DomeIcon />;
}
