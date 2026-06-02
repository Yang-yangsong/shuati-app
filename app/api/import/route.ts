// app/api/import/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // 从你访问的 URL 中提取参数
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const fileName = searchParams.get('file');

    // 拦截错误调用
    if (!subject || !fileName) {
      return NextResponse.json({ 
        success: false, 
        error: "格式错误！请这样访问: /api/import?subject=科目名称&file=文件名.json" 
      });
    }

    const filePath = path.join(process.cwd(), fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const rawQuestions = JSON.parse(fileContents);

    // 在导入数据库前，自动给这批JSON里的每一道题打上“科目”标签
    const questionsWithSubject = rawQuestions.map((q: any) => ({
      ...q,
      subject: subject
    }));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from('questions').insert(questionsWithSubject);
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `太棒了！成功将 ${questionsWithSubject.length} 道【${subject}】的题目导入数据库！` 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}