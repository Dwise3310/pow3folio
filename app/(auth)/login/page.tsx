import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <span className="text-sm font-bold">P3</span>
            </div>
            <span className="text-xl font-semibold">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <p className="mt-3 text-sm text-foreground-muted">
            Welcome back. Log in to manage your proof of work.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
