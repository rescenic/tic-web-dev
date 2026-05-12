import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch meal plans for the user
  const { data: mealPlans, error } = await supabase
    .from("meal_plans")
    .select("*, meals(*)")
    .order("week_start_date", { ascending: false });

  if (error) {
    console.error("Error fetching meal plans:", error);
  }

  const currentPlan = mealPlans?.[0];
  const totalMeals = currentPlan?.meals?.length || 0;
  const eatenMeals = currentPlan?.meals?.filter((m: any) => m.is_eaten).length || 0;
  const progress = totalMeals > 0 ? (eatenMeals / totalMeals) * 100 : 0;

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-4xl font-bold mb-8 text-emerald-900">Weekly Meal Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Current Week Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{eatenMeals} / {totalMeals} Meals</div>
            <div className="mt-2 h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-emerald-600 mt-2">{progress.toFixed(0)}% of weekly plan completed</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Planned Nutrition</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {currentPlan?.meals?.reduce((acc: number, m: any) => acc + (Number(m.calories) || 0), 0).toFixed(0)} kcal
            </div>
            <p className="text-xs text-emerald-600 mt-1">Total weekly calorie target</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Active Plan</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {currentPlan ? new Date(currentPlan.week_start_date).toLocaleDateString() : 'No active plan'}
            </div>
            <p className="text-xs text-emerald-600 mt-1">Starting date of current plan</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
        <h2 className="text-2xl font-semibold mb-6 text-emerald-900">Recent Activity</h2>
        {(!mealPlans || mealPlans.length === 0) ? (
          <div className="text-center py-10 text-emerald-600 bg-emerald-50 rounded-lg">
            <p>You haven't started any meal plans yet.</p>
            <a href="/form" className="mt-4 inline-block text-emerald-700 font-medium underline">Start your first plan now</a>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List of plans or meals would go here */}
            <p className="text-emerald-700 italic">Weekly tracking details coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
