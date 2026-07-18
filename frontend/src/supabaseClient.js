import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lsokajyrqpodytvtpczt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzb2thanlycXBvZHl0dnRwY3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjk4MzYsImV4cCI6MjA5OTEwNTgzNn0.xgks23X8C2eRExANCMu51PWfxZ7wxfwwHhG44a_66Kw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);