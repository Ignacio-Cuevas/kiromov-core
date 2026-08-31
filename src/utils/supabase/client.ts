import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("tu_supabase_url")) {
    return null;
  }
  try {
    return createBrowserClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn("Could not create Supabase browser client:", err);
    return null;
  }
};
