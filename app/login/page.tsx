"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
      if (msg.includes("user-not-found") || msg.includes("invalid-credential")) {
        setError("И-мэйл эсвэл нууц үг буруу байна");
      } else {
        setError("Нэвтрэх боломжгүй. Админтай холбогдоно уу.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">D</div>
          <h1 className="text-2xl font-bold text-white">Dahua Product Finder</h1>
          <p className="text-gray-400 text-sm mt-1">ITZONE LLC</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Нэвтрэх</h2>
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">И-мэйл</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@company.mn"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Нууц үг</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? "Түр хүлээнэ үү..." : "Нэвтрэх"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">Бүртгэлгүй бол админтай холбогдоно уу</p>
        </div>
      </div>
    </div>
  );
}
