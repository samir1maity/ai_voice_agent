-- Drop scoring columns from call analytics
DROP INDEX IF EXISTS "call_analytics_isQualified_idx";
ALTER TABLE "call_analytics"
  DROP COLUMN IF EXISTS "overallScore",
  DROP COLUMN IF EXISTS "isQualified",
  DROP COLUMN IF EXISTS "reason";

-- Drop score/summary columns from candidates
ALTER TABLE "candidates"
  DROP COLUMN IF EXISTS "latestScore",
  DROP COLUMN IF EXISTS "latestSummary";

-- Remove QUALIFIED and DISQUALIFIED from CandidateStatus
CREATE TYPE "CandidateStatus_new" AS ENUM ('PENDING', 'SCHEDULED', 'CALLED', 'NO_ANSWER');

ALTER TABLE "candidates"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CandidateStatus_new"
  USING (
    CASE
      WHEN "status"::text IN ('QUALIFIED', 'DISQUALIFIED') THEN 'CALLED'
      ELSE "status"::text
    END
  )::"CandidateStatus_new",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TYPE "CandidateStatus" RENAME TO "CandidateStatus_old";
ALTER TYPE "CandidateStatus_new" RENAME TO "CandidateStatus";
DROP TYPE "CandidateStatus_old";
