ALTER TABLE "call_analytics"
ADD COLUMN IF NOT EXISTS "rawAnalysisPayload" JSONB;
