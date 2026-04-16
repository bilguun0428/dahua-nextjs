"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/lib/toast";
import { AuthGuard } from "@/lib/auth-guard";
import { Navbar } from "@/lib/navbar";
import { PromoPopup } from "@/lib/promo-popup";

const PUBLIC_PATHS = ["/login"];

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <Inner>{children}</Inner>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <Navbar />
      {children}
      <PromoPopup />
    </AuthGuard>
  );
}
