// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 这是一个给前端浏览器环境用的纯客户端实例
export const supabase = createClient(supabaseUrl, supabaseAnonKey)