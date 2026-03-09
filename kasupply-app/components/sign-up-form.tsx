"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

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
      });

      if (authError) {
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

      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", role)
        .single();

      if (roleError) {
        setIsError(true);
        setMessage(roleError.message);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("users").insert({
        auth_user_id: authData.user.id,
        role_id: roleData.role_id,
        name,
        email,
        phone,
        status: "active",
      });

      if (insertError) {
        setIsError(true);
        setMessage(insertError.message);
        setLoading(false);
        return;
      }

      setMessage("Account created successfully.");
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
    <form
      onSubmit={handleSignUp}
      className="flex w-full flex-col gap-4 rounded-xl border p-6 shadow-sm"
    >
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <p className="text-sm text-gray-600">Create a new account</p>

      <input
        type="text"
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border px-3 py-2"
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border px-3 py-2"
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border px-3 py-2"
        required
      />

      <input
        type="password"
        placeholder="Repeat Password"
        value={repeatPassword}
        onChange={(e) => setRepeatPassword(e.target.value)}
        className="rounded-md border px-3 py-2"
        required
      />

      <input
        type="text"
        placeholder="Phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="rounded-md border px-3 py-2"
        required
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-md border px-3 py-2"
      >
        <option value="buyer">Buyer</option>
        <option value="supplier">Supplier</option>
        <option value="admin">Admin</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Sign up"}
      </button>

      {message && (
        <p className={`text-sm ${isError ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      <p className="text-center text-sm">
        Already have an account?{" "}
        <a href="/auth/login" className="underline">
          Login
        </a>
      </p>
    </form>
  );
}