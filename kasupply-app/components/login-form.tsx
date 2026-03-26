"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LoginAppUserRow = {
  user_id: string;
  role_id: number;
  status: string | null;
  roles: {
    role_name: string;
  } | null;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#a7acb6]" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.87 0-7 2.01-7 4.5 0 .28.22.5.5.5h13a.5.5 0 0 0 .5-.5C19 16.01 15.87 14 12 14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#a7acb6]" aria-hidden="true">
      <path
        d="M4.7 4.7a1 1 0 0 0-1.4 1.4l2.08 2.08A8.73 8.73 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.27-.97l2.03 2.03a1 1 0 1 0 1.4-1.4Zm7.3 10.3a3 3 0 0 1-3-3 2.9 2.9 0 0 1 .22-1.1l3.88 3.88A2.9 2.9 0 0 1 12 15Zm0-9c-1.64 0-3.12.39-4.44 1.01l1.52 1.52A4.9 4.9 0 0 1 12 8a4 4 0 0 1 4 4c0 .66-.16 1.28-.44 1.82l1.53 1.53A10.95 10.95 0 0 0 22 12s-3.5-6-10-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#a7acb6]" aria-hidden="true">
      <path
        d="M12 5c-6.5 0-10 7-10 7s3.5 7 10 7 10-7 10-7-3.5-7-10-7Zm0 11a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm0-6.2A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Z"
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
  rightButton,
}: {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  autoComplete?: string;
  rightButton?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[460px] space-y-1.5">
      <label
        htmlFor={id}
        className="ml-6 inline-block bg-white px-1 text-[16px] font-medium leading-none text-[#334a6f]"
      >
        {label}
      </label>
      <div className="-mt-2 flex h-[52px] w-full max-w-[460px] items-center rounded-full border border-[#445f88] bg-white px-6">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="h-full w-full border-0 bg-transparent text-[16px] text-slate-700 outline-none placeholder:text-[#a7a7a7]"
        />
        <span className="ml-4 shrink-0">{rightButton ?? icon}</span>
      </div>
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          status,
          roles!users_role_id_fkey (
            role_name
          )
        `)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const appUser = data as LoginAppUserRow | null;

      if (appUserError) {
        throw new Error("User record not found.");
      }

      if (!appUser) {
        router.push("/auth/sign-up-success");
        return;
      }

      if ((appUser.status ?? "").toLowerCase() !== "active") {
        router.push("/auth/sign-up-success");
        return;
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
    <div className="grid min-h-screen w-full bg-[#294773] lg:grid-cols-[1.14fr_0.86fr]">
      <div className="hidden bg-[#294773] lg:block" />

      <div className="flex min-h-screen items-center justify-center rounded-l-[24px] bg-white px-8 py-10 sm:px-10">
        <div className="w-full max-w-[460px]">
          <div className="mx-auto flex h-36 w-36 items-center justify-center">
            <Image
              src="/images/kasupply-logo.svg"
              alt="KaSupply logo"
              width={176}
              height={176}
              className="h-auto w-[8.75rem] object-contain drop-shadow-[0_14px_24px_rgba(37,61,98,0.16)]"
              priority
            />
          </div>

          <div className="mt-2 text-center">
            <h1 className="text-[22px] font-semibold leading-none text-[#3d4659] sm:text-[28px]">
              Welcome back
            </h1>
            <p className="mt-2 text-[20px] font-medium leading-none text-[#ff6f06]">
              Let&apos;s get you signed in
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 flex flex-col items-center space-y-6">
            <Field
              id="email"
              label="Email Address"
              placeholder="username@mail.com"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              icon={<UserIcon />}
            />

            <Field
              id="password"
              label="Password"
              placeholder="Enter Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              icon={<PasswordIcon />}
              rightButton={
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOpenIcon /> : <PasswordIcon />}
                </button>
              }
            />

            {error ? (
              <div className="w-full max-w-[460px] rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-5 h-[54px] w-full max-w-[460px] rounded-full bg-[#294773] text-[17px] font-semibold text-white transition hover:bg-[#233d63] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mx-auto mt-7 max-w-[460px] text-center text-[15px] text-[#3d4659]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="font-semibold text-[#ff6f06]">
              Sign Up
            </Link>
          </p>

          <div className="mt-12 text-center text-[15px] text-[#3d4659]">
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
