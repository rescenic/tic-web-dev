
"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function register(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("first_name") as string;

  if (!email || !password) {
    return { message: "Email and password are required." };
  }

  // Normalize base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";
  const emailRedirectTo = baseUrl 
    ? `${baseUrl}/auth/callback?next=/dashboard`
    : "/auth/callback?next=/dashboard";

  // Use Supabase Auth to create the user directly
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        display_name: firstName || "",
      },
    },
  });

  if (error) {
    return { message: `Error creating user: ${error.message}` };
  }

  if (data.user) {
    // User created successfully, redirect to dashboard
    redirect("/login?redirect_from=register");
  } else {
    // Email confirmation required
    return { message: "Check your email for confirmation link!" };
  }
}
