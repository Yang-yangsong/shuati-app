// app/components/SessionGuard.tsx
"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 登录页不需要查岗
    if (pathname === "/login") return;

    const checkDeviceKick = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 拿出当前浏览器本地存的通行证
      const localToken = localStorage.getItem("my_device_token");
      
      // 【新增修复】：如果你是旧版本保留的登录状态，本地没有通行证，直接强制下线！
      if (!localToken) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // 去数据库查当前唯一合法的通行证
      const { data: activeSession } = await supabase
        .from("active_sessions")
        .select("device_token")
        .eq("user_id", session.user.id)
        .single();

      if (activeSession) {
        // 核心踢出逻辑：本地通行证和云端不一致，说明被挤下线了！
        if (activeSession.device_token !== localToken) {
          alert("下线通知：您的账号已在另一台设备登录！");
          localStorage.removeItem("my_device_token");
          await supabase.auth.signOut(); // 强制清除登录状态
          router.push("/login");         // 踢回登录页
        }
      }
    };

    checkDeviceKick();
    const interval = setInterval(checkDeviceKick, 5000);
    return () => clearInterval(interval);
    
  }, [pathname, router]);

  return null;
}