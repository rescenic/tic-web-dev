export interface Recipe {
  ingredients?: string[];
  instructions?: string[];
  [key: string]: any;
}

export interface Meal {
  id: string;
  meal_plan_id: string;
  day_number: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description?: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  recipe?: Recipe;
  is_eaten: boolean;
  created_at: string;
  updated_at: string;
}

export type MealInsert = Omit<Meal, 'id' | 'is_eaten' | 'created_at' | 'updated_at'>;

export interface MealPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  status: 'planned' | 'completed';
  created_at: string;
  updated_at: string;
  meals?: Meal[];
}
