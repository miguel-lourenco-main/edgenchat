// Supabase removed.
//
// This file is intentionally kept (not deleted) to avoid breaking imports during refactors.
// Any usage should be removed before re-introducing a backend/auth layer.
export function getSupabaseClient(): never {
  throw new Error("Supabase has been removed from this project.")
}