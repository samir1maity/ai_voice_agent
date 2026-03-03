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
  DollarSign,
  PhoneCall,
  Bot,
  TrendingUp,
} from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CallStatusBadge } from '@/components/shared/StatusBadge'
import { analyticsApi } from '@/lib/api-client'

interface DashboardData {
  stats: {
    totalCalls: number
    qualifiedPercent: number
    avgDurationSeconds: number
    totalCost: number
    callsToday: number
    activeAgents: number
  }
  pipeline: {
    PENDING: number
    SCHEDULED: number
    CALLED: number
    QUALIFIED: number
    DISQUALIFIED: number
    NO_ANSWER: number
  }
  recentCalls: Array<{
    id: string
    candidateName: string
    status: string
    durationSeconds: number
    overallScore: number | null
    createdAt: string
  }>
  techFrequency: Array<{ tech: string; count: number }>
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
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
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
  PENDING: '#9ca3af',
  SCHEDULED: '#3b82f6',
  CALLED: '#a855f7',
  QUALIFIED: '#10b981',
  DISQUALIFIED: '#ef4444',
  NO_ANSWER: '#f59e0b',
}

const PIPELINE_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  CALLED: 'Called',
  QUALIFIED: 'Qualified',
  DISQUALIFIED: 'Disqualified',
  NO_ANSWER: 'No Answer',
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard(),
  })

  const stats = data?.stats

  const pipelineData = data?.pipeline
    ? Object.entries(data.pipeline).map(([key, count]) => ({
        name: PIPELINE_LABELS[key] ?? key,
        count,
        key,
      }))
    : []

  const techData = data?.techFrequency ?? []
  const recentCalls = data?.recentCalls ?? []

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your HR screening pipeline</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Total Calls"
                value={stats?.totalCalls ?? 0}
                icon={Phone}
                color="bg-blue-500"
              />
              <StatCard
                title="Qualified %"
                value={`${stats?.qualifiedPercent?.toFixed(1) ?? 0}%`}
                icon={TrendingUp}
                color="bg-emerald-500"
              />
              <StatCard
                title="Avg Duration"
                value={formatDuration(stats?.avgDurationSeconds ?? 0)}
                icon={Clock}
                color="bg-purple-500"
              />
              <StatCard
                title="Total Cost"
                value={`$${(stats?.totalCost ?? 0).toFixed(2)}`}
                icon={DollarSign}
                color="bg-orange-500"
              />
              <StatCard
                title="Calls Today"
                value={stats?.callsToday ?? 0}
                icon={PhoneCall}
                color="bg-cyan-500"
              />
              <StatCard
                title="Active Agents"
                value={stats?.activeAgents ?? 0}
                icon={Bot}
                color="bg-indigo-500"
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pipeline Funnel */}
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
                        <span className="w-24 shrink-0 text-right text-sm text-gray-600">
                          {item.name}
                        </span>
                        <div className="flex-1 h-6 rounded bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: PIPELINE_COLORS[item.key] ?? '#6b7280',
                            }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-sm font-semibold text-gray-700">
                          {item.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tech Stack Frequency */}
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
                    <XAxis
                      dataKey="tech"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
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
        </div>

        {/* Recent Calls */}
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
                      <th className="px-6 py-3 font-medium text-gray-500">Score</th>
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
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {call.candidateName}
                        </td>
                        <td className="px-6 py-3">
                          <CallStatusBadge status={call.status} />
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {call.durationSeconds ? formatDuration(call.durationSeconds) : '—'}
                        </td>
                        <td className="px-6 py-3">
                          {call.overallScore != null ? (
                            <span
                              className={`font-semibold ${
                                call.overallScore >= 70
                                  ? 'text-emerald-600'
                                  : call.overallScore >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {call.overallScore}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {formatDate(call.createdAt)}
                        </td>
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
            Failed to load dashboard data. Please refresh.
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
