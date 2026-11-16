import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export interface DbDailyActivity {
  id?: string;
  date: string; // 'YYYY-MM-DD'
  platform: 'x' | 'li';
  posts: number;
  replies: number;
  views: number;
  likes: number;
  updated_at?: string;
}

export interface DbPost {
  id?: string;
  platform: 'x' | 'li';
  platform_post_id: string;
  content: string;
  published_at: string; // ISO date string
  views: number;
  replies: number;
  likes: number;
  url?: string;
  updated_at?: string;
}

export interface DbGoal {
  id?: string;
  platform: 'x' | 'li';
  daily_posts: number;
  daily_replies: number;
  updated_at?: string;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
