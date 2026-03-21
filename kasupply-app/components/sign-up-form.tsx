"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ExistingAppUserRow = {
  user_id: string;
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#a7acb6]" aria-hidden="true">
      <path
        d="M4.5 6A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h15a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 19.5 6Zm0 1h15a1.47 1.47 0 0 1 .95.34L12 13.9 3.55 7.34A1.47 1.47 0 0 1 4.5 7Zm-1.5 8.5V8.4l8.39 6.52a1 1 0 0 0 1.22 0L21 8.4v7.1a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5Z"
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
    <div className="mx-auto w-full max-w-[520px] space-y-1.5">
      <label
        htmlFor={id}
        className="ml-8 inline-block bg-white px-1 text-[18px] font-medium leading-none text-[#334a6f]"
      >
        {label}
      </label>
      <div className="-mt-2.5 flex h-[56px] w-full max-w-[520px] items-center rounded-full border border-[#445f88] bg-white px-8">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="h-full w-full border-0 bg-transparent text-[18px] text-slate-700 outline-none placeholder:text-[#a7a7a7]"
        />
        <span className="ml-4 shrink-0">{rightButton ?? icon}</span>
      </div>
    </div>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem("kasupply_pending_role_selection");
    window.localStorage.removeItem("kasupply_selected_role");
  }, []);

  const persistPendingRoleSelection = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("kasupply_pending_role_selection", "true");
    window.localStorage.setItem("kasupply_selected_role", "buyer");
  };

  const getExistingAppUser = async (authUserId: string) => {
    const { data: existingAppUser, error: existingAppUserError } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle<ExistingAppUserRow>();

    if (existingAppUserError) {
      throw new Error(existingAppUserError.message || "Failed to check existing account.");
    }

    return existingAppUser;
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    if (password !== repeatPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered")) {
          const { error: signInError, data: signInData } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError || !signInData.user) {
            setIsError(true);
            setMessage(
              "This email is already registered. Log in with the same password to continue your account setup.",
            );
            setLoading(false);
            return;
          }

          const existingUser = await getExistingAppUser(signInData.user.id);

          if (!existingUser) {
            persistPendingRoleSelection();
            router.push("/auth/sign-up-success");
            return;
          }

          router.push("/auth/login");
          return;
        }

        setIsError(true);
        setMessage(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setIsError(true);
        setMessage("Signup failed. No auth user returned.");
        setLoading(false);
        return;
      }

      persistPendingRoleSelection();

      router.push("/auth/sign-up-success");
    } catch (error) {
      console.error(error);
      setIsError(true);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full bg-[#294773] lg:grid-cols-[1.08fr_0.92fr]">
      <div className="hidden bg-[#294773] lg:block" />

      <div className="flex min-h-screen items-center justify-center rounded-l-[26px] bg-white px-8 py-12 sm:px-12">
        <div className="w-full max-w-[520px]">
          <div className="text-center">
            <h1 className="text-[24px] font-semibold leading-none text-[#3d4659] sm:text-[33px]">
              Create New Account
            </h1>
            <p className="mt-2 text-[26px] font-medium leading-none text-[#ff6f06]">
              Join KaSupply today
            </p>
          </div>

          <form onSubmit={handleSignUp} className="mt-12 flex flex-col items-center space-y-7">
            <Field
              id="name"
              label="Full Name"
              placeholder="Full Name"
              type="text"
              value={name}
              onChange={setName}
              autoComplete="name"
              icon={<UserIcon />}
            />

            <Field
              id="email"
              label="Email Address"
              placeholder="username@mail.com"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              icon={<MailIcon />}
            />

            <Field
              id="password"
              label="Password"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              icon={<PasswordIcon />}
              rightButton={
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOpenIcon /> : <PasswordIcon />}
                </button>
              }
            />

            <Field
              id="repeat-password"
              label="Confirm Password"
              placeholder="Enter password again"
              type={showRepeatPassword ? "text" : "password"}
              value={repeatPassword}
              onChange={setRepeatPassword}
              autoComplete="new-password"
              icon={<PasswordIcon />}
              rightButton={
                <button
                  type="button"
                  onClick={() => setShowRepeatPassword((current) => !current)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100"
                  aria-label={showRepeatPassword ? "Hide password" : "Show password"}
                  aria-pressed={showRepeatPassword}
                >
                  {showRepeatPassword ? <EyeOpenIcon /> : <PasswordIcon />}
                </button>
              }
            />

            {message ? (
              <div
                className={`w-full max-w-[520px] rounded-2xl px-5 py-3 text-sm ${
                  isError
                    ? "border border-red-200 bg-red-50 text-red-600"
                    : "border border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 h-[60px] w-full max-w-[520px] rounded-full bg-[#294773] text-[18px] font-semibold text-white transition hover:bg-[#233d63] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mx-auto mt-8 max-w-[540px] text-center text-[17px] font-medium leading-6 text-[#3d4659]">
            By signing up, you agree to KaSupply&apos;s Terms &amp; Privacy Policy
          </p>

          <p className="mx-auto mt-20 max-w-[540px] text-center text-[16px] text-[#3d4659]">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-[#ff6f06]">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
