"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { MealInsert } from "@/types/database";

export async function syncMealsFromLocal(localData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated" };

  try {
    // 1. Create a meal plan
    const { data: plan, error: planError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        week_start_date: new Date().toISOString().split('T')[0],
        status: 'planned'
      })
      .select()
      .single();

    if (planError) throw planError;

    // 2. Prepare meals for insertion
    const mealsToInsert: MealInsert[] = [];
    
    // Assuming localData.days is an array of 7 days
    if (localData.days && Array.isArray(localData.days)) {
      localData.days.forEach((day: any, index: number) => {
        const dayNumber = index + 1;
        if (day.meals) {
          Object.entries(day.meals).forEach(([mealType, meal]: [string, any]) => {
            if (meal && meal.name) {
              mealsToInsert.push({
                meal_plan_id: plan.id,
                day_number: dayNumber,
                meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
                name: meal.name,
                description: meal.description || "",
                calories: meal.calories || 0,
                proteins: meal.proteins || 0,
                carbs: meal.carbs || 0,
                fats: meal.fats || 0,
                recipe: meal.recipe || {}
              });
            }
          });
        }
      });
    }

    if (mealsToInsert.length > 0) {
      const { error: mealsError } = await supabase
        .from("meals")
        .insert(mealsToInsert);
      
      if (mealsError) {
        // Compensating logic: delete the orphan plan
        try {
          await supabase.from("meal_plans").delete().eq("id", plan.id);
        } catch (cleanupError) {
          console.error(`Failed to cleanup orphan meal plan ${plan.id}:`, cleanupError);
        }
        throw mealsError;
      }
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Sync error:", error);
    return { error: error.message };
  }
}

export async function saveGeneratedPlan(meals: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated" };

  // This is similar to sync but for a freshly generated plan
  return syncMealsFromLocal({ days: meals });
}

export async function toggleMealEaten(mealId: string, isEaten: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated" };

  const { error } = await supabase
    .from("meals")
    .update({ is_eaten: isEaten })
    .eq("id", mealId);

  if (error) {
    console.error("Error toggling meal:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

