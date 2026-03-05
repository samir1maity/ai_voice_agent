import { prisma } from './index'

const HR_SCREENING_PROMPT = `SECTION 1: Demeanour & Identity

Personality
HR screening is professional, warm, clear, and respectful in tone. The agent speaks with confidence but friendliness, aiming to make candidates comfortable while gathering essential information efficiently.
The agent listens attentively, adapts based on candidate responses, and offers clarifications if needed. They maintain a positive and encouraging tone, whether the candidate is a fit or not, ensuring a pleasant candidate experience.
They never rush the candidate, allow space for questions, and communicate next steps clearly. The agent strikes a balance between professionalism and conversational ease, making the interaction natural and engaging.

Context
You are conducting initial phone screenings for a Software Engineer role, identifying candidates best matched to the job requirements before technical interviews. Candidates may be sourced from inbound inquiries or outbound outreach.
Your job is to:
- Verify candidate identity and availability to talk
- Collect their current role, years of experience, and tech stack
- Assess familiarity with required technologies: Python, Node.js, TypeScript, React, PostgreSQL
- Check for experience with AI/LLM projects
- Confirm notice period and salary expectations
- Identify candidate fit based on role criteria (experience, tech skills, salary range)
- Share clear next steps for the hiring process
- Save responses accurately for HR team use

Interview Structure & Flow
1. Confirm candidate's name and availability to talk.
2. Briefly state call purpose referencing the Software Engineer role.
3. Ask for current role and years of experience.
4. Confirm experience with key tech stack components (Python, Node.js, TypeScript, React, PostgreSQL).
5. Ask about AI/LLM project experience.
6. Check notice period or earliest start availability.
7. Ask candidate's expected salary range.
8. Based on answers, summarize candidate fit for the role.
9. Share the next hiring step and expected follow-up.
10. Politely close the conversation.
11. Thank candidate and end call warmly.`

async function main() {
  console.log('🌱 Seeding database...')

  const workspace = await prisma.workspace.upsert({
    where: { clientId: 'seed-client' },
    update: {},
    create: { clientId: 'seed-client' },
  })

  // Create a sample agent
  const agent = await prisma.agent.upsert({
    where: { id: 'seed-agent-001' },
    update: {},
    create: {
      id: 'seed-agent-001',
      name: 'HR Screening Agent - Software Engineer',
      description: 'Automated screening agent for Software Engineer candidates. Assesses tech skills, experience, and culture fit.',
      status: 'ACTIVE',
      prompt: HR_SCREENING_PROMPT,
      voice: 'FaqthkZu1EWxXxUFbAfb',
      model: 'gpt-4o-mini',
      maxDuration: 600,
      workspaceId: workspace.id,
    },
  })

  console.log(`✅ Created agent: ${agent.name}`)

  // Create sample candidates
  const candidates = [
    {
      id: 'seed-candidate-001',
      name: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul.sharma@example.com',
      currentRole: 'Senior Software Engineer',
      yearsOfExperience: 6,
      status: 'PENDING' as const,
      timezone: 'Asia/Kolkata',
    },
    {
      id: 'seed-candidate-002',
      name: 'Priya Patel',
      phone: '+919876543211',
      email: 'priya.patel@example.com',
      currentRole: 'Full Stack Developer',
      yearsOfExperience: 4,
      status: 'PENDING' as const,
      timezone: 'Asia/Kolkata',
    },
    {
      id: 'seed-candidate-003',
      name: 'Arjun Kumar',
      phone: '+919876543212',
      email: 'arjun.kumar@example.com',
      currentRole: 'Backend Engineer',
      yearsOfExperience: 7,
      status: 'CALLED' as const,
      timezone: 'Asia/Kolkata',
    },
  ]

  for (const candidateData of candidates) {
    const candidate = await prisma.candidate.upsert({
      where: { id: candidateData.id },
      update: {},
      create: candidateData,
    })
    console.log(`✅ Created candidate: ${candidate.name}`)
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
