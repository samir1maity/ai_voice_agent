-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'SCHEDULED', 'CALLED', 'QUALIFIED', 'DISQUALIFIED', 'NO_ANSWER');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SYNCING');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bolnaAgentId" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'SYNCING',
    "prompt" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'FaqthkZu1EWxXxUFbAfb',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "maxDuration" INTEGER NOT NULL DEFAULT 600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "currentRole" TEXT,
    "yearsOfExperience" INTEGER,
    "resumeUrl" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "notes" TEXT,
    "importBatchId" TEXT,
    "latestScore" INTEGER,
    "latestSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "bolnaExecutionId" TEXT,
    "agentId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
    "transcript" TEXT,
    "summary" TEXT,
    "duration" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "agentPhoneNumber" TEXT,
    "candidatePhoneNumber" TEXT,
    "callType" TEXT DEFAULT 'outbound',
    "provider" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rawWebhookPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_analytics" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "overallScore" INTEGER,
    "communicationScore" INTEGER,
    "technicalScore" INTEGER,
    "experienceScore" INTEGER,
    "mentionedPython" BOOLEAN NOT NULL DEFAULT false,
    "mentionedNodeJs" BOOLEAN NOT NULL DEFAULT false,
    "mentionedTypeScript" BOOLEAN NOT NULL DEFAULT false,
    "mentionedReact" BOOLEAN NOT NULL DEFAULT false,
    "mentionedPostgres" BOOLEAN NOT NULL DEFAULT false,
    "mentionedDocker" BOOLEAN NOT NULL DEFAULT false,
    "mentionedAws" BOOLEAN NOT NULL DEFAULT false,
    "detectedTechStack" TEXT[],
    "isQualified" BOOLEAN,
    "qualificationReason" TEXT,
    "disqualificationReason" TEXT,
    "extractedYearsExp" INTEGER,
    "extractedCurrentRole" TEXT,
    "extractedSkills" TEXT[],
    "interviewScheduled" BOOLEAN NOT NULL DEFAULT false,
    "interviewDatetime" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_bolnaAgentId_key" ON "agents"("bolnaAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_phone_key" ON "candidates"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex
CREATE INDEX "candidates_importBatchId_idx" ON "candidates"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "calls_bolnaExecutionId_key" ON "calls"("bolnaExecutionId");

-- CreateIndex
CREATE INDEX "calls_candidateId_idx" ON "calls"("candidateId");

-- CreateIndex
CREATE INDEX "calls_agentId_idx" ON "calls"("agentId");

-- CreateIndex
CREATE INDEX "calls_status_idx" ON "calls"("status");

-- CreateIndex
CREATE INDEX "calls_bolnaExecutionId_idx" ON "calls"("bolnaExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "call_analytics_callId_key" ON "call_analytics"("callId");

-- CreateIndex
CREATE INDEX "call_analytics_candidateId_idx" ON "call_analytics"("candidateId");

-- CreateIndex
CREATE INDEX "call_analytics_isQualified_idx" ON "call_analytics"("isQualified");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_analytics" ADD CONSTRAINT "call_analytics_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_analytics" ADD CONSTRAINT "call_analytics_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
