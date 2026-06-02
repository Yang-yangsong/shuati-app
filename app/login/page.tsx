// app/login/page.tsx 
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. 调用原生的账号密码登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(`登录失败: ${authError.message}`);
      return;
    }

    if (authData.user) {
      // 2. 核心防多开逻辑：生成一个当前设备专属的随机通行证
      const currentDeviceToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // 3. 把这个通行证记录到本地浏览器的 localStorage 里
      localStorage.setItem("my_device_token", currentDeviceToken);

      // 4. 把通行证强制更新到云端数据库（覆盖掉之前其他设备留下的通行证）
      await supabase.from("active_sessions").upsert({
        user_id: authData.user.id,
        device_token: currentDeviceToken,
        last_login: new Date().toISOString(),
      });

      // 5. 跳转到大厅
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-center mb-8">专属刷题神器</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
            <input
              type="email"
              required
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium p-3 rounded-xl hover:bg-blue-700 transition"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}