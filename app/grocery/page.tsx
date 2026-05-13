'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'

export default function Grocery() {
	const supabase = createClient()
	const [isMounted, setIsMounted] = useState(false)
	const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
	const [grocery, setGrocery] = useState<any>(undefined)
	const [groceryTotal, setGroceryTotal] = useState<number | undefined>(undefined)
	const [email, setEmail] = useState<string>('User')
	const [planPeriod, setPlanPeriod] = useState<string>('')
	const [pdfLoading, setPdfLoading] = useState(false)
	const [shareLoading, setShareLoading] = useState(false)
	const [loading, setLoading] = useState(true)
	const divRef = useRef(null)

	useEffect(() => {
		async function fetchData() {
			setIsMounted(true)
			setLoading(true)

			const { data: { user } } = await supabase.auth.getUser()
			if (!user) {
				redirect('/login')
				return
			}

			// Fetch the latest meal plan from Supabase for grocery data
			const { data: mealPlans, error: planError } = await supabase
				.from('meal_plans')
				.select('*, meals(*)')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(1)

			if (planError || !mealPlans || mealPlans.length === 0) {
				console.error("Error fetching grocery data from Supabase:", planError)
				// Fallback to localStorage
				const savedMeals = localStorage.getItem('meals')
				if (savedMeals) {
					const parsedMeals = JSON.parse(savedMeals)
					setGrocery(parsedMeals.grocery)
					setGroceryTotal(parsedMeals.grocery_total_rupiah)
				}
			} else {
				const plan = mealPlans[0]
				
				// Re-aggregate grocery list if it's not directly in the plan record
				// Note: Currently the schema doesn't store the aggregated grocery JSON 
				// but we can fallback to localStorage or re-parse from meals if needed.
				// For now, prioritize localStorage for the specific 'grocery' JSON structure
				const savedMeals = localStorage.getItem('meals')
				if (savedMeals) {
					const parsedMeals = JSON.parse(savedMeals)
					setGrocery(parsedMeals.grocery)
					setGroceryTotal(parsedMeals.grocery_total_rupiah)
				}

				const baseDate = new Date(plan.week_start_date)
				const endDate = new Date(baseDate)
				endDate.setDate(endDate.getDate() + 6)
				const period = `${baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
				setPlanPeriod(period)
			}

			// Load checked items from localStorage (this is client-specific progress)
			const savedChecked = localStorage.getItem('groceries_done')
			if (savedChecked) {
				setCheckedItems(JSON.parse(savedChecked))
			}

			const savedPreferences = localStorage.getItem('preferences')
			if (savedPreferences) {
				const prefs = JSON.parse(savedPreferences)
				setEmail(prefs.email || user.email || 'User')
			} else {
				setEmail(user.email || 'User')
			}

			setLoading(false)
		}

		fetchData()
	}, [])

	useEffect(() => {
		if (isMounted) {
			localStorage.setItem('groceries_done', JSON.stringify(checkedItems))
		}
	}, [checkedItems, isMounted])

	const totalItems = Object.values(grocery || {}).reduce(
		(acc: number, cat: any) => acc + (Array.isArray(cat) ? cat.length : 0),
		0
	)
	const checkedCount = Object.values(checkedItems).filter(Boolean).length

	if (!isMounted || loading) {
		return (
			<div className='min-h-screen bg-[#effdf8] flex items-center justify-center'>
				<div className='animate-pulse text-emerald-600 font-medium'>
					Loading your grocery list...
				</div>
			</div>
		)
	}

	const toggleItem = (categoryIndex: number, itemIndex: number) => {
		const key = `${categoryIndex}-${itemIndex}`
		setCheckedItems((prev) => ({
			...prev,
			[key]: !prev[key],
		}))
	}

	const generatePdf = async (isShare = false) => {
		if (divRef.current) {
			if (!isShare) setPdfLoading(true)
			else setShareLoading(true)

			const { default: html2canvas } = await import('html2canvas-pro')
			const { default: jsPDF } = await import('jspdf')

			const canvas = await html2canvas(divRef.current, {
				scale: 2,
				useCORS: true,
				backgroundColor: '#ffffff',
				logging: false,
			})

			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4',
			})

			const imgData = canvas.toDataURL('image/png')
			const pdfWidth = pdf.internal.pageSize.getWidth()
			const pdfHeight = pdf.internal.pageSize.getHeight()
			
			// Calculate image dimensions to fit the page
			const margin = 10
			const contentWidth = pdfWidth - (2 * margin)
			const imgWidth = contentWidth
			const imgHeight = (canvas.height * imgWidth) / canvas.width

			// Header
			pdf.setFillColor(16, 185, 129) // Emerald-500
			pdf.rect(0, 0, pdfWidth, 25, 'F')
			pdf.setTextColor(255, 255, 255)
			pdf.setFontSize(18)
			pdf.setFont('helvetica', 'bold')
			pdf.text('Weekly Grocery List', margin, 16)
			
			// Date and User info
			pdf.setFontSize(10)
			pdf.setFont('helvetica', 'normal')
			
			// Get the start date of the meal plan from localStorage
			let dateStr = new Date().toLocaleDateString('en-US', { 
				weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
			})
			
			const now = localStorage.getItem('now')
			if (now) {
				const baseDate = new Date(now)
				if (!isNaN(baseDate.getTime())) {
					const endDate = new Date(baseDate)
					endDate.setDate(endDate.getDate() + 6)
					dateStr = `${baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
				}
			}
			
			pdf.text(`Plan Period: ${dateStr}`, pdfWidth - margin, 16, { align: 'right' })

			// Main Content
			pdf.addImage(imgData, 'PNG', margin, 30, imgWidth, imgHeight)

			// Total Estimate
			const totalY = 30 + imgHeight + 10
			if (totalY < pdfHeight - 20) {
				pdf.setFillColor(240, 253, 248) // Emerald-50
				pdf.rect(margin, totalY, contentWidth, 12, 'F')
				pdf.setTextColor(6, 95, 70) // Emerald-800
				pdf.setFontSize(11)
				pdf.setFont('helvetica', 'bold')
				pdf.text(`Estimated Total: Rp${groceryTotal?.toLocaleString() || '0'}`, margin + 5, totalY + 8)
			}

			// Footer
			pdf.setTextColor(150, 150, 150)
			pdf.setFontSize(8)
			pdf.text(`Generated for ${email} - MealPlanner AI`, pdfWidth / 2, pdfHeight - 10, { align: 'center' })

			const formattedDate = new Date().toISOString().split('T')[0]
			const filename = `Grocery_List_${formattedDate}_${email}.pdf`

			if (!isShare) {
				pdf.save(filename)
				setPdfLoading(false)
			} else {
				const file = new File([pdf.output('blob')], filename, {
					type: 'application/pdf',
				})
				navigator
					.share({ files: [file], title: 'My Grocery List', text: 'Here is my grocery list for the week!' })
					.finally(() => setShareLoading(false))
			}
		}
	}

	return (
		<div className='bg-[#effdf8] pb-8'>
			<div className='max-w-6xl mx-auto px-8 xl:px-0'>
				<nav className='pt-4 flex flex-col gap-2 mb-2'>
					<div className='flex justify-between items-center'>
						<Button
							className='hover:cursor-pointer'
							onClick={() => window.history.back()}
						>
							<ArrowLeft /> Meal Plan
						</Button>
						<h1 className='font-bold'>Grocery List</h1>
						<Button className='bg-[#effdf8] hover:bg-[#effdf8] select-none'>
							Grocery
						</Button>
					</div>
					<Separator />
				</nav>
				<div className='bg-white rounded-xl shadow-lg p-6 mb-6'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='bg-emerald-100 p-3 rounded-lg'>
								<ShoppingCart className='w-6 h-6 text-emerald-700' />
							</div>
							<div>
								<h2 className='mb-1'>Grocery List</h2>
								<p className='text-gray-600'>
									Ingredients for this week's meal plan
									{planPeriod && (
										<span className='ml-2 text-emerald-600 font-medium'>
											({planPeriod})
										</span>
									)}
								</p>
							</div>
						</div>
						<div className='text-right'>
							<div className='text-emerald-700'>
								{checkedCount} / {totalItems}
							</div>
							<div className='text-sm text-gray-500'>Items checked</div>
						</div>
					</div>
				</div>
				<div
					className='grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-8 mb-6'
					ref={divRef}
				>
					{grocery &&
						Object.entries(grocery)
							.filter(([, categoryData]) => Array.isArray(categoryData))
							.map(([category, categoryData]: any, categoryIndex: number) => (
								<div
									key={categoryIndex}
									className='bg-white rounded-xl shadow-lg overflow-hidden'
								>
									<div className='bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-4'>
										<h3 className='text-white'>
											{category.includes('_')
												? category.replaceAll('_', ' ')
												: category}
										</h3>
									</div>
									<div className='p-6'>
										<ul className='space-y-3'>
											{categoryData.map((item: any, itemIndex: number) => {
												const key = `${categoryIndex}-${itemIndex}`
												const [isChecked, setIsChecked] = useState(
													checkedItems[key] || false
												)

												return (
													<li key={itemIndex}>
														<label className='flex items-center gap-3 cursor-pointer group'>
															<div className='relative'>
																<Checkbox
																	checked={isChecked}
																	onCheckedChange={(state: boolean) => {
																		toggleItem(categoryIndex, itemIndex)
																		setIsChecked(state)
																	}}
																	className='w-5 h-5 rounded border-2 border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer'
																/>
															</div>
															<div className='flex-1'>
																<span
																	className={`${
																		isChecked
																			? 'line-through text-gray-400'
																			: 'text-gray-800'
																	} transition-all`}
																>
																	{item}
																</span>
															</div>
														</label>
													</li>
												)
											})}
										</ul>
									</div>
								</div>
							))}
				</div>
				<div className='bg-white rounded-xl shadow-lg p-6 mb-6 flex items-center justify-between'>
					<p className='text-lg font-bold text-emerald-800'>
						Estimated Weekly Total: 
						<span className='ml-2 text-emerald-600 font-mono'>
							Rp{groceryTotal?.toLocaleString() || '0'}
						</span>
					</p>
					<div className='flex gap-4'>
						<Button
							className='hover:cursor-pointer min-w-[160px]'
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
							className='hover:cursor-pointer min-w-[160px]'
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
				</div>
			</div>
		</div>
	)
}
