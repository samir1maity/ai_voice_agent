'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { candidatesApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST - India Standard Time (UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'GST - Gulf Standard Time (UTC+4)' },
  { value: 'Asia/Singapore', label: 'SGT - Singapore Time (UTC+8)' },
  { value: 'America/New_York', label: 'EST - Eastern Standard Time (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'PST - Pacific Standard Time (UTC-8)' },
  { value: 'Europe/London', label: 'GMT - Greenwich Mean Time (UTC+0)' },
  { value: 'Europe/Berlin', label: 'CET - Central European Time (UTC+1)' },
  { value: 'Australia/Sydney', label: 'AEST - Australian Eastern Time (UTC+10)' },
]

interface CandidateFormData {
  name: string
  phone: string
  email: string
  currentRole: string
  yearsOfExperience: string
  timezone: string
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
  yearsOfExperience?: string
}

export default function NewCandidatePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<CandidateFormData>({
    name: '',
    phone: '',
    email: '',
    currentRole: '',
    yearsOfExperience: '',
    timezone: 'Asia/Kolkata',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const createMutation = useMutation({
    mutationFn: () =>
      candidatesApi.create({
        ...form,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Candidate added', description: `${form.name} has been added.` })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      router.push('/candidates')
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add candidate', description: err.message, variant: 'destructive' })
    },
  })

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.phone.trim()) newErrors.phone = 'Phone is required'
    else if (!/^\+?[\d\s\-()]{7,}$/.test(form.phone.trim()))
      newErrors.phone = 'Enter a valid phone number'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'Enter a valid email address'
    if (form.yearsOfExperience && (isNaN(Number(form.yearsOfExperience)) || Number(form.yearsOfExperience) < 0))
      newErrors.yearsOfExperience = 'Enter a valid number'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    createMutation.mutate()
  }

  const set =
    (field: keyof CandidateFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/candidates">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Candidate</h1>
            <p className="text-sm text-gray-500">Register a new candidate for screening</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Candidate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={set('name')}
                  className={errors.name ? 'border-red-400' : ''}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={set('phone')}
                  className={errors.phone ? 'border-red-400' : ''}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="priya@example.com"
                  value={form.email}
                  onChange={set('email')}
                  className={errors.email ? 'border-red-400' : ''}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentRole">Current Role</Label>
                  <Input
                    id="currentRole"
                    placeholder="e.g. Backend Engineer"
                    value={form.currentRole}
                    onChange={set('currentRole')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 5"
                    value={form.yearsOfExperience}
                    onChange={set('yearsOfExperience')}
                    className={errors.yearsOfExperience ? 'border-red-400' : ''}
                  />
                  {errors.yearsOfExperience && (
                    <p className="text-xs text-red-500">{errors.yearsOfExperience}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={form.timezone}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, timezone: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/candidates">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Candidate'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
