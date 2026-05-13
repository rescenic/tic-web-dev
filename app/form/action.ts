'use server'

import { ai } from '@/lib/ai'
import { capitalize } from '@/lib/capitalize'
import { clean } from '@/lib/jsoncleaner'
import { createClient } from '@/utils/supabase/server'

import { MealInsert } from "@/types/database";

export async function input(prevState: any, formData: FormData) {
	const goal = capitalize(formData.get('goal')?.toString() as string)
	const calories = formData.get('calories')
	const diet = capitalize(formData.get('diet')?.toString() as string)
	const dislikes = capitalize(formData.get('dislikes')?.toString() as string)
	const cuisineLists = ['indonesian', 'western', 'asian', 'mediterranean']
	let allergies = capitalize(formData.get('allergies')?.toString() as string)
	let cuisines = cuisineLists
		.filter((cuisine) => formData.get(cuisine))
		.map((cuisine) => capitalize(cuisine))
		.join(', ')
	const MODELS = [
		'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
		'poolside/laguna-m.1:free',
		'inclusionai/ring-2.6-1t:free',
		'baidu/cobuddy:free',
		'poolside/laguna-xs.2:free',
	]

	let response: any = null
	let lastError: any = null

	console.log("Starting AI generation process...")

	for (const model of MODELS) {
		const startTime = Date.now()
		try {
			console.log(`Trying AI model: ${model}...`)

			// Increased timeout to 30s as free models can be slow
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			try {
				response = await ai.chat.send({
					chatRequest: {
						model: model,
						messages: [{
							role: 'user', content: `Generate a 7-day meal plan with the following parameters:

	Goal: ${goal}
	Daily Calories: ${calories} kcal
	Diet Type: ${diet}
	Allergies: ${allergies}
	Cuisine Preference: ${cuisines}
	Foods to Avoid: ${dislikes}

	For each day, provide:
	- Breakfast (~25% of daily calories)
	- Lunch (~35% of daily calories)
	- Dinner (~30% of daily calories)
	- Snacks (~10% of daily calories)

	Each meal should include:
	- Name (appealing, specific)
	- Brief description
	- Calories, Protein (g), Carbs (g), Fats (g)

	Requirements:
	- No meal repetition within 7 days
	- Balanced macros:
	  * Weight Loss: 30% protein, 40% carbs, 30% fat
	  * Muscle Gain: 30% protein, 40% carbs, 30% fat
	  * Maintenance: 25% protein, 45% carbs, 30% fat
	- Realistic meals (not overly complicated)
	- Consider cuisine preference
	- Avoid listed allergens & dislikes

	Rules:
	- carbs, fats, and proteins key should not end with _g
	- Give average calories, proteins, carbs, and fats per day
	- Data returned in json should only saved into two keys: 'days' (The meal plan) and 'average_daily_nutrition'
	- All protein data should saved in 'proteins' key
	- breakfast, lunch, dinner, and snack should saved as object, not array
	- breakfast, lunch, dinner, and snack should saved inside a 'meals' key
	- Snack should save in 'snack' key without added 's'
	- Give information about ingredients for the food listed and save it in 'grocery' key, also give category for each ingredient
	- The category should saved as key, not in value, and the item should save as array inside the key. (IMPORTANT!)
	- Provide quantity for each item and add the quantity after the name of the item (don't separate quantity into another key)
	- Provide estimated grocery total in Rupiah and save it in 'grocery_total_rupiah' key (IMPORTANT!)

	Return ONLY valid JSON with days, meals, and nutrition. No explanation.
	`}],
					}
				}, { signal: controller.signal });
			} finally {
				clearTimeout(timeoutId);
			}

			if (response?.choices?.[0]?.message?.content) {
				console.log(`Success with ${model} in ${Date.now() - startTime}ms`)
				break
			} else {
				throw new Error("Empty response content")
			}
		} catch (err: any) {
			const duration = Date.now() - startTime
			console.error(`AI Model failed (${model}) after ${duration}ms:`, err.name === 'AbortError' ? 'Timeout' : err.message)
			lastError = err
			response = null // Reset for next iteration
		}
	}

	if (!response || !response.choices?.[0]?.message?.content) {
		throw new Error(`All AI models failed or returned empty content. Last error: ${lastError?.message}`)
	}

	const content = response.choices[0].message.content
	const cleanedContent = clean(content)

	let planData;
	try {
		planData = JSON.parse(cleanedContent)
	} catch (e) {
		console.error("Failed to parse AI JSON. Payload length:", cleanedContent.length, "Preview:", cleanedContent.substring(0, 100))
		throw new Error("AI returned invalid data format. Please try again.")
	}

	// Save to Supabase if user is logged in
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()

	if (user) {
		const { data: plan, error: planError } = await supabase
			.from("meal_plans")
			.insert({
				user_id: user.id,
				week_start_date: new Date().toISOString().split('T')[0],
				status: 'planned'
			})
			.select()
			.single()

		if (planError || !plan) {
			console.error("Error creating meal plan:", planError)
			throw new Error("Failed to create meal plan record.")
		}

		const mealsToInsert: MealInsert[] = []
		if (planData.days && Array.isArray(planData.days)) {
			planData.days.forEach((day: any, index: number) => {
				const dayNumber = index + 1
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
							})
						}
					})
				}
			})
		}

		if (mealsToInsert.length > 0) {
			const { error: mealsError } = await supabase.from("meals").insert(mealsToInsert)
			if (mealsError) {
				console.error("Error inserting meals:", mealsError)
				// Compensating logic: delete the orphan plan
				try {
					await supabase.from("meal_plans").delete().eq("id", plan.id)
				} catch (cleanupError) {
					console.error(`Failed to cleanup orphan meal plan ${plan.id}:`, cleanupError)
				}
				throw new Error("Failed to save meals to the plan.")
			}
		}
	}

	const userEmail = user?.email || 'User'
	const username = (userEmail && typeof userEmail === 'string' && userEmail.includes('@')) 
		? userEmail.split('@')[0] 
		: userEmail

	return {
		...prevState,
		data: planData,
		input: {
			goal,
			calories,
			diet,
			allergies,
			cuisines,
			dislikes,
			email: userEmail,
			username,
		},
	}
}
