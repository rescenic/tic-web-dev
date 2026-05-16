"use client";

import { useState } from "react";
import { Menu, X, Utensils, User, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/form/logout";
import { cn } from "@/lib/utils";

export default function MobileMenu({ email }: { email: string | undefined }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-emerald-50 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl text-emerald-800" onClick={() => setIsOpen(false)}>
                <Utensils className="w-6 h-6 text-emerald-600" />
                <span>Weekly Meal Planner</span>
              </Link>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-emerald-400"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              <Link 
                href="/dashboard" 
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 text-emerald-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium">Weekly Menu</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-300" />
              </Link>
              
              <Link 
                href="/dashboard/profile" 
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 text-emerald-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium">Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-300" />
              </Link>
            </nav>

            <div className="p-4 border-t border-emerald-50">
              {email && (
                <div className="p-3 mb-4 rounded-lg bg-emerald-50/50">
                  <p className="text-xs text-emerald-600 font-medium truncate">{email}</p>
                </div>
              )}
              <form action={logout}>
                <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors group">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
