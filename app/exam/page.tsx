"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";

function QuestionCard({ data, index, selectedOpts, onChange, isGraded }: { data: any; index: number; selectedOpts: string[]; onChange: (opts: string[]) => void; isGraded: boolean }) {
  const [showAnswer, setShowAnswer] = useState(false);
  
  // 【新增】利用 React 的 useMemo，保证只有在题目变化时才洗牌一次，不会乱跳
  const shuffledOptions = useState(() => {
    const entries = Object.entries(data.options);
    // Fisher-Yates 洗牌
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries;
  })[0];

  const handleOptionClick = (key: string) => {
    if (isGraded || showAnswer) return;
    if (data.type === "多选题") {
      const newOpts = selectedOpts.includes(key) ? selectedOpts.filter((k) => k !== key) : [...selectedOpts, key];
      onChange(newOpts);
    } else {
      onChange([key]);
    }
  };

  const effectivelyShow = isGraded || showAnswer;

  const getOptionStyle = (key: string) => {
    const isSelected = selectedOpts.includes(key);
    // 【关键】这里判断正确与否：不再看 key，而是看 data.answer 字符串里有没有这个字母
    const isCorrect = data.answer.includes(key);

    if (!effectivelyShow) {
      return isSelected ? "bg-blue-100 border-blue-400 text-blue-800 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50";
    }
    if (isCorrect) return "bg-green-100 border-green-500 text-green-800 font-bold";
    if (isSelected && !isCorrect) return "bg-red-100 border-red-500 text-red-800 line-through";
    return "bg-slate-50 border-slate-200 opacity-50";
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-medium">{data.type}</span>
      </div>
      <h2 className="text-base font-medium leading-relaxed mb-4 text-slate-800">
        {index + 1}. {data.question}
      </h2>
      <div className="space-y-3 mb-4">
        {shuffledOptions.map(([key, value]) => (
          <button
            key={key}
            onClick={() => handleOptionClick(key)}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${getOptionStyle(key)}`}
          >
            {/* 这里的 key 依然是原来的 A/B/C/D，所以点击后对应的逻辑依然是对的 */}
            <span className="font-semibold mr-2">{key}.</span> {value as string}
          </button>
        ))}
      </div>
      {!isGraded && (
        <div className="flex justify-end">
          <button onClick={() => setShowAnswer(!showAnswer)} className="text-sm font-medium text-slate-500 hover:text-blue-600 transition">
            {showAnswer ? "隐藏答案" : "👀 一键看答案"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- 洗牌算法工具 ---
function shuffleArray(array: any[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// --- 核心答题区 ---
function ExamArea() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");
  const subject = searchParams.get("subject"); // 获取大厅传来的科目名
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string[]>>({});
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [score, setScore] = useState(0);
  
  // 进度数据
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // 核心变动：只拉取当前选择科目的题目！
      const { data: allQuestions } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", subject); 

      if (!allQuestions) return;
      
      setTotalQuestions(allQuestions.length);

      if (mode === "random") {
        setQuestions(shuffleArray(allQuestions));
      } 
      else if (mode === "standard") {
        const { data: progressData } = await supabase.from("user_progress").select("question_id").eq("user_id", user.id);
        const doneIds = new Set(progressData?.map(p => p.question_id) || []);
        
        setDoneCount(doneIds.size);
        const available = allQuestions.filter(q => !doneIds.has(q.id));

        const singles = shuffleArray(available.filter(q => q.type === "单选题")).slice(0, 15);
        const multis = shuffleArray(available.filter(q => q.type === "多选题")).slice(0, 10);
        const tfs = shuffleArray(available.filter(q => q.type === "判断题")).slice(0, 15);

        setQuestions([...singles, ...multis, ...tfs]);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [mode, subject, router]);

  // 更新答案记录
  const handleAnswerChange = (index: number, opts: string[]) => {
    setUserAnswers(prev => ({ ...prev, [index]: opts }));
  };

  // 交卷并批改
  const handleSubmit = async () => {
    if (!confirm("确定交卷吗？系统将自动批改并打分。")) return;
    setIsSubmitting(true);
    
    // 1. 本地批改算分
    let correct = 0;
    questions.forEach((q, i) => {
      // 将用户选的数组（如['C','A']）和正确答案（如'AC'）分别排序比对
      const userAns = (userAnswers[i] || []).sort().join('');
      const correctAns = q.answer.split('').sort().join('');
      if (userAns === correctAns) correct++;
    });
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setIsGraded(true);

    // 2. 将做过的题录入数据库进度
    const { data: { user } } = await supabase.auth.getUser();
    if (user && questions.length > 0) {
      const records = questions.map(q => ({ user_id: user.id, question_id: q.id }));
      await supabase.from("user_progress").upsert(records, { onConflict: 'user_id, question_id' });
      setDoneCount(prev => prev + questions.length); // 更新已刷题数
    }
    setIsSubmitting(false);
  };

  // 重置题库：只清空当前科目的记录
  const handleReset = async () => {
    if (!confirm("警告：这将清空你当前科目所有的刷题记录，确定要重新开始吗？")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 获取当前科目的所有题目ID
      const { data: subjectQuestions } = await supabase.from("questions").select("id").eq("subject", subject);
      if (subjectQuestions) {
        const questionIds = subjectQuestions.map(q => q.id);
        // 删除进度表中属于该用户的、且属于当前科目的记录
        await supabase.from("user_progress").delete().eq("user_id", user.id).in("question_id", questionIds);
        window.location.reload(); // 刷新页面重新拉取
      }
    }
  };

  // 继续刷题
  const handleContinue = () => {
    window.location.reload(); 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">题库分发中...</div>;

  // 题库刷完的空状态
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="text-xl font-bold text-slate-800">🎉 太强了！</div>
        <p className="text-slate-500">【{subject}】题库的所有题目已被你刷完！</p>
        <div className="flex gap-4 mt-4">
           <button onClick={() => router.push("/")} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl">返回大厅</button>
           {mode === "standard" && (
              <button onClick={handleReset} className="bg-blue-600 text-white px-6 py-2 rounded-xl shadow-lg">重置本题库再刷一遍</button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center shrink-0">
        <button onClick={() => router.push("/")} className="text-slate-500 font-medium">{"< 大厅"}</button>
        {/* 顶部标题动态显示当前科目 */}
        <span className="text-sm font-bold text-slate-800 max-w-[50%] truncate text-center">
          {subject} - {mode === "random" ? "随机模式" : "闯关模式"}
        </span>
        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded whitespace-nowrap">共 {questions.length} 题</span>
      </header>

      {/* 底部留出足够的空间，防止被固定的面板挡住最后一题 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        {questions.map((q, index) => (
          <QuestionCard 
            key={q.id} 
            data={q} 
            index={index} 
            selectedOpts={userAnswers[index] || []}
            onChange={(opts) => handleAnswerChange(index, opts)}
            isGraded={isGraded}
          />
        ))}
      </main>

      {/* 固定的操作/结果面板 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        {!isGraded ? (
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50"
           >
             {isSubmitting ? "正在批改..." : "✅ 确认交卷并查分"}
           </button>
        ) : (
           <div className="space-y-4">
              <div className="flex justify-between items-end">
                 <div>
                    <span className="text-sm text-slate-500 block mb-1">本次得分</span>
                    <span className="text-4xl font-black text-blue-600">{score}</span>
                    <span className="text-slate-500 font-medium ml-1">分</span>
                 </div>
                 {mode === "standard" && (
                    <div className="text-right">
                       <span className="text-sm text-slate-500 block">本题库进度</span>
                       <span className="text-slate-800 font-medium">已刷 {doneCount} / 剩 {totalQuestions - doneCount} 题</span>
                    </div>
                 )}
              </div>
              <div className="flex gap-3">
                 <button onClick={() => router.push("/")} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium">大厅</button>
                 {mode === "standard" && (
                    <button onClick={handleReset} className="flex-[1.5] bg-red-50 text-red-600 py-3 rounded-xl font-medium">重置题库</button>
                 )}
                 {((mode === "standard" && (totalQuestions - doneCount) > 0) || mode === "random") && (
                    <button onClick={handleContinue} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-medium shadow-md">
                       继续下一套
                    </button>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">加载中...</div>}>
      <ExamArea />
    </Suspense>
  );
}