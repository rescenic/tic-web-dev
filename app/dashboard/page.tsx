import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, CheckCircle2, PlusCircle, ArrowRight, Utensils } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import MealToggle from "./meal-toggle";
import { Meal, MealPlan } from "@/types/database";
import { PostgrestError } from "@supabase/supabase-js";

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
    .order("week_start_date", { ascending: false }) as { data: MealPlan[] | null, error: PostgrestError | null };

  if (error) {
    console.error("Error fetching meal plans:", JSON.stringify(error, null, 2));
    // If the table doesn't exist, we should handle it gracefully
    if (error.code === "PGRST116" || error.code === "42P01") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="bg-red-50 p-6 rounded-xl border border-red-100 max-w-md">
            <h2 className="text-xl font-bold text-red-800 mb-2">Database Not Ready</h2>
            <p className="text-red-600 mb-4">
              The `meal_plans` table was not found. Please make sure to run the database migrations in your Supabase project.
            </p>
            <div className="bg-white p-3 rounded border border-red-200 text-xs text-left overflow-auto font-mono">
              Error Code: {error.code}<br/>
              Message: {error.message}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      );
    }
  }

  const currentPlan = mealPlans?.[0];
  const totalMeals = currentPlan?.meals?.length || 0;
  const eatenMeals = currentPlan?.meals?.filter((m: Meal) => m.is_eaten).length || 0;
  const progress = totalMeals > 0 ? (eatenMeals / totalMeals) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Weekly Menu</h1>
          <p className="text-emerald-600">Manage and track your weekly meal plan</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Link href="/form">
            <PlusCircle className="w-4 h-4" />
            Generate New Plan
          </Link>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Completion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{eatenMeals} / {totalMeals}</div>
            <div className="mt-2 h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-emerald-600 mt-2">{progress.toFixed(0)}% completed</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Weekly Calories</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {currentPlan?.meals ? currentPlan.meals.reduce((acc: number, m: Meal) => acc + (Number(m.calories) || 0), 0).toFixed(0) : (0).toFixed(0)} kcal
            </div>
            <p className="text-xs text-emerald-600 mt-1">Total weekly target</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Active Since</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {currentPlan ? new Date(currentPlan.week_start_date).toLocaleDateString() : 'None'}
            </div>
            <p className="text-xs text-emerald-600 mt-1">Plan start date</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
          <CardTitle className="text-xl text-emerald-900">Current Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(!currentPlan || !currentPlan.meals || currentPlan.meals.length === 0) ? (
            <div className="text-center py-12 px-4">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-900 mb-2">No active meal plan</h3>
              <p className="text-emerald-600 mb-6 max-w-xs mx-auto">Start by generating a new personalized meal plan based on your preferences.</p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/form">Create Plan</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-emerald-50">
              {/* Group by day number if possible, or just list */}
              {Array.from({ length: 7 }, (_, i) => i + 1).map(dayNum => {
                const dayMeals = currentPlan.meals!.filter((m: Meal) => m.day_number === dayNum);
                if (dayMeals.length === 0) return null;
                
                const dayDate = new Date(currentPlan.week_start_date);
                dayDate.setDate(dayDate.getDate() + (dayNum - 1));
                const formattedDate = dayDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });

                return (
                  <div key={dayNum} className="p-6 hover:bg-emerald-50/30 transition-colors relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-emerald-800 text-lg">Day {dayNum}</h3>
                        <span className="text-sm text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                          {formattedDate}
                        </span>
                      </div>
                      <Link 
                        href={`/meals/${dayNum}`} 
                        className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:underline relative z-20"
                      >
                        View Details <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    <Link href={`/meals/${dayNum}`} className="absolute inset-0 z-0" aria-hidden="true" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                      {dayMeals.sort((a: Meal, b: Meal) => {
                        const order = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };
                        return (order[a.meal_type as keyof typeof order] || 5) - (order[b.meal_type as keyof typeof order] || 5);
                      }).map((meal: Meal) => (
                        <div key={meal.id} className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded mb-2 inline-block">
                              {meal.meal_type}
                            </span>
                            <h4 className="font-semibold text-emerald-900 text-sm line-clamp-1">{meal.name}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-emerald-50">
                            <span className="text-xs text-emerald-600 font-medium">{meal.calories.toFixed(0)} kcal</span>
                            <MealToggle mealId={meal.id} initialIsEaten={meal.is_eaten} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

