
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
import { register } from "./action";
import { useActionState } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Utensils, Mail, Lock, User, ArrowRight, Info } from "lucide-react";

export default function RegisterPage() {
  const [state, formAction] = useActionState(register, { message: "" });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state?.message) {
      setIsOpen(true);
    }
  }, [state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-teal-50 to-emerald-100 p-4">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100 my-8">
        <div className="bg-emerald-600 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-emerald-700/20 transform -skew-y-6 origin-top-left"></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Join Weekly Meal Planner</h1>
            <p className="text-emerald-100 text-sm">Start your healthy eating journey today</p>
          </div>
        </div>

        <form action={formAction} className="p-8">
          
          {/* Important Notice */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 leading-relaxed">
              <strong>Important:</strong> Please use an active email address. 
              You will need to <strong className="text-emerald-700">confirm your email</strong> before you can log in.
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-emerald-900 font-medium">Full Name</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-emerald-400" />
                </div>
                <Input 
                  id="first_name" 
                  name="first_name" 
                  type="text" 
                  placeholder="John Doe"
                  required 
                  className="pl-10 border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

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
              <Label htmlFor="password" className="text-emerald-900 font-medium">Password</Label>
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
                  minLength={6}
                  className="pl-10 border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-gray-500 ml-1">Must be at least 6 characters long</p>
            </div>
          </div>

          <Button type="submit" className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-lg py-6 group">
            Create Account
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <div className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline transition-all">
              Sign in here
            </Link>
          </div>
        </form>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-900 flex items-center gap-2">
              <span className="bg-emerald-100 p-2 rounded-full">
                <Info className="w-4 h-4 text-emerald-600" />
              </span>
              Registration Notice
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              {state?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
