
"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function register(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { message: "Email and password are required." };
  }

  // Use Supabase Auth to create the user directly
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { message: `Error creating user: ${error.message}` };
  }

  if (data.user) {
    // User created successfully, redirect to dashboard
    redirect("/dashboard");
  } else {
    // Email confirmation required
    return { message: "Check your email for confirmation link!" };
  }
}
