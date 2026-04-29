"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRound, Mail, Eye, EyeOff } from "lucide-react";

type ExistingAppUserRow = {
  user_id: string;
};

function UserIcon() {
  return <UserRound className="h-5 w-5 stroke-[1.8] text-[#a7acb6]" />;
}

function MailIcon() {
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
  onBlur,
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
  onBlur?: () => void;
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
            onBlur={onBlur}
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

  const toProperName = (value: string) =>
    value
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const getPasswordError = (value: string) => {
    if (value.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (!/[A-Z]/.test(value)) {
      return "Password must include at least one uppercase letter.";
    }

    if (!/[a-z]/.test(value)) {
      return "Password must include at least one lowercase letter.";
    }

    if (!/[0-9]/.test(value)) {
      return "Password must include at least one number.";
    }

    return "";
  };

const passwordChecks = [
  {
    label: "At least 8 characters",
    valid: password.length >= 8,
  },
  {
    label: "Uppercase letter (A–Z)",
    valid: /[A-Z]/.test(password),
  },
  {
    label: "Lowercase letter (a–z)",
    valid: /[a-z]/.test(password),
  },
  {
    label: "Number (0–9)",
    valid: /[0-9]/.test(password),
  },
];

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    const formattedName = toProperName(name);
    const normalizedEmail = email.trim().toLowerCase();

    if (!formattedName) {
      setIsError(true);
      setMessage("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (!normalizedEmail) {
      setIsError(true);
      setMessage("Please enter your email address.");
      setLoading(false);
      return;
    }

    const passwordError = getPasswordError(password);

    if (passwordError) {
      setIsError(true);
      setMessage(passwordError);
      setLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    setName(formattedName);
    setEmail(normalizedEmail);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: formattedName,
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered")) {
          const { error: signInError, data: signInData } =
            await supabase.auth.signInWithPassword({
              email: normalizedEmail,
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
                Create New Account
              </h1>
              <p className="mt-2 text-[20px] font-medium leading-none text-[#ff6f06]">
                Join KaSupply today
              </p>
            </div>

            <form onSubmit={handleSignUp} className="mt-10 flex flex-col items-center gap-5">
              <Field
                id="name"
                label="Full Name"
                placeholder="Enter your full name"
                type="text"
                value={name}
                onChange={setName}
                onBlur={() => setName(toProperName(name))}
                autoComplete="name"
                icon={<UserIcon />}
              />

              <Field
                id="email"
                label="Email Address"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                icon={<MailIcon />}
              />

              <Field
                id="password"
                label="Password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
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

              {password ? (
                <div className="-mt-1 w-full max-w-[530px] rounded-2xl border border-[#dfe5ef] bg-[#f8fafc] px-5 py-3">
                  <p className="mb-2 text-[15px] font-semibold text-[#294773]">
                    Password must include:
                  </p>

                  <div className="grid gap-1 text-[14px]">
                    {passwordChecks.map((check) => (
                      <p
                        key={check.label}
                        className={check.valid ? "text-green-600" : "text-[#7b8494]"}
                      >
                        {check.valid ? "✓" : "•"} {check.label}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <Field
                id="repeat-password"
                label="Confirm Password"
                placeholder="Enter your password again"
                type={showRepeatPassword ? "text" : "password"}
                value={repeatPassword}
                onChange={setRepeatPassword}
                autoComplete="new-password"
                icon={<PasswordIcon />}
                rightButton={
                  <button
                    type="button"
                    onClick={() => setShowRepeatPassword((current) => !current)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-slate-100"
                    aria-label={showRepeatPassword ? "Hide password" : "Show password"}
                    aria-pressed={showRepeatPassword}
                  >
                    {showRepeatPassword ? <EyeOpenIcon /> : <PasswordIcon />}
                  </button>
                }
              />

              {message ? (
                <div
                  className={`-mt-1 w-full max-w-[530px] rounded-2xl px-5 py-3 text-sm ${
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
                className="mt-4 h-[54px] w-full rounded-full bg-[#294773] text-[18px] font-semibold text-white transition-colors duration-200 hover:bg-[#1E3A5F]"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="mx-auto mt-2 max-w-[530px] text-center text-[15px] text-[#3f4a5e]">
              By signing up, you agree to KaSupply&apos;s Terms &amp; Privacy Policy
            </p>

            <p className="mx-auto mt-10 max-w-[530px] text-center text-[15px] text-[#3f4a5e]">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-[#ff6b00] transition-colors duration-200 hover:text-[#d94f00] hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}