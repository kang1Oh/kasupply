"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Eye, EyeOff } from "lucide-react";

type LoginAppUserRow = {
  user_id: string;
  role_id: number;
  status: string | null;
  roles: {
    role_name: string;
  } | null;
};

function UserIcon() {
  return <Mail className="h-5 w-5 stroke-[1.8] text-[#a7acb6]" />;
}

function PasswordIcon() {
  return <EyeOff className="h-5 w-5 stroke-[1.8] text-[#a7acb6]" />;
}

function EyeOpenIcon() {
  return <Eye className="h-5 w-5 stroke-[1.8] text-[#a7acb6]" />;
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
    <div className="mx-auto w-full max-w-[530px]">
      <div className="relative">
        <label
          htmlFor={id}
          className="absolute -top-[10px] left-6 z-10 bg-white px-2 text-[17px] font-semibold leading-none text-[#294773]"
        >
          {label}
        </label>

        <div className="relative h-[64px] w-full rounded-full border border-[#294773] bg-white">
          <input
            id={id}
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required
            className="h-full w-full rounded-full border-0 bg-transparent pl-7 pr-14 text-[17px] font-normal text-[#294773] outline-none placeholder:font-light placeholder:text-[#a8a8a8]"
          />

          <span className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center justify-center text-[#a7acb6]">
            {rightButton ?? icon}
          </span>
        </div>
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

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      setIsLoading(false);
      return;
    }

    setEmail(normalizedEmail);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

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

      const normalizedStatus = (appUser.status ?? "active").toLowerCase();

      if (["restricted", "suspended", "banned"].includes(normalizedStatus)) {
        await supabase.auth.signOut();
        throw new Error(
          `This account is currently ${normalizedStatus}. Please contact support for assistance.`,
        );
      }

      if (!["active", "warned"].includes(normalizedStatus)) {
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
      const message =
        loginError instanceof Error ? loginError.message : "Unable to log in.";

      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("invalid login") ||
        lowerMessage.includes("invalid credentials")
      ) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      setError(message || "Unable to log in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#294773]">
      <div className="absolute inset-y-0 left-0 hidden w-[57%] bg-[url('/images/login-bg.png')] bg-cover bg-left bg-no-repeat lg:block" />

      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-[1.14fr_0.86fr]">
        <div className="hidden lg:block" />

        <div className="-ml-6 flex min-h-screen items-start justify-center rounded-l-[24px] bg-white px-8 pt-10 pb-10 sm:px-10">
          <div className="w-full max-w-[560px]">
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

            <form onSubmit={handleLogin} className="mt-10 flex flex-col items-center gap-7">
              <Field
                id="email"
                label="Email Address"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                icon={<UserIcon />}
              />

              <Field
                id="password"
                label="Password"
                placeholder="Enter your password"
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
                <div className="-mt-3 w-full max-w-[530px] rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[14px] text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-4 h-[54px] w-full max-w-[560px] rounded-full bg-[#294773] text-[17px] font-semibold text-white transition-colors duration-200 hover:bg-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Logging in..." : "Log In"}
              </button>
            </form>

            <p className="mx-auto mt-3 max-w-[530px] text-center text-[15px] text-[#3d4659]">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="font-semibold text-[#ff6f06] transition-colors duration-200 hover:text-[#d94f00] hover:underline"
              >
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
    </div>
  );
}