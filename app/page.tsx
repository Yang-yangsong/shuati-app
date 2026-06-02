// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      // 自动检索数据库里所有的科目和对应的题量
      const { data } = await supabase.from("questions").select("subject");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(q => counts[q.subject] = (counts[q.subject] || 0) + 1);
        
        const subjectList = Object.keys(counts).map(name => ({
          name, count: counts[name]
        }));
        setSubjects(subjectList);
      }
      setLoading(false);
    };
    initData();
  }, [router]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500">大厅加载中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-12">
      {/* 头部区域：新增了退出登录按钮 */}
      <header className="py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">全能刷题大厅</h1>
          <p className="text-sm text-slate-500 mt-1">今天想刷点什么？</p>
        </div>
        <button 
          onClick={async () => {
            if(!confirm("确定要退出登录吗？")) return;
            await supabase.auth.signOut();
            localStorage.removeItem("my_device_token");
            router.push("/login");
          }} 
          className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors px-3 py-1 rounded-md hover:bg-red-50"
        >
          退出登录
        </button>
      </header>

      <main className="space-y-6">
        {subjects.map((sub) => (
          <div key={sub.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">{sub.name}</h2>
              <p className="text-sm text-slate-500">总题数: {sub.count} 题</p>
            </div>
            <div className="space-y-3 mt-6">
              <button 
                onClick={() => router.push(`/exam?mode=random&subject=${encodeURIComponent(sub.name)}`)}
                className="w-full bg-blue-50 text-blue-700 font-medium p-4 rounded-xl text-left hover:bg-blue-100 transition"
              >
                🎲 全部题目 (随机练习)
              </button>
              <button 
                onClick={() => router.push(`/exam?mode=standard&subject=${encodeURIComponent(sub.name)}`)}
                className="w-full bg-indigo-50 text-indigo-700 font-medium p-4 rounded-xl text-left hover:bg-indigo-100 transition"
              >
                📝 抽取不放回 (40题)
              </button>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <div className="text-center text-slate-500 py-10">还没导入任何题库哦</div>}
      </main>
    </div>
  );
}