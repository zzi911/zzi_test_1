import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "http://localhost",
  supabaseAnonKey ?? "anon-key-placeholder"
);

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface ReservationRow {
  id: string;
  reserved_at: string;
  name: string;
  phone: string;
  password_hash: string;
  party_size: number;
  note: string | null;
  status: ReservationStatus;
  created_at: string;
}
