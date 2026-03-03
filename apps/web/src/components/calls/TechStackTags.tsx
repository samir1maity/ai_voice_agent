'use client'

interface TechStackTagsProps {
  techStack: string[]
}

const techColorMap: Record<string, string> = {
  python: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  nodejs: 'bg-green-100 text-green-800 border-green-200',
  'node.js': 'bg-green-100 text-green-800 border-green-200',
  node: 'bg-green-100 text-green-800 border-green-200',
  typescript: 'bg-blue-100 text-blue-800 border-blue-200',
  react: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  postgres: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  postgresql: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  docker: 'bg-sky-100 text-sky-800 border-sky-200',
  aws: 'bg-orange-100 text-orange-800 border-orange-200',
  javascript: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  graphql: 'bg-pink-100 text-pink-800 border-pink-200',
  redis: 'bg-red-100 text-red-800 border-red-200',
  mongodb: 'bg-green-100 text-green-700 border-green-200',
  kubernetes: 'bg-blue-100 text-blue-700 border-blue-200',
  nextjs: 'bg-gray-100 text-gray-800 border-gray-200',
  'next.js': 'bg-gray-100 text-gray-800 border-gray-200',
  django: 'bg-green-100 text-green-900 border-green-200',
  fastapi: 'bg-teal-100 text-teal-800 border-teal-200',
  java: 'bg-orange-100 text-orange-900 border-orange-200',
  golang: 'bg-cyan-100 text-cyan-900 border-cyan-200',
  go: 'bg-cyan-100 text-cyan-900 border-cyan-200',
  rust: 'bg-orange-100 text-orange-800 border-orange-200',
}

function getTagClass(tech: string): string {
  const key = tech.toLowerCase().replace(/\s+/g, '')
  const matchedKey = Object.keys(techColorMap).find(
    (k) => k === key || k === tech.toLowerCase()
  )
  if (matchedKey) return techColorMap[matchedKey]
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function TechStackTags({ techStack }: TechStackTagsProps) {
  if (!techStack || techStack.length === 0) {
    return <p className="text-sm text-gray-400">No tech stack detected</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {techStack.map((tech) => (
        <span
          key={tech}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getTagClass(tech)}`}
        >
          {tech}
        </span>
      ))}
    </div>
  )
}
