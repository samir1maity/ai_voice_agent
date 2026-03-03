/*
  Warnings:

  - You are about to drop the column `communicationScore` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `disqualificationReason` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `emailSent` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `experienceScore` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `extractedSkills` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `interviewDatetime` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `interviewScheduled` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedAws` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedDocker` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedNodeJs` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedPostgres` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedPython` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedReact` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `mentionedTypeScript` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `qualificationReason` on the `call_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `technicalScore` on the `call_analytics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "call_analytics" DROP COLUMN "communicationScore",
DROP COLUMN "disqualificationReason",
DROP COLUMN "emailSent",
DROP COLUMN "experienceScore",
DROP COLUMN "extractedSkills",
DROP COLUMN "interviewDatetime",
DROP COLUMN "interviewScheduled",
DROP COLUMN "mentionedAws",
DROP COLUMN "mentionedDocker",
DROP COLUMN "mentionedNodeJs",
DROP COLUMN "mentionedPostgres",
DROP COLUMN "mentionedPython",
DROP COLUMN "mentionedReact",
DROP COLUMN "mentionedTypeScript",
DROP COLUMN "qualificationReason",
DROP COLUMN "technicalScore",
ADD COLUMN     "reason" TEXT;
