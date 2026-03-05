-- Create workspaces table
CREATE TABLE "workspaces" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "bolnaApiKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspaces_clientId_key" ON "workspaces"("clientId");

-- Create default workspace for existing data
INSERT INTO "workspaces" ("id", "clientId", "updatedAt")
VALUES ('default-workspace', 'default', CURRENT_TIMESTAMP)
ON CONFLICT ("clientId") DO NOTHING;

-- Add workspace relation to agents
ALTER TABLE "agents" ADD COLUMN "workspaceId" TEXT;

UPDATE "agents"
SET "workspaceId" = (SELECT "id" FROM "workspaces" WHERE "clientId" = 'default' LIMIT 1)
WHERE "workspaceId" IS NULL;

ALTER TABLE "agents" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Replace global unique with workspace-scoped unique
DROP INDEX IF EXISTS "agents_bolnaAgentId_key";
CREATE UNIQUE INDEX "agents_workspaceId_bolnaAgentId_key" ON "agents"("workspaceId", "bolnaAgentId");
CREATE INDEX "agents_workspaceId_idx" ON "agents"("workspaceId");

ALTER TABLE "agents"
  ADD CONSTRAINT "agents_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
