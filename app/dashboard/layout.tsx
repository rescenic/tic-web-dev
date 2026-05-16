import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Utensils, User, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import { logout } from "@/app/form/logout";
import SyncLocalStorage from "./sync-local-storage";
import MobileMenu from "./mobile-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-emerald-50/30">
      <SyncLocalStorage />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-emerald-100 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-emerald-50">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-emerald-800">
            <Utensils className="w-6 h-6 text-emerald-600" />
            <span>Weekly Meal Planner</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/dashboard" 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 text-emerald-900 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">Weekly Menu</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:text-emerald-500 transition-colors" />
          </Link>
          
          <Link 
            href="/dashboard/profile" 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-emerald-50 text-emerald-900 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">Profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:text-emerald-500 transition-colors" />
          </Link>
        </nav>

        <div className="p-4 border-t border-emerald-50">
          <div className="p-3 mb-4 rounded-lg bg-emerald-50/50">
            <p className="text-xs text-emerald-600 font-medium truncate">{user.email}</p>
          </div>
          <form action={logout}>
            <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors group">
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="md:hidden bg-white border-b border-emerald-100 p-4 sticky top-0 z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-emerald-800">
            <Utensils className="w-5 h-5 text-emerald-600" />
            <span>Weekly Meal Planner</span>
          </Link>
          <MobileMenu email={user.email} />
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
