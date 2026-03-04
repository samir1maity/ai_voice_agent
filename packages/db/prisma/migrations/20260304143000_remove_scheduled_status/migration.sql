-- Rebuild CandidateStatus enum without SCHEDULED and normalize old values.
CREATE TYPE "CandidateStatus_new" AS ENUM (
  'PENDING',
  'CALLED',
  'NO_ANSWER',
  'APPROVED',
  'REJECTED',
  'IN_PROCESS'
);

ALTER TABLE "candidates"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CandidateStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'SCHEDULED' THEN 'PENDING'
      ELSE "status"::text
    END
  )::"CandidateStatus_new",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TYPE "CandidateStatus" RENAME TO "CandidateStatus_old";
ALTER TYPE "CandidateStatus_new" RENAME TO "CandidateStatus";
DROP TYPE "CandidateStatus_old";
