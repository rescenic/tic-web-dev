'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/utils/supabase/client'
import { estimateGroceryTotal, updatePlanTotal } from './action'

export default function Grocery() {
	const supabase = createClient()
	const router = useRouter()
	const [isMounted, setIsMounted] = useState(false)
	const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
	const [grocery, setGrocery] = useState<any>(undefined)
	const [groceryTotal, setGroceryTotal] = useState<number | undefined>(undefined)
	const [planId, setPlanId] = useState<string | undefined>(undefined)
	const [email, setEmail] = useState<string>('User')
	const [planPeriod, setPlanPeriod] = useState<string>('')
	const [pdfLoading, setPdfLoading] = useState(false)
	const [shareLoading, setShareLoading] = useState(false)
	const [isEstimating, setIsEstimating] = useState(false)
	const [loading, setLoading] = useState(true)
	const divRef = useRef(null)

	const handleEstimateTotal = async () => {
		if (!grocery || !planId) return
		
		setIsEstimating(true)
		try {
			const result = await estimateGroceryTotal(grocery)
			if (result.total > 0) {
				setGroceryTotal(result.total)
				await updatePlanTotal(planId, result.total)
				
				// Update localStorage
				const savedMeals = localStorage.getItem('meals')
				if (savedMeals) {
					const parsed = JSON.parse(savedMeals)
					parsed.grocery_total_rupiah = result.total
					localStorage.setItem('meals', JSON.stringify(parsed))
				}
			} else {
				alert('No prices found in database. Run the crawler script first to populate prices.')
			}
		} catch (error) {
			console.error('Error estimating total:', error)
		} finally {
			setIsEstimating(false)
		}
	}

	useEffect(() => {
		async function fetchData() {
			setIsMounted(true)
			setLoading(true)

			const { data: { user } } = await supabase.auth.getUser()
			if (!user) {
				router.push('/login')
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
				setPlanId(plan.id)
				
				// Prioritize grocery data from meal_plans table
				if (plan.groceries && Object.keys(plan.groceries).length > 0) {
					setGrocery(plan.groceries)
					setGroceryTotal(Number(plan.grocery_total_rupiah) || 0)
				} else {
					// Fallback to localStorage
					const savedMeals = localStorage.getItem('meals')
					if (savedMeals) {
						const parsedMeals = JSON.parse(savedMeals)
						setGrocery(parsedMeals.grocery)
						setGroceryTotal(parsedMeals.grocery_total_rupiah)
					}
				}

				// Load checked items from Supabase
				if (plan.checked_items) {
					setCheckedItems(plan.checked_items)
				} else {
					// Fallback to localStorage only if Supabase has nothing
					const savedChecked = localStorage.getItem(`groceries_done_${plan.id}`)
					if (savedChecked) {
						setCheckedItems(JSON.parse(savedChecked))
					}
				}

				const baseDate = new Date(plan.week_start_date)
				const endDate = new Date(baseDate)
				endDate.setDate(endDate.getDate() + 6)
				const period = `${baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
				setPlanPeriod(period)
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
		if (isMounted && planId) {
			// Save to localStorage as a quick backup
			localStorage.setItem(`groceries_done_${planId}`, JSON.stringify(checkedItems))
			
			// Sync to Supabase for persistence across devices
			const syncToSupabase = async () => {
				await supabase
					.from('meal_plans')
					.update({ checked_items: checkedItems })
					.eq('id', planId)
			}
			
			// Use a small debounce or just call it (React 18 will batch this)
			syncToSupabase()
		}
	}, [checkedItems, isMounted, planId])

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

	const toggleCheckAll = () => {
		const allItemsChecked = checkedCount === totalItems
		const newCheckedItems: Record<string, boolean> = {}

		if (!allItemsChecked) {
			Object.entries(grocery || {}).forEach(([category, categoryData]: any, categoryIndex: number) => {
				if (Array.isArray(categoryData)) {
					categoryData.forEach((item: any, itemIndex: number) => {
						const key = `${categoryIndex}-${itemIndex}`
						newCheckedItems[key] = true
					})
				}
			})
		}
		setCheckedItems(newCheckedItems)
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
			const addHeader = (pageNum: number) => {
				pdf.setFillColor(16, 185, 129) // Emerald-500
				pdf.rect(0, 0, pdfWidth, 25, 'F')
				pdf.setTextColor(255, 255, 255)
				pdf.setFontSize(18)
				pdf.setFont('helvetica', 'bold')
				pdf.text('Weekly Grocery List', margin, 16)
				
				pdf.setFontSize(10)
				pdf.setFont('helvetica', 'normal')
				
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
			}

			// Footer
			const addFooter = () => {
				pdf.setTextColor(150, 150, 150)
				pdf.setFontSize(8)
				pdf.text(`Generated for ${email} - Weekly Meal Planner AI`, pdfWidth / 2, pdfHeight - 10, { align: 'center' })
			}

			// Paging logic
			const pageHeight = pdfHeight - 60 // Reserved for header, footer, and margins
			let heightLeft = imgHeight
			let position = 30 // Start position after header
			let pageNum = 1

			addHeader(pageNum)
			
			// Add the first part of the image
			if (heightLeft <= pageHeight) {
				pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
				heightLeft = 0
			} else {
				// Multiple pages needed
				while (heightLeft > 0) {
					const sliceHeight = Math.min(heightLeft, pageHeight)
					
					// We use a source rectangle to "slice" the image if heightLeft > pageHeight
					// However, jsPDF's addImage doesn't easily support source rectangles for paging.
					// The common trick is to add the full image but with a vertical offset and hidden by the page boundary.
					// But for better results, we add the image and let it overflow, then add a new page.
					
					pdf.addImage(
						imgData, 
						'PNG', 
						margin, 
						position - (pageNum - 1) * pageHeight, 
						imgWidth, 
						imgHeight
					)
					
					heightLeft -= sliceHeight
					addFooter()

					if (heightLeft > 0) {
						pdf.addPage()
						pageNum++
						addHeader(pageNum)
					}
				}
			}

			// Total Estimate (only on the last page if there's room, otherwise add new page)
			const totalY = 30 + (imgHeight % pageHeight || pageHeight) + 10
			if (heightLeft === 0) {
				const currentTotalY = position + (imgHeight > pageHeight ? (imgHeight % pageHeight) : imgHeight) + 10
				const finalY = currentTotalY > pdfHeight - 20 ? (pdf.addPage(), pageNum++, addHeader(pageNum), addFooter(), 30) : currentTotalY
				
				pdf.setFillColor(240, 253, 248) // Emerald-50
				pdf.rect(margin, finalY, contentWidth, 12, 'F')
				pdf.setTextColor(6, 95, 70) // Emerald-800
				pdf.setFontSize(11)
				pdf.setFont('helvetica', 'bold')
				pdf.text(`Estimated Total: Rp${groceryTotal?.toLocaleString() || '0'}`, margin + 5, finalY + 8)
				
				if (finalY === 30) addFooter() // Footer for the extra page if added
			}

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
							{totalItems > 0 && (
								<Button 
									variant="link" 
									size="sm" 
									onClick={toggleCheckAll} 
									className="text-emerald-600 hover:text-emerald-800 p-0 h-auto text-xs mt-1"
								>
									{checkedCount === totalItems ? 'Uncheck All' : 'Check All'}
								</Button>
							)}
						</div>
					</div>
				</div>
				<div
					className='grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-8 mb-6'
					ref={divRef}
				>
					{(!grocery || Object.keys(grocery).length === 0) ? (
						<div className="col-span-full py-20 text-center bg-white rounded-xl shadow-md border border-emerald-50">
							<div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
								<ShoppingCart className="w-10 h-10 text-emerald-600" />
							</div>
							<h3 className="text-xl font-bold text-emerald-900 mb-2">Daftar Belanja Kosong</h3>
							<p className="text-emerald-600 max-w-md mx-auto mb-8">
								Belum ada item dalam daftar belanja Anda. Pastikan Anda sudah membuat meal plan atau melengkapi detail resep.
							</p>
							<Button onClick={() => window.history.back()} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
								Kembali ke Meal Plan
							</Button>
						</div>
					) : (
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
												const isChecked = !!checkedItems[key]

												return (
													<li key={itemIndex}>
														<label className='flex items-center gap-3 cursor-pointer group'>
															<div className='relative'>
																<Checkbox
																	checked={isChecked}
																	onCheckedChange={() => {
																		toggleItem(categoryIndex, itemIndex)
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
							))
					)}
				</div>
				<div className='bg-white rounded-xl shadow-lg p-6 mb-6 flex items-center justify-between'>
					<div className="flex flex-col gap-1">
						<p className='text-lg font-bold text-emerald-800'>
							Estimated Weekly Total: 
							<span className='ml-2 text-emerald-600 font-mono'>
								Rp{groceryTotal?.toLocaleString() || '0'}
							</span>
						</p>
						<Button 
							variant="link" 
							className="text-xs text-emerald-600 h-auto p-0 w-fit hover:text-emerald-800"
							onClick={handleEstimateTotal}
							disabled={isEstimating || !grocery}
						>
							{isEstimating ? 'Calculating...' : '🔄 Recalculate using real market prices'}
						</Button>
					</div>
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
