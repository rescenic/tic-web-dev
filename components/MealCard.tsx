import { Clock, Utensils } from 'lucide-react'
import { Button } from './ui/button'
import { ai } from '@/lib/ai'
import { Dispatch, RefObject, useState } from 'react'
import { Spinner } from './ui/spinner'
import { clean } from '@/lib/jsoncleaner'

export function MealCard({
	index,
	name,
	description,
	mealType,
	time,
	calories,
	proteins,
	carbs,
	fats,
	preferences,
	setMealAlt,
	setOpen,
	asMealAlt = false,
	ref,
}: {
	index?: number
	name: string
	description: string
	mealType: string
	time?: string
	calories: number
	proteins: number
	carbs: number
	fats: number
	preferences: {
		goal: string
		diet: string
		calories: number
		allergies: string
		cuisines: string
		dislikes: string
	}
	setMealAlt: Dispatch<any>
	setOpen: Dispatch<boolean>
	asMealAlt?: boolean
	ref?: RefObject<HTMLDivElement>
}) {
	const [loading, setLoading] = useState(false)

	const swap = async () => {
		setLoading(true)
		const response = await (ai.models as any)
			.generateContent({
				model: 'gemini-2.5-flash',
				contents: `Regenerate 3 ${mealType} meal plan alternative with the following parameters:
		
			Goal: ${preferences.goal}
			Daily Calories: ${preferences.calories} kcal
			Diet Type: ${preferences.diet}
			Allergies: ${preferences.allergies}
			Cuisine Preference: ${preferences.cuisines}
			Foods to Avoid: ${preferences.dislikes}
		
			Nutrition:
			- Calories: ${calories}
			- Proteins: ${proteins}
			- Carbs: ${carbs}
			- Fats: ${fats}
		
			Meal should include:
			- Name (appealing, specific)
			- Brief description
			- Calories, Protein (g), Carbs (g), Fats (g) (Each nutrition should same as provided above)
		
			Requirements:
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
			- All protein data should saved in 'proteins' key
			- Meals should save in 'meals' key and saved as Array
			- Don't provide average daily nutrition
			- Don't save meals with meal's name for key
			- Don't use capital letter as key
			- Don't save all nutrition in separate 'nutrition' key
		
			Return ONLY valid JSON with meals and nutrition. No explanation.
			`,
			})
			.finally(() => setLoading(false))
		const result = JSON.parse(clean(response.text as string)).meals
		setMealAlt({ type: mealType, meals: result })
		setOpen(true)
	}

	return (
		<div
			className='bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition'
			ref={ref}
		>
			<div className='p-6 relative flex flex-col justify-between h-full'>
				{!asMealAlt && (
					<div className='absolute top-3 right-4 bg-white px-3 py-1 rounded-full shadow-md'>
						<span className='text-emerald-600 capitalize'>{mealType}</span>
					</div>
				)}
				<div className='flex flex-col'>
					{time && (
						<div className='flex items-center gap-2 text-gray-500 mb-2'>
							<Clock className='w-4 h-4' />
							<span className='text-sm'>{time}</span>
						</div>
					)}

					<h1 className='mb-2 font-bold'>{name}</h1>
					<p className='text-gray-600 mb-2'>{description}</p>
				</div>
				<div className='flex flex-col'>
					<Button
						className='hover:cursor-pointer mb-4 w-fit self-end'
						onClick={asMealAlt ? () => setMealAlt({ index, mealType }) : swap}
						disabled={loading}
						data-html2canvas-ignore='true'
					>
						{loading ? (
							<>
								<Spinner /> Loading...
							</>
						) : asMealAlt ? (
							'Save'
						) : (
							'🔄 Swap'
						)}
					</Button>

					<div className='border-t pt-4'>
						<div className='flex items-center gap-2 mb-3'>
							<Utensils className='w-4 h-4 text-emerald-600' />
							<span className='text-sm text-gray-700'>Nutrition Info</span>
						</div>
						<div className='grid grid-cols-4 gap-2'>
							<div className='text-center'>
								<div className='text-emerald-600'>{calories}</div>
								<div className='text-xs text-gray-500'>Calories</div>
							</div>
							<div className='text-center'>
								<div className='text-emerald-600'>{proteins}g</div>
								<div className='text-xs text-gray-500'>Protein</div>
							</div>
							<div className='text-center'>
								<div className='text-emerald-600'>{carbs}g</div>
								<div className='text-xs text-gray-500'>Carbs</div>
							</div>
							<div className='text-center'>
								<div className='text-emerald-600'>{fats}g</div>
								<div className='text-xs text-gray-500'>Fat</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
