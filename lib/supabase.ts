/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ozjpffscpaogxwujvtqd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96anBmZnNjcGFvZ3h3dWp2dHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5ODQxMzQsImV4cCI6MjEwMTU2MDEzNH0.mmqTrvCGF1rvwTruPWUt_y0WwPWeENV9C_kwYmkm88A';

let cachedClient: SupabaseClient | null = null;

function getCredentials(): { url: string; key: string } {
  let url = import.meta.env.VITE_SUPABASE_URL || '';
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || url.includes('your-supabase-project-id') || url.includes('your-project-id') || url.includes('example')) {
    const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
    if (customUrl) {
      url = customUrl;
    } else {
      url = DEFAULT_SUPABASE_URL;
    }
  }

  if (!key || key === 'your-supabase-anon-key' || key === 'your-actual-supabase-anon-key') {
    const customKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_anon_key') : null;
    if (customKey) {
      key = customKey;
    } else {
      key = DEFAULT_SUPABASE_ANON_KEY;
    }
  }

  return { url: url.trim(), key: key.trim() };
}

export function checkIsConfigured(): boolean {
  const { url, key } = getCredentials();
  return Boolean(
    url &&
    typeof url === 'string' &&
    url.startsWith('https://') &&
    !url.includes('your-supabase-project-id') &&
    !url.includes('your-project-id') &&
    !url.includes('example') &&
    key &&
    typeof key === 'string' &&
    key.length > 20 &&
    key !== 'your-supabase-anon-key' &&
    key !== 'your-actual-supabase-anon-key'
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (!checkIsConfigured()) return null;
  const { url, key } = getCredentials();
  try {
    cachedClient = createClient(url, key);
    return cachedClient;
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    return null;
  }
}

export function setSupabaseCredentials(url: string, key: string): boolean {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_supabase_url', url.trim());
      localStorage.setItem('custom_supabase_anon_key', key.trim());
    }
    cachedClient = null;
    return checkIsConfigured();
  } catch (e) {
    console.error('Error saving Supabase credentials:', e);
    return false;
  }
}

export const isSupabaseConfigured = checkIsConfigured();
export const supabase = getSupabaseClient();

