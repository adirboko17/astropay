import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-l from-blue-800 via-indigo-900 to-slate-950 px-4">
      <div className="pointer-events-none absolute -start-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 end-0 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <Image
            src="/assets/astro-logo-11.png"
            alt="Astro Project"
            width={280}
            height={80}
            priority
            className="mx-auto h-auto w-56 max-w-full object-contain"
          />
          <p className="mt-4 text-sm text-slate-500">התחברות למערכת הניהול</p>
        </div>

        <LoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
