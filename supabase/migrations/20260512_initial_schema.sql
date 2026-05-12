-- Enable Row Level Security
ALTER TABLE IF EXISTS public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meals ENABLE ROW LEVEL SECURITY;

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    name TEXT NOT NULL,
    description TEXT,
    calories NUMERIC(10, 2),
    proteins NUMERIC(10, 2),
    carbs NUMERIC(10, 2),
    fats NUMERIC(10, 2),
    recipe JSONB,
    is_eaten BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for meal_plans
CREATE POLICY "Users can view their own meal plans" 
ON public.meal_plans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" 
ON public.meal_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" 
ON public.meal_plans FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" 
ON public.meal_plans FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for meals
CREATE POLICY "Users can view their own meals" 
ON public.meals FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.meal_plans 
        WHERE id = public.meals.meal_plan_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own meals" 
ON public.meals FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.meal_plans 
        WHERE id = public.meals.meal_plan_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own meals" 
ON public.meals FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.meal_plans 
        WHERE id = public.meals.meal_plan_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own meals" 
ON public.meals FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.meal_plans 
        WHERE id = public.meals.meal_plan_id 
        AND user_id = auth.uid()
    )
);
