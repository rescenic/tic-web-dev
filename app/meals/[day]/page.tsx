'use client'

import { MealCard } from '@/components/MealCard'
import { Button } from '@/components/ui/button'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Calendar, TrendingUp, Utensils } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { JSX, useEffect, useRef, useState } from 'react'
import { useImmer } from 'use-immer'
import { Spinner } from '@/components/ui/spinner'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import { regenerateMealAction, generateMealDetailsAction } from '../action'
import { clean } from '@/lib/jsoncleaner'
import Cookies from 'js-cookie'
import { createClient } from '@/utils/supabase/client'
import { Meal, MealPlan } from '@/types/database'

export default function Meals() {
	const supabase = createClient()
	const router = useRouter()
	const [preferences, setPreferences] = useState<any>(undefined)
	const [meals, updateMeals] = useImmer<any>(undefined)
	const [average, setAverage] = useState<any>(undefined)
	const [mealAlt, setMealAlt] = useState<any>(undefined)
	const day = Number(usePathname().replace('/meals/', ''))
	const [baseDate, setBaseDate] = useState<Date | undefined>(undefined)
	const [date, setDate] = useState<Date | undefined>(undefined)
	const [loading, setLoading] = useState(true)

	const initialized = useRef(false)
	const [open, setOpen] = useState(false)
	const [limitOpen, setLimitOpen] = useState(false)
	const [isSmallScreen, setIsSmallScreen] = useState(true) // Default to true for SSR
	const breakfastRef = useRef(null)
	const lunchRef = useRef(null)
	const dinnerRef = useRef(null)
	const snackRef = useRef(null)
	const recipeRef = useRef(null)
	const [pdfLoading, setPdfLoading] = useState(false)
	const [shareLoading, setShareLoading] = useState(false)
	const [regLoading, setRegLoading] = useState(false)
	const [isReg, setIsReg] = useState(false)
	const [loadingInstructions, setLoadingInstructions] = useState<string | null>(null)

	const handleResize = () => setIsSmallScreen(window.innerWidth < 1024)

	const generateMealDetails = async (mealType: string) => {
		const meal = meals[mealType]
		if (!meal) return

		setLoadingInstructions(mealType)
		try {
			const result = await generateMealDetailsAction(meal.name, meal.description)
			if (result.success && result.data) {
				const { ingredients, instructions, grocery_items } = result.data
				
				updateMeals((prev: any) => {
					prev[mealType].instructions = instructions
					if (!prev[mealType].recipe) prev[mealType].recipe = {}
					prev[mealType].recipe.ingredients = ingredients
				})
				
				// Update Supabase
				const { data: { user } } = await supabase.auth.getUser()
				if (user) {
					const { data: mealPlans } = await supabase
						.from('meal_plans')
						.select('id, groceries')
						.eq('user_id', user.id)
						.order('created_at', { ascending: false })
						.limit(1)
					
					if (mealPlans && mealPlans.length > 0) {
						const planId = mealPlans[0].id
						
						// 1. Update the meal itself
						await supabase
							.from('meals')
							.update({ 
								instructions: instructions,
								recipe: { ingredients: ingredients }
							})
							.eq('meal_plan_id', planId)
							.eq('day_number', day)
							.eq('meal_type', mealType)

						// 2. Update the aggregated groceries in meal_plans and meal_groceries table
						if (grocery_items && Array.isArray(grocery_items)) {
							const currentGroceries = mealPlans[0].groceries || {}
							
							grocery_items.forEach((newItem: any) => {
								const category = newItem.category || 'Other'
								if (!currentGroceries[category]) {
									currentGroceries[category] = []
								}
								// Avoid duplicates if possible (simple check)
								if (!currentGroceries[category].includes(newItem.item)) {
									currentGroceries[category].push(newItem.item)
								}
							})

							// Update meal_plans table
							await supabase
								.from('meal_plans')
								.update({ groceries: currentGroceries })
								.eq('id', planId)

							// Update meal_groceries table (upsert-like behavior)
							for (const [category, items] of Object.entries(currentGroceries)) {
								const { data: existingCat } = await supabase
									.from('meal_groceries')
									.select('id')
									.eq('meal_plan_id', planId)
									.eq('category', category)
									.single()
								
								if (existingCat) {
									await supabase
										.from('meal_groceries')
										.update({ items: items })
										.eq('id', existingCat.id)
								} else {
									await supabase
										.from('meal_groceries')
										.insert({
											meal_plan_id: planId,
											category: category,
											items: items
										})
								}
							}

							// Update localStorage to keep it in sync
							const savedMeals = localStorage.getItem('meals')
							if (savedMeals) {
								const mealData = JSON.parse(savedMeals)
								mealData.grocery = currentGroceries
								if (mealData.days && mealData.days[day - 1]) {
									mealData.days[day - 1].meals[mealType].instructions = instructions
									if (!mealData.days[day - 1].meals[mealType].recipe) {
										mealData.days[day - 1].meals[mealType].recipe = {}
									}
									mealData.days[day - 1].meals[mealType].recipe.ingredients = ingredients
								}
								localStorage.setItem('meals', JSON.stringify(mealData))
							}
						}
					}
				}
			} else {
				alert('Failed to generate details. Please try again.')
			}
		} catch (error) {
			console.error('Error generating details:', error)
			alert('An error occurred. Please try again.')
		} finally {
			setLoadingInstructions(null)
		}
	}

	useEffect(() => {
		handleResize() // Set initial state
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	useEffect(() => {
		async function fetchData() {
			setLoading(true)
			const { data: { user } } = await supabase.auth.getUser()
			
			if (!user) {
				router.push('/login')
				return
			}

			// Fetch the latest meal plan from Supabase
			const { data: mealPlans, error: planError } = await supabase
				.from('meal_plans')
				.select('*, meals(*)')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(1)

			if (planError || !mealPlans || mealPlans.length === 0) {
				console.error("Error fetching meal plan from Supabase:", planError)
				// Fallback to localStorage if Supabase fails or is empty
				const savedMeals = localStorage.getItem('meals')
				if (savedMeals) {
					const mealData = JSON.parse(savedMeals)
					if (mealData.days && mealData.days[day - 1]) {
						updateMeals(mealData.days[day - 1].meals)
						setAverage(mealData.average_daily_nutrition)
					}
					} else {
					router.push('/form')
				}
			} else {
				const plan = mealPlans[0] as MealPlan
				const dayMeals = plan.meals?.filter(m => m.day_number === day)
				
				if (dayMeals && dayMeals.length > 0) {
					// Transform Supabase meals back into the format the UI expects
					const mealMap: any = {}
					dayMeals.forEach(m => {
						mealMap[m.meal_type] = {
							name: m.name,
							description: m.description,
							calories: m.calories,
							proteins: m.proteins,
							carbs: m.carbs,
							fats: m.fats,
							recipe: m.recipe,
							instructions: m.instructions
						}
					})
					updateMeals(mealMap)
					
					// Set base date from the plan's start date
					const startDate = new Date(plan.week_start_date)
					setBaseDate(startDate)
					
					// Calculate average daily nutrition from all meals in the plan
					if (plan.meals && plan.meals.length > 0) {
						const totals = plan.meals.reduce((acc, m) => ({
							calories: acc.calories + (Number(m.calories) || 0),
							proteins: acc.proteins + (Number(m.proteins) || 0),
							carbs: acc.carbs + (Number(m.carbs) || 0),
							fats: acc.fats + (Number(m.fats) || 0)
						}), { calories: 0, proteins: 0, carbs: 0, fats: 0 })

						setAverage({
							calories: (totals.calories / 7).toFixed(0),
							proteins: (totals.proteins / 7).toFixed(0),
							carbs: (totals.carbs / 7).toFixed(0),
							fats: (totals.fats / 7).toFixed(0)
						})
					}
				}
			}

			// Always load preferences from localStorage as they contain UI settings
			const savedPreferences = localStorage.getItem('preferences')
			if (savedPreferences) {
				setPreferences(JSON.parse(savedPreferences))
			} else {
				setPreferences({ email: user.email })
			}

			setLoading(false)
		}

		fetchData()
	}, [day])

	useEffect(() => {
		if (baseDate) {
			const newDate = new Date(baseDate)
			newDate.setDate(newDate.getDate() + (day - 1))
			setDate(newDate)
		}
	}, [day, baseDate])

	if (loading || !date) {
		return (
			<div className='min-h-screen bg-emerald-50 flex items-center justify-center'>
				<div className='animate-pulse text-emerald-600 font-medium'>
					Loading your meal plan...
				</div>
			</div>
		)
	}

	const paginations: JSX.Element[] = []

	for (let index = 1; index < 8; index++) {
		const paginationDate = new Date(baseDate!)
		paginationDate.setDate(paginationDate.getDate() + (index - 1))

		paginations.push(
			<PaginationItem key={index}>
				<PaginationLink
					{...(day !== index && { href: `/meals/${index}` })}
					isActive={day === index}
					className='w-fit px-2'
				>
					{paginationDate.toLocaleDateString('en-US', {
						weekday: 'long',
					})}
				</PaginationLink>
			</PaginationItem>
		)
	}

	const save = (params: any) => {
		updateMeals((prev: any) => {
			prev[params.mealType] = mealAlt.meals[params.index]
		})
		const localMeals = JSON.parse(localStorage.getItem('meals') as string)
		localMeals.days[day - 1].meals[params.mealType] =
			mealAlt.meals[params.index]
		localStorage.setItem('meals', JSON.stringify(localMeals))
		setOpen(false)
	}

	const generatePdf = async (isShare = false) => {
		if (
			!breakfastRef.current ||
			!lunchRef.current ||
			!dinnerRef.current ||
			!snackRef.current
		) return

		if (!isShare) setPdfLoading(true)
		else setShareLoading(true)

		try {
			const { default: html2canvas } = await import('html2canvas-pro')
			const { default: jsPDF } = await import('jspdf')

			const pdf = new jsPDF({ format: 'a5', unit: 'mm' })
			const refs = [breakfastRef, lunchRef, dinnerRef, snackRef, recipeRef]
			const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Recipe Details']
			let successCount = 0

			for (let i = 0; i < refs.length; i++) {
				const element = refs[i].current
				if (!element) continue

				try {
					const canvas = await html2canvas(element, {
						scale: 2,
						useCORS: true,
						backgroundColor: '#ffffff',
						ignoreElements: (el) => el.tagName === 'BUTTON' || el.getAttribute('data-html2canvas-ignore') === 'true'
					})
					
					if (successCount > 0) pdf.addPage()
					
					const imgData = canvas.toDataURL('image/png')
					const pdfWidth = pdf.internal.pageSize.getWidth()
					const pdfHeight = pdf.internal.pageSize.getHeight()
					
					// Add a nice header to each page
					pdf.setFillColor(16, 185, 129) // Emerald-500
					pdf.rect(0, 0, pdfWidth, 20, 'F')
					pdf.setTextColor(255, 255, 255)
					pdf.setFontSize(14)
					pdf.setFont('helvetica', 'bold')
					pdf.text(`Meal Plan - ${mealTypes[i]}`, 10, 13)
					
					// Add the meal card image
					const margin = 10
					const imgWidth = pdfWidth - (margin * 2)
					const imgHeight = (canvas.height * imgWidth) / canvas.width
					
					const maxHeight = pdfHeight - 40 // 20 for header, 20 for footer/margins
					
					if (imgHeight <= maxHeight) {
						const xPos = (pdfWidth - imgWidth) / 2
						pdf.addImage(imgData, 'PNG', xPos, 25, imgWidth, imgHeight)
					} else {
						// Image is too tall, split it into multiple pages
						let heightLeft = imgHeight
						let position = 25 // Start position after header
						let pageNumInRef = 1

						while (heightLeft > 0) {
							if (pageNumInRef > 1) {
								pdf.addPage()
								// Add header again for the new page
								pdf.setFillColor(16, 185, 129)
								pdf.rect(0, 0, pdfWidth, 20, 'F')
								pdf.setTextColor(255, 255, 255)
								pdf.setFontSize(14)
								pdf.setFont('helvetica', 'bold')
								pdf.text(`Meal Plan - ${mealTypes[i]} (cont.)`, 10, 13)
							}

							pdf.addImage(
								imgData, 
								'PNG', 
								(pdfWidth - imgWidth) / 2, 
								25 - (pageNumInRef - 1) * maxHeight, 
								imgWidth, 
								imgHeight
							)
							
							heightLeft -= maxHeight
							
							// Add footer
							pdf.setTextColor(150, 150, 150)
							pdf.setFontSize(8)
							pdf.setFont('helvetica', 'normal')
							const dateStr = date?.toLocaleDateString('en-US', { 
								weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
							})
							pdf.text(`Generated for ${preferences?.email || 'User'} on ${dateStr}`, 10, pdfHeight - 10)
							
							if (heightLeft > 0) pageNumInRef++
						}
					}
					
					if (imgHeight <= maxHeight) {
						// Add footer for single page case
						pdf.setTextColor(150, 150, 150)
						pdf.setFontSize(8)
						pdf.setFont('helvetica', 'normal')
						const dateStr = date?.toLocaleDateString('en-US', { 
							weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
						})
						pdf.text(`Generated for ${preferences?.email || 'User'} on ${dateStr}`, 10, pdfHeight - 10)
					}
					
					successCount++
				} catch (err) {
					console.error(`Failed to render canvas for ${mealTypes[i]}:`, err)
				}
			}

			if (successCount === 0) {
				alert("Failed to generate PDF content. Please try again.")
				return
			}

			const formattedDate = date?.toISOString().split('T')[0] || 'unknown_date'
			const userEmail = preferences?.email || 'User'
			const filename = `Meal_Plan_${formattedDate}_${userEmail}.pdf`

			if (!isShare) {
				pdf.save(filename)
			} else {
				const file = new File([pdf.output('blob')], filename, {
					type: 'application/pdf',
				})
				await navigator.share({ 
					files: [file], 
					title: 'My Meal Plan', 
					text: `Check out my meal plan for ${formattedDate}` 
				})
			}
		} catch (err) {
			console.error("PDF generation error:", err)
			alert("An error occurred while generating the PDF.")
		} finally {
			setPdfLoading(false)
			setShareLoading(false)
		}
	}

	const regenerate = async () => {
		if (Cookies.get('limit') && Cookies.get('limit') == '0') setLimitOpen(true)
		else {
			setRegLoading(true)
			if (Cookies.get('limit'))
				Cookies.set('limit', `${Number(Cookies.get('limit')) - 1}`, {
					expires: new Date(Cookies.get('expiry') as string),
				})
			else {
				const date = new Date()
				date.setDate(date.getDate() + 1)
				Cookies.set('limit', '2', { expires: date })
				Cookies.set('expiry', date.toISOString())
			}
			try {
				const resultAction = await regenerateMealAction(preferences, meals)
				if (!resultAction.success) throw new Error(resultAction.error)

				const result = resultAction.data.meals
				console.log(result)
				updateMeals((prev: any) => {
					;(prev.breakfast = result[0]),
						(prev.lunch = result[1]),
						(prev.dinner = result[2]),
						(prev.snack = result[3])
				})
				setMealAlt(meals)
				setIsReg(true)
			} catch (error) {
				console.error('Failed to regenerate meal:', error)
				alert('AI service is currently busy. Please try again later.')
			} finally {
				setRegLoading(false)
			}
		}
	}

	const saveReg = () => {
		const localMeals = JSON.parse(localStorage.getItem('meals') as string)
		localMeals.days[day - 1].meals = meals
		localStorage.setItem('meals', JSON.stringify(localMeals))
		setMealAlt(undefined)
		setIsReg(false)
	}

	const cancelReg = () => {
		updateMeals(mealAlt)
		setMealAlt(undefined)
		setIsReg(false)
	}

	return (
		<div className='px-4 flex flex-col gap-6 bg-[#effdf8]'>
			<nav className='pt-2 flex flex-col gap-2'>
				<div className='flex justify-between items-center'>
					<Link href='/form'>
						<Button className='hover:cursor-pointer'>
							<ArrowLeft /> Edit
						</Button>
					</Link>
					<h1 className='font-bold'>Meal Plan</h1>
					<Link href='/grocery'>
						<Button className='hover:cursor-pointer'>🛒 Grocery</Button>
					</Link>
				</div>
				<Separator />
			</nav>
			<header className='bg-white shadow-sm border-b'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
					<div className='flex items-center justify-center min-[548px]:justify-between flex-wrap gap-4'>
						<div className='flex flex-col gap-1'>
							<h1 className='text-emerald-700'>📅 Your 7-Day Meal Plan</h1>
							<div className='flex items-center gap-2 text-gray-600'>
								<Calendar className='w-5 h-5' />
								<p>
									{date &&
										date.toLocaleDateString('en-US', {
											weekday: 'long',
											day: 'numeric',
											month: 'short',
										})}{' '}
									(Hari ke-{day})
								</p>
							</div>
							<p>Target: {preferences && preferences.goal}</p>
						</div>
						<div className='bg-emerald-100 rounded-lg px-6 py-4'>
							<div className='flex items-center gap-2 mb-1'>
								<TrendingUp className='w-5 h-5 text-emerald-700' />
								<span className='text-emerald-700'>Daily Total</span>
							</div>
							<div className='grid grid-cols-2 gap-x-2'>
								<div className='text-emerald-900'>
									{meals &&
										(
											meals.breakfast.calories +
											meals.lunch.calories +
											meals.dinner.calories +
											meals.snack.calories
										).toFixed(1)}{' '}
									calories
								</div>
								<div className='text-emerald-900'>
									{meals &&
										(
											meals.breakfast.carbs +
											meals.lunch.carbs +
											meals.dinner.carbs +
											meals.snack.carbs
										).toFixed(1)}{' '}
									carbs
								</div>
								<div className='text-emerald-900'>
									{meals &&
										(
											meals.breakfast.proteins +
											meals.lunch.proteins +
											meals.dinner.proteins +
											meals.snack.proteins
										).toFixed(1)}{' '}
									proteins
								</div>
								<div className='text-emerald-900'>
									{meals &&
										(
											meals.breakfast.fats +
											meals.lunch.fats +
											meals.dinner.fats +
											meals.snack.fats
										).toFixed(1)}{' '}
									fats
								</div>
							</div>
						</div>
					</div>
				</div>
			</header>
			<div className='flex flex-col gap-6'>
				{meals && (
					<div className='grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-y-3 gap-y-6 gap-x-3'>
						<MealCard
							{...meals.breakfast}
							ref={breakfastRef}
							mealType='breakfast'
							time='7:00 AM'
							preferences={preferences}
							setMealAlt={setMealAlt}
							setOpen={setOpen}
						/>
						<MealCard
							{...meals.lunch}
							mealType='lunch'
							ref={lunchRef}
							time='12:30 PM'
							preferences={preferences}
							setMealAlt={setMealAlt}
							setOpen={setOpen}
						/>
						<MealCard
							{...meals.dinner}
							mealType='dinner'
							ref={dinnerRef}
							time='7:00 PM'
							preferences={preferences}
							setMealAlt={setMealAlt}
							setOpen={setOpen}
						/>
						<MealCard
							{...meals.snack}
							mealType='snack'
							ref={snackRef}
							time='(Free time)'
							preferences={preferences}
							setMealAlt={setMealAlt}
							setOpen={setOpen}
						/>
					</div>
				)}

				{/* Cooking Instructions Section */}
				{meals && (
					<div className='bg-white rounded-xl shadow-lg p-6' ref={recipeRef}>
						<h2 className='text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2'>
							<Utensils className='w-6 h-6' />
							Bahan & Cara Memasak (Recipe Details)
						</h2>
						<div className='space-y-8'>
							{['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
								const meal = meals[type];
								if (!meal) return null;

								const hasIngredients = meal.recipe?.ingredients && meal.recipe.ingredients.length > 0;
								const hasInstructions = meal.instructions && meal.instructions.length > 0;
								const isMissingDetails = !hasIngredients || !hasInstructions;

								return (
									<div key={type} className='border-b border-emerald-50 pb-8 last:border-0'>
										<div className='flex items-center justify-between mb-6'>
											<h3 className='text-xl font-bold text-emerald-700 capitalize flex items-center gap-2'>
												<span className='bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm'>
													{type}
												</span>
												{meal.name}
											</h3>
											<div className="flex gap-2">
												{(!isMissingDetails) && (
													<Button 
														variant="outline" 
														size="sm"
														className="text-amber-600 border-amber-200 hover:bg-amber-50"
														onClick={() => generateMealDetails(type)}
														disabled={loadingInstructions === type}
													>
														{loadingInstructions === type ? (
															<><Spinner /> Updating...</>
														) : (
															'🔄 Update'
														)}
													</Button>
												)}
												{(isMissingDetails) && (
													<Button 
														variant="outline" 
														size="sm"
														className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
														onClick={() => generateMealDetails(type)}
														disabled={loadingInstructions === type}
													>
														{loadingInstructions === type ? (
															<><Spinner /> Generating...</>
														) : (
															'🪄 Generate'
														)}
													</Button>
												)}
											</div>
										</div>
										
										<div className="grid md:grid-cols-2 gap-8">
											{/* Ingredients Section */}
											<div>
												<h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
													🥗 Bahan-bahan
												</h4>
												{hasIngredients ? (
													<ul className='space-y-1.5'>
														{meal.recipe.ingredients.map((item: string, i: number) => (
															<li key={i} className='flex items-start gap-2 text-gray-700 text-sm'>
																<span className='mt-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0' />
																<span>{item}</span>
															</li>
														))}
													</ul>
												) : (
													<p className='text-gray-500 italic text-sm'>
														Bahan-bahan belum tersedia.
													</p>
												)}
											</div>

											{/* Instructions Section */}
											<div>
												<h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
													🍳 Langkah Memasak
												</h4>
												{hasInstructions ? (
													<ul className='space-y-3'>
														{meal.instructions.map((step: string, i: number) => (
															<li key={i} className='flex gap-3 text-gray-700 text-sm'>
																<span className='shrink-0 w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold'>
																	{i + 1}
																</span>
																<span>{step}</span>
															</li>
														))}
													</ul>
												) : (
													<p className='text-gray-500 italic text-sm'>
														Instruksi memasak belum tersedia.
													</p>
												)}
											</div>
										</div>

										{isMissingDetails && (
											<div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-700 text-xs text-center">
												Klik "Generate" untuk melengkapi detail bahan dan cara memasak.
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				<div className='flex justify-end'>
					{isReg ? (
						<div className='flex gap-2'>
							<Button className='hover:cursor-pointer' onClick={cancelReg}>
								Cancel
							</Button>
							<Button className='hover:cursor-pointer' onClick={saveReg}>
								Save
							</Button>
						</div>
					) : (
						<Button
							className='hover:cursor-pointer'
							disabled={regLoading}
							onClick={regenerate}
						>
							{regLoading ? (
								<>
									<Spinner /> Processing...
								</>
							) : (
								'🔄 Regenerate Entire Day'
							)}
						</Button>
					)}
				</div>
				<Pagination>
					<PaginationContent className='flex-wrap justify-center'>
						{day > 1 && (
							<PaginationItem>
								<PaginationPrevious href={`/meals/${day - 1}`} />
							</PaginationItem>
						)}
						{paginations}
						{day < 7 && (
							<PaginationItem>
								<PaginationNext href={`/meals/${day + 1}`} />
							</PaginationItem>
						)}
					</PaginationContent>
				</Pagination>
			</div>
			<div className='bg-white rounded-xl shadow-lg p-6'>
				<h2 className='mb-4'>📊 Average Daily Nutrition</h2>
				<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
					<div className='text-center p-4 bg-emerald-50 rounded-lg'>
						<div className='text-emerald-700 mb-1'>
							{average && average.calories}
						</div>
						<div className='text-gray-600'>Total Calories</div>
					</div>
					<div className='text-center p-4 bg-blue-50 rounded-lg'>
						<div className='text-blue-700 mb-1'>
							{average && average.proteins}g
						</div>
						<div className='text-gray-600'>Total Protein</div>
					</div>
					<div className='text-center p-4 bg-amber-50 rounded-lg'>
						<div className='text-amber-700 mb-1'>
							{average && average.carbs}g
						</div>
						<div className='text-gray-600'>Total Carbs</div>
					</div>
					<div className='text-center p-4 bg-purple-50 rounded-lg'>
						<div className='text-purple-700 mb-1'>
							{average && average.fats}g
						</div>
						<div className='text-gray-600'>Total Fat</div>
					</div>
				</div>
			</div>
			<div className='flex gap-2 *:w-full mb-6'>
				<Button
					className='hover:cursor-pointer flex-1'
					onClick={() => generatePdf()}
					disabled={pdfLoading}
				>
					{pdfLoading ? (
						<>
							<Spinner /> Processing...
						</>
					) : (
						'Download PDF'
					)}
				</Button>
				<Button
					className='hover:cursor-pointer flex-1'
					onClick={() => generatePdf(true)}
					disabled={shareLoading}
				>
					{shareLoading ? (
						<>
							<Spinner /> Processing...
						</>
					) : (
						'Share Plan'
					)}
				</Button>
			</div>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className='sm:max-w-[90%] max-w-[85%] pb-12'>
					<DialogHeader>
						<DialogTitle className='capitalize'>
							{mealAlt && mealAlt.type} alternative
						</DialogTitle>
						<DialogDescription>
							Choose one of three alternative below by clicking 'Save' button
						</DialogDescription>
					</DialogHeader>
					<div className='grid lg:grid-cols-3 grid-cols-1 gap-x-3'>
						{mealAlt &&
							'meals' in mealAlt &&
							(isSmallScreen ? (
								<Carousel>
									<CarouselContent>
										{mealAlt.meals.map((meal: any, index: number) => (
											<CarouselItem key={index}>
												<MealCard
													{...meal}
													index={index}
													asMealAlt
													preferences={{}}
													setMealAlt={save}
													mealType={mealAlt.type}
												/>
											</CarouselItem>
										))}
									</CarouselContent>
									<CarouselPrevious className='hover:cursor-pointer' />
									<CarouselNext className='hover:cursor-pointer' />
								</Carousel>
							) : (
								mealAlt.meals.map((meal: any, index: number) => (
									<MealCard
										{...meal}
										key={index}
										index={index}
										asMealAlt
										preferences={{}}
										setMealAlt={save}
										mealType={mealAlt.type}
									/>
								))
							))}
					</div>
				</DialogContent>
				<Dialog open={limitOpen} onOpenChange={setLimitOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Excessive Use</DialogTitle>
							<DialogDescription>
								Regenerate entire day feature only have three times limit per
								day
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button className='hover:cursor-pointer'>Ok</Button>
							</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</Dialog>
		</div>
	)
}
