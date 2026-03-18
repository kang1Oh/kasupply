"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LoginAppUserRow = {
  user_id: string;
  role_id: number;
  roles: {
    role_name: string;
  } | null;
};

function BrandMark() {
  return (
    <div className="mx-auto flex h-40 w-40 items-center justify-center">
      <svg
        viewBox="0 0 180 180"
        className="h-full w-full drop-shadow-[0_14px_24px_rgba(37,61,98,0.16)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shieldStroke" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#6f8bb1" />
            <stop offset="100%" stopColor="#233d66" />
          </linearGradient>
          <linearGradient id="orangeFill" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ff8b18" />
            <stop offset="100%" stopColor="#ff5b00" />
          </linearGradient>
        </defs>
        <path
          d="M90 16c18 16 38 24 56 27v35c0 38-22 69-56 86C56 147 34 116 34 78V43c18-3 38-11 56-27Z"
          fill="#fff"
          stroke="url(#shieldStroke)"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M40 92c16 8 36 10 58 9 15-1 30 5 44 20-11 18-29 33-52 43C69 151 52 124 40 92Z"
          fill="url(#orangeFill)"
        />
        <path
          d="M36 78c16 7 34 10 52 10 22 0 39 6 54 21-5 11-12 20-20 28-14-16-30-23-49-22-16 1-30-3-43-11-5-8-9-17-11-26Z"
          fill="#233d66"
          opacity="0.95"
        />
        <path
          d="M53 110c8 0 16 4 24 12m-30-6c7-1 15 2 22 10m-17-18c8-1 16 3 24 11"
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <circle cx="91" cy="63" r="24" fill="none" stroke="url(#orangeFill)" strokeWidth="10" />
        <path
          d="m82 63 8 8 17-20"
          fill="none"
          stroke="#526d94"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="8"
        />
        <g fill="#ff6a00">
          <rect x="88" y="25" width="6" height="15" rx="3" />
          <rect x="88" y="86" width="6" height="15" rx="3" />
          <rect x="115" y="58" width="15" height="6" rx="3" />
          <rect x="52" y="58" width="15" height="6" rx="3" />
          <rect x="107.5" y="35.5" width="6" height="15" rx="3" transform="rotate(45 110.5 43)" />
          <rect x="63" y="80" width="6" height="15" rx="3" transform="rotate(45 66 87.5)" />
          <rect x="108" y="80" width="6" height="15" rx="3" transform="rotate(135 111 87.5)" />
          <rect x="63.5" y="35" width="6" height="15" rx="3" transform="rotate(135 66.5 42.5)" />
        </g>
      </svg>
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#a7acb6]" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.01-7 4.5 0 .28.22.5.5.5h13a.5.5 0 0 0 .5-.5C19 16.01 15.87 14 12 14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#a7acb6]" aria-hidden="true">
      <path
        d="M4.7 4.7a1 1 0 0 0-1.4 1.4l2.08 2.08A8.73 8.73 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.27-.97l2.03 2.03a1 1 0 1 0 1.4-1.4Zm7.3 10.3a3 3 0 0 1-3-3 2.9 2.9 0 0 1 .22-1.1l3.88 3.88A2.9 2.9 0 0 1 12 15Zm0-9c-1.64 0-3.12.39-4.44 1.01l1.52 1.52A4.9 4.9 0 0 1 12 8a4 4 0 0 1 4 4c0 .66-.16 1.28-.44 1.82l1.53 1.53A10.95 10.95 0 0 0 22 12s-3.5-6-10-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Field({
  id,
  label,
  placeholder,
  type,
  value,
  onChange,
  icon,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="ml-8 inline-block bg-white px-1 text-[15px] font-medium text-[#334a6f]">
        {label}
      </label>
      <div className="-mt-3 flex h-14 items-center rounded-full border border-[#516c95] bg-white px-6">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="h-full w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-[#b1b1b1]"
        />
        <span className="ml-4 shrink-0">{icon}</span>
      </div>
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const {
        data: { user },
        error: authUserError,
      } = await supabase.auth.getUser();

      if (authUserError || !user) {
        throw new Error("Unable to load authenticated user.");
      }

      const { data, error: appUserError } = await supabase
        .from("users")
        .select(`
          user_id,
          role_id,
          roles!users_role_id_fkey (
            role_name
          )
        `)
        .eq("auth_user_id", user.id)
        .single();

      const appUser = data as LoginAppUserRow | null;

      if (appUserError || !appUser) {
        throw new Error("User record not found.");
      }

      const roleName = appUser.roles?.role_name?.toLowerCase();

      if (roleName === "supplier") {
        router.push("/supplier/dashboard");
      } else if (roleName === "buyer") {
        router.push("/buyer");
      } else if (roleName === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error ? loginError.message : "An error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full bg-[#243f68] lg:grid-cols-[1.02fr_0.98fr]">
      <div className="hidden bg-[#243f68] lg:block" />

      <div className="flex min-h-screen items-center justify-center rounded-l-[2rem] bg-white px-6 py-10 sm:px-10">
        <div className="w-full max-w-[380px]">
          <BrandMark />

          <div className="mt-2 text-center">
            <h1 className="text-[2.15rem] font-bold leading-none text-[#3d4659]">
              Welcome back
            </h1>
            <p className="mt-2 text-[1.1rem] font-medium text-[#ff6f06]">
              Let&apos;s get you signed in
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 space-y-5">
            <Field
              id="email"
              label="Username"
              placeholder="Enter Username"
              type="text"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              icon={<UserIcon />}
            />

            <Field
              id="password"
              label="Password"
              placeholder="Enter Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              icon={<PasswordIcon />}
            />

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-9 h-[3.25rem] w-full rounded-full bg-[#243f68] text-xl font-semibold text-white transition hover:bg-[#1e3658] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mt-4 text-center text-[0.95rem] text-[#353535]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="font-semibold text-[#ff6f06]">
              Sign Up
            </Link>
          </p>

          <div className="mt-14 text-center text-[0.9rem] text-[#3d4659]">
            <Link href="/" className="transition hover:text-[#243f68]">
              Privacy Policy
            </Link>
            <span> | </span>
            <Link href="/" className="transition hover:text-[#243f68]">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
