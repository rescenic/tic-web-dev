# Weekly Meal Planner

A modern web application for planning and tracking your weekly meals with AI-powered suggestions.

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Supabase Account](https://supabase.com/)
- [OpenRouter API Key](https://openrouter.ai/) (for AI meal generation)
- [Google AI Studio Key](https://aistudio.google.com/) (Optional, if using Gemini directly)

### 2. Environment Setup

Copy `.env-example` to `.env` and fill in your credentials:

```bash
cp .env-example .env
```

**Key Variables:**

- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Found in your Supabase project settings.
- `SUPABASE_SERVICE_ROLE_KEY`: Required for backend scripts (like price crawler) to bypass RLS. Keep this secret!
- `OPENROUTER_API_KEY`: Get this from OpenRouter to access various LLMs (like Mistral).
- `GEMINI_API_KEY`: (Optional) If you want to use Google's Gemini models directly.
- `NEXT_PUBLIC_BASE_URL`: Set to `http://localhost:3001` for local development.

### 3. Database Migration

**A. Using Supabase Dashboard (Recommended for Beginners):**

1. Copy the content of `supabase/migrations/20260512000000_initial_schema.sql`.
2. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
3. Paste and click **Run**.

**B. Using Supabase CLI (For Automated Deployment):**

1. **Link your project:**

   ```bash
   supabase link --project-ref your-project-id
   ```

   *Note: Your project ID is the string in your Supabase URL.*
2. **Push migrations:**

   ```bash
   supabase db push
   ```

3. **Handle migration history conflicts:**
   If you get a version mismatch error, repair the history:

   ```bash
   # Mark remote version as reverted if it doesn't exist locally
   supabase migration repair --status reverted 001
   # Mark local version as applied
   supabase migration repair --status applied 20260512000000
   ```

### 4. Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:3001`.

### 5. Price Tracking Scripts

The project includes two scripts in the `scripts/` directory to manage grocery price data.

#### A. Price Crawler (`price-crawler.js`)

An automated script using Puppeteer to fetch real-time prices from Alfagift, KlikIndomaret, and Yogya Online.

**Usage:**

```bash
# Crawl all unique items found in meal_groceries table
node scripts/price-crawler.js

# Crawl specific items only
node scripts/price-crawler.js "Beras 5kg" "Minyak Goreng 2L"
```

**Known Challenges & Limitations:**

- **Anti-Bot Protection**: Some stores (like KlikIndomaret) have heavy JS components and anti-bot measures that may require longer wait times or specific user agents.
- **Login Blocks**: Stores like Yogya Online may occasionally block access with a login window or modal, preventing the crawler from reading prices.
- **Stock Availability**: If an item is "Out of Stock" or "Tidak Tersedia", the crawler will skip it to avoid recording inaccurate data.
- **Fuzzy Matching**: The script attempts to reduce keywords if no results are found, but highly specific or misspelled items in the database may still fail to match.

#### B. Manual Price Sync (`manual-price-entry.js`)

A utility script to "register" new grocery items into the system so you can fill in prices manually via the database dashboard.

**Usage:**

```bash
node scripts/manual-price-entry.js
```

**How it works:**

- It scans your `meal_groceries` for any items not yet present in the `product_prices` table.
- It adds these new items with a default price of `0` and `store_name: "Manual"`.
- **Note**: It will **not** overwrite any existing prices you have already entered manually.
- After running this, simply go to your Supabase Dashboard to update the `0` values with real market prices.

### 6. AI Models (The "Secret Sauce")

This application uses an **AI-first** approach with a deliberately simple model configuration:

- **Hardcoded Models**: AI models are directly integrated into the code ai.ts to ensure output consistency.
- **Free Models Only**: To keep operational costs at Rp0, the application uses free-tier models:
  - **Primary**: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` via OpenRouter.
  - **Fallback**: `gemini-1.5-flash` via Google AI Studio.
- **Efficiency**: Despite using free models, system prompts have been optimized to generate accurate and nutritious meal plans.

## 🛠 Project Structure

- `app/dashboard`: Main user interface for tracking meals and managing profile.
- `app/form`: AI meal generation input form.
- `lib/ai.ts`: Configuration for AI providers (Hardcoded Free Models).
- `scripts`: Backend scripts for price tracking and data sync.
- `utils/supabase`: Supabase client and server utilities.

## ✅ Completed Features

### Phase 1: Authentication & Security

- [x] Implement CSRF protection for all form submissions and server actions.
- [x] Ensure secure session management using Supabase SSR.
- [x] Add route protection to ensure only logged-in users can access the dashboard.

### Phase 2: Database Schema

- [x] Create `meal_plans` table in Supabase to store user weekly plans.
- [x] Create `meals` table to store individual meal details (calories, macros, recipes).
- [x] Set up Row Level Security (RLS) so users can only access their own data.

### Phase 3: Dashboard Development

- [x] Create `/dashboard` layout with Sidebar navigation (Weekly Menu, Profile).
- [x] Implement `/dashboard/profile` for managing user settings (Name, Email, Password).
- [x] Create `/dashboard` overview to display the current week's plan.
- [x] Implement synchronization logic to move data from `localStorage` to Supabase upon login.
- [x] Add summary components to track weekly nutritional output.
- [x] Implement "Planned vs Actual" tracking for meals.

### Phase 4: Integration & UX

- [x] Connect the AI meal generator to save results directly to the database.
- [x] Add progress visualizations for weekly goals.
- [x] Ensure responsive design for mobile and desktop views.

### Phase 5: Price Tracking & Manual Entry

- [x] Create `product_prices` table to cache grocery prices from various stores.
- [x] Implement Puppeteer-based crawler script to fetch real-time prices (Alfagift, KlikIndomaret, Yogya Online).
- [x] **New**: Implement `manual-price-entry.js` for syncing items with default price 0 for manual dashboard entry.
- [x] Add automated price estimation for grocery lists based on market data.

## 📦 Deployment

This project is built with Next.js and can be easily deployed to [Vercel](https://vercel.com/):

1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Add all environment variables from your `.env` file to the Vercel project settings.
4. Update `NEXT_PUBLIC_BASE_URL` in Vercel to your production domain.
5. In Supabase Dashboard, add your production domain to the "Redirect URLs" in Auth settings.
