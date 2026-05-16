
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./action";
import { useActionState, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Utensils, Mail, Lock, ArrowRight } from "lucide-react";

// Extracted into a separate component because useSearchParams()
// requires a <Suspense> boundary to allow static prerendering.
function LoginToast() {
  const params = useSearchParams();
  const redirectFrom = params.get("redirect_from");

  useEffect(() => {
    if (redirectFrom === "register")
      toast.success("Registration successful! Please check your email for the confirmation link to login.");
  }, [redirectFrom]);

  return null;
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, { message: "" });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state?.message) {
      setIsOpen(true);
    }
  }, [state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-teal-50 to-emerald-100 p-4">
      <Suspense fallback={null}>
        <LoginToast />
      </Suspense>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100">
        <div className="bg-emerald-600 p-6 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
          <p className="text-emerald-100 text-sm">Sign in to continue planning your meals</p>
        </div>

        <form action={formAction} className="p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-emerald-900 font-medium">Email Address</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-emerald-400" />
                </div>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com"
                  required 
                  className="pl-10 border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-emerald-900 font-medium">Password</Label>
                <Link href="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-emerald-400" />
                </div>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••"
                  required 
                  className="pl-10 border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-lg py-6 group">
            Sign In
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <div className="mt-8 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline transition-all">
              Create one now
            </Link>
          </div>
        </form>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-900 flex items-center gap-2">
              <span className="bg-red-100 p-2 rounded-full">
                <Lock className="w-4 h-4 text-red-600" />
              </span>
              Login Failed
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              {state?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">Try Again</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster richColors position="top-center" />
    </div>
  );
}
