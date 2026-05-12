# Weekly Meal Planner

A modern web application for planning and tracking your weekly meals with AI-powered suggestions.

## Todo List: Dashboard & Secure Meal Tracking

### Phase 1: Authentication & Security
- [x] Implement CSRF protection for all form submissions and server actions.
- [x] Ensure secure session management using Supabase SSR.
- [x] Add route protection to ensure only logged-in users can access the dashboard.

### Phase 2: Database Schema
- [x] Create `meal_plans` table in Supabase to store user weekly plans.
- [x] Create `meals` table to store individual meal details (calories, macros, recipes).
- [x] Set up Row Level Security (RLS) so users can only access their own data.

### Phase 3: Dashboard Development
- [x] Create `/dashboard` route to display an overview of the current week's plan.
- [ ] Implement synchronization logic to move data from `localStorage` to Supabase upon login.
- [ ] Add a summary component to track weekly nutritional output (total calories, proteins, carbs, fats).
- [ ] Implement "Planned vs Actual" tracking for meals.

### Phase 4: Integration & UX
- [ ] Connect the AI meal generator to save results directly to the database.
- [ ] Add progress visualizations for weekly goals.
- [ ] Ensure responsive design for mobile and desktop views.
