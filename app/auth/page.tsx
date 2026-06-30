import { AuthForm } from "@/components/auth/auth-form"

// Auth UI kept for layout parity; submit bypasses to /chat (Supabase removed).
export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm />
    </div>
  )
}
