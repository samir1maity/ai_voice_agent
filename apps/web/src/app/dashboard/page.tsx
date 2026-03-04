'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Phone,
  Users,
  Clock,
  PhoneCall,
  Bot,
  CheckCircle2,
} from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CallStatusBadge } from '@/components/shared/StatusBadge'
import { analyticsApi, getErrorMessage } from '@/lib/api-client'

interface DashboardData {
  metrics: {
    totalCalls: number
    completedCalls: number
    avgDuration: number
    callsToday: number
    activeAgents: number
    totalCandidates: number
  }
  funnel: {
    pending: number
    called: number
    noAnswer: number
  }
  recentCalls: Array<{
    id: string
    candidateName: string
    status: string
    duration: number | null
    initiatedAt: string
  }>
  techStackFrequency: Array<{ tech: string; count: number }>
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`rounded-xl p-3 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-7 w-16 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  )
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}m ${s}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const PIPELINE_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  called: '#a855f7',
  noAnswer: '#f59e0b',
}

const PIPELINE_LABELS: Record<string, string> = {
  pending: 'Pending',
  called: 'Called',
  noAnswer: 'No Answer',
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard(),
  })

  const metrics = data?.metrics

  const pipelineData = data?.funnel
    ? Object.entries(data.funnel).map(([key, count]) => ({
        name: PIPELINE_LABELS[key] ?? key,
        count,
        key,
      }))
    : []

  const techData = data?.techStackFrequency ?? []
  const recentCalls = data?.recentCalls ?? []

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your HR screening pipeline</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Total Calls" value={metrics?.totalCalls ?? 0} icon={Phone} color="bg-blue-500" />
              <StatCard title="Completed Calls" value={metrics?.completedCalls ?? 0} icon={CheckCircle2} color="bg-emerald-500" />
              <StatCard title="Avg Duration" value={formatDuration(metrics?.avgDuration ?? 0)} icon={Clock} color="bg-orange-500" />
              <StatCard title="Calls Today" value={metrics?.callsToday ?? 0} icon={PhoneCall} color="bg-cyan-500" />
              <StatCard title="Active Agents" value={metrics?.activeAgents ?? 0} icon={Bot} color="bg-indigo-500" />
              <StatCard title="Candidates" value={metrics?.totalCandidates ?? 0} icon={Users} color="bg-slate-500" />
            </>
          )}
        </div>

        {/* <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 animate-pulse rounded bg-gray-100" />
              ) : pipelineData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No pipeline data</p>
              ) : (
                <div className="space-y-2">
                  {pipelineData.map((item) => {
                    const max = Math.max(...pipelineData.map((d) => d.count), 1)
                    const pct = (item.count / max) * 100
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-right text-sm text-gray-600">{item.name}</span>
                        <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: PIPELINE_COLORS[item.key] ?? '#6b7280',
                            }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-sm font-semibold text-gray-700">{item.count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tech Stack Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 animate-pulse rounded bg-gray-100" />
              ) : techData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No tech data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={techData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="tech" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {techData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316'][index % 7]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div> */}

        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : recentCalls.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No recent calls</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500">Candidate</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Duration</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentCalls.map((call) => (
                      <tr
                        key={call.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => (window.location.href = `/calls/${call.id}`)}
                      >
                        <td className="px-6 py-3 font-medium text-gray-900">{call.candidateName}</td>
                        <td className="px-6 py-3">
                          <CallStatusBadge status={call.status} />
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {call.duration ? formatDuration(call.duration) : '—'}
                        </td>
                        <td className="px-6 py-3 text-gray-500">{formatDate(call.initiatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {getErrorMessage(error, 'Failed to load dashboard data. Please refresh.')}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
