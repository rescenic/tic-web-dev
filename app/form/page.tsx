'use client'

import Form from 'next/form'
import { input } from './action'
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useActionState, useEffect, useState } from 'react'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import SubmitButton from '@/components/SubmitButton'
import { redirect } from 'next/navigation'
import { decapitalize } from '@/lib/capitalize'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { logout } from './logout';

export default function Preferences() {
	const [preferences, _setPreferences] = useState<any>(
		typeof window !== 'undefined' && localStorage
			? JSON.parse(localStorage.getItem('preferences') as string)
			: undefined
	)
	const [calories, setCalories] = useState(1500)
	const [goal, setGoal] = useState('Weight Loss')
	const [formState, formAction] = useActionState(input, { data: '' })
	const [error, setError] = useState('')
	const [filledIn, setFilledIn] = useState(false)
	const [indonesian, setIndonesian] = useState(
		preferences
			? (decapitalize(preferences.cuisines) as string[]).includes('indonesian')
			: false
	)
	const [western, setWestern] = useState(
		preferences
			? (decapitalize(preferences.cuisines) as string[]).includes('western')
			: false
	)
	const [asian, setAsian] = useState(
		preferences
			? (decapitalize(preferences.cuisines) as string[]).includes('asian')
			: false
	)
	const [mediterranean, setMediterranean] = useState(
		preferences
			? (decapitalize(preferences.cuisines) as string[]).includes(
					'mediterranean'
			  )
			: false
	)

	useEffect(() => {
		if (formState.data.length !== 0) {
			localStorage.setItem('preferences', JSON.stringify(formState.input))
			localStorage.setItem('meals', JSON.stringify(formState.data))
			localStorage.setItem('now', new Date().toISOString())
			localStorage.removeItem('groceries_done')
			redirect('/meals/1')
		}
	}, [formState])

	useEffect(() => {
		if (preferences) {
			setGoal(preferences.goal)
			setCalories(preferences.calories)
			setFilledIn(indonesian || western || asian || mediterranean)
		}
	}, [preferences])

	return (
		<Form
			action={formAction}
			className='min-h-screen bg-linear-to-br from-emerald-50 via-blue-50 to-purple-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8'
		>
			<div className='max-w-2xl mx-auto'>
				<div className="flex justify-between items-center mb-6">
					<Button asChild variant="ghost" className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 gap-2">
						<Link href="/dashboard">
							<LayoutDashboard className="w-4 h-4" />
							Back to Dashboard
						</Link>
					</Button>
					<form action={logout}>
						<Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2">
							<LogOut className="w-4 h-4" />
							Logout
						</Button>
					</form>
				</div>
				<FieldSet className='bg-white rounded-2xl shadow-lg p-8 sm:p-12'>
					<div className='text-center mb-10'>
						<FieldLegend className='text-4xl sm:text-5xl font-bold bg-linear-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-3'>
							Weekly Meal Planner
						</FieldLegend>
						<FieldDescription className='text-lg text-gray-600'>
							✨ AI-powered meal planning tailored to your goals
						</FieldDescription>
					</div>
					<FieldGroup>
						<Field className='bg-linear-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200'>
							<FieldLabel
								htmlFor='goal'
								className='text-lg font-semibold text-emerald-900 mb-4'
							>
								🎯 What's your goal?
							</FieldLabel>
							<RadioGroup
								defaultValue={
									preferences
										? (decapitalize(preferences.goal) as string)
										: 'weight-loss'
								}
								id='goal'
								name='goal'
								onValueChange={(value) => {
									switch (value) {
										case 'weight-loss':
											setCalories(1500)
											setGoal('Weight Loss')
											break
										case 'muscle-gain':
											setCalories(2500)
											setGoal('Muscle Gain')
											break
										case 'maintenance':
											setCalories(2000)
											setGoal('Maintenance')
											break
										case 'healthy-eating':
											setCalories(2200)
											setGoal('Healthy Eating')
											break
									}
								}}
							>
								<div className='flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-200 transition-colors'>
									<RadioGroupItem value='weight-loss' id='r1' />
									<Label htmlFor='r1' className='cursor-pointer font-medium'>
										Weight Loss
									</Label>
								</div>
								<div className='flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-200 transition-colors'>
									<RadioGroupItem value='muscle-gain' id='r2' />
									<Label htmlFor='r2' className='cursor-pointer font-medium'>
										Muscle Gain
									</Label>
								</div>
								<div className='flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-200 transition-colors'>
									<RadioGroupItem value='maintenance' id='r3' />
									<Label htmlFor='r3' className='cursor-pointer font-medium'>
										Maintenance
									</Label>
								</div>
								<div className='flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-200 transition-colors'>
									<RadioGroupItem value='healthy-eating' id='r4' />
									<Label htmlFor='r4' className='cursor-pointer font-medium'>
										Healthy Eating
									</Label>
								</div>
							</RadioGroup>
						</Field>
						<Field className='bg-linear-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200'>
							<FieldLabel
								htmlFor='calories'
								className='text-lg font-semibold text-blue-900 mb-4'
							>
								📊 Daily calorie target
							</FieldLabel>
							<InputGroup className='bg-white rounded-lg border border-blue-300'>
								<InputGroupInput
									id='calories'
									name='calories'
									type='number'
									value={calories}
									className='border-0 focus:ring-2 focus:ring-blue-500'
									onChange={(e) => {
										setCalories(Number(e.target.value))
										if (goal === 'Weight Loss') {
											if (Number(e.target.value) < 1500) setError('too low')
											else if (Number(e.target.value) > 2400)
												setError('too high')
											else setError('')
										}
										if (goal === 'Muscle Gain') {
											if (Number(e.target.value) < 2500) setError('too low')
											else if (Number(e.target.value) > 3600)
												setError('too high')
											else setError('')
										}
										if (goal === 'Maintenance') {
											if (Number(e.target.value) < 2000) setError('too low')
											else if (Number(e.target.value) > 2500)
												setError('too high')
											else setError('')
										}
										if (goal === 'Healthy Eating') {
											if (Number(e.target.value) < 2200) setError('too low')
											else if (Number(e.target.value) > 3000)
												setError('too high')
											else setError('')
										}
									}}
								/>
								<InputGroupAddon align='inline-end'>
									<InputGroupText className='bg-blue-100 text-blue-700 font-semibold'>
										kcal
									</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
							{error && (
								<p className='text-red-600 font-medium mt-2'>
									⚠️ Calorie target is {error}
								</p>
							)}
							<p className='text-sm text-blue-700 mt-2 font-medium'>
								Based on your goal: <span className='font-bold'>{goal}</span>
							</p>
						</Field>
						<Field className='bg-linear-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200'>
							<FieldLabel
								htmlFor='diet'
								className='text-lg font-semibold text-purple-900 mb-4'
							>
								🥗 Diet type
							</FieldLabel>
							<Select
								defaultValue={
									preferences
										? (decapitalize(preferences.diet) as string)
										: 'standard'
								}
								name='diet'
							>
								<SelectTrigger className='bg-white rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500'>
									<SelectValue placeholder='Select a diet type' />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel className='font-semibold'>
											Diet type
										</SelectLabel>
										<SelectItem value='standard'>Standard</SelectItem>
										<SelectItem value='vegetarian'>Vegetarian</SelectItem>
										<SelectItem value='vegan'>Vegan</SelectItem>
										<SelectItem value='keto'>Keto</SelectItem>
										<SelectItem value='low-carb'>Low-Carb</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
						<Field className='bg-linear-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200'>
							<FieldLabel
								htmlFor='cuisine'
								className='text-lg font-semibold text-orange-900 mb-4'
							>
								🍽️ Cuisine preference
							</FieldLabel>
							<div id='cuisine' className='grid grid-cols-2 gap-1.5 sm:gap-3'>
								<div className='flex items-center gap-3 p-1.5 sm:p-3 rounded-lg hover:bg-orange-200 transition-colors'>
									<Checkbox
										id='indonesian'
										name='indonesian'
										checked={indonesian}
										onCheckedChange={(state: boolean) => {
											setIndonesian(state)
											setFilledIn(state || western || asian || mediterranean)
										}}
									/>
									<Label
										htmlFor='indonesian'
										className='cursor-pointer font-medium'
									>
										Indonesian
									</Label>
								</div>
								<div className='flex items-center gap-3 p-1.5 sm:p-3 rounded-lg hover:bg-orange-200 transition-colors'>
									<Checkbox
										id='western'
										name='western'
										checked={western}
										onCheckedChange={(state: boolean) => {
											setWestern(state)
											setFilledIn(indonesian || state || asian || mediterranean)
										}}
									/>
									<Label
										htmlFor='western'
										className='cursor-pointer font-medium'
									>
										Western
									</Label>
								</div>
								<div className='flex items-center gap-3 p-1.5 sm:p-3 rounded-lg hover:bg-orange-200 transition-colors'>
									<Checkbox
										id='asian'
										name='asian'
										checked={asian}
										onCheckedChange={(state: boolean) => {
											setAsian(state)
											setFilledIn(
												indonesian || western || state || mediterranean
											)
										}}
									/>
									<Label htmlFor='asian' className='cursor-pointer font-medium'>
										Asian
									</Label>
								</div>
								<div className='flex items-center gap-3 p-1.5 sm:p-3 rounded-lg hover:bg-orange-200 transition-colors'>
									<Checkbox
										id='mediterranean'
										name='mediterranean'
										checked={mediterranean}
										onCheckedChange={(state: boolean) => {
											setMediterranean(state)
											setFilledIn(indonesian || western || asian || state)
										}}
									/>
									<Label
										htmlFor='mediterranean'
										className='cursor-pointer font-medium'
									>
										Mediterranean
									</Label>
								</div>
							</div>
							{!filledIn && (
								<p className='text-orange-700 text-sm font-medium mt-3'>
									⚠️ Please select at least one cuisine preference
								</p>
							)}
						</Field>
						<Field className='bg-linear-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200'>
							<FieldLabel
								htmlFor='allergies'
								className='text-lg font-semibold text-red-900 mb-4'
							>
								⚠️ Allergies (optional)
							</FieldLabel>
							<p className='text-sm text-red-700 mb-3'>
								Separate with commas (e.g: nuts, dairy, gluten, etc)
							</p>
							<Input
								id='allergies'
								name='allergies'
								type='text'
								defaultValue={preferences && preferences.allergies}
								placeholder='Enter your allergies...'
								className='bg-white rounded-lg border border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
							/>
						</Field>
						<Field className='bg-linear-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200'>
							<FieldLabel
								htmlFor='dislikes'
								className='text-lg font-semibold text-amber-900 mb-4'
							>
								🚫 Foods you dislike (optional)
							</FieldLabel>
							<p className='text-sm text-amber-700 mb-3'>
								Separate with commas (e.g: tofu, noodle, etc)
							</p>
							<Input
								id='dislikes'
								name='dislikes'
								type='text'
								defaultValue={preferences && decapitalize(preferences.dislikes)}
								placeholder='Enter foods you want to avoid...'
								className='bg-white rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent'
							/>
						</Field>
						<div className='flex gap-2 flex-wrap'>
							<SubmitButton invalid={!filledIn} />
							{preferences && (
								<Link href='/meals/1' className='flex-1'>
									<Button className='hover:cursor-pointer w-full'>
										Go to meals page
									</Button>
								</Link>
							)}
						</div>
					</FieldGroup>
				</FieldSet>
			</div>
		</Form>
	)
}
