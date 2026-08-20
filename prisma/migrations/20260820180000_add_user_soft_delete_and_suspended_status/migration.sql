-- Add the SUSPENDED status the three sibling repos already have.
-- Postgres cannot use a new enum value in the same transaction that adds it,
-- which is fine here: nothing below writes it.
ALTER TYPE "UserStatus" ADD VALUE 'SUSPENDED';

-- Soft delete on User, matching the three sibling repos.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- A soft-deleted user's email must become reusable, so the unique constraint
-- has to go: every read filters deletedAt, and uniqueness among live users is
-- enforced in the service layer. This is what both sibling repos do.
DROP INDEX IF EXISTS "User_email_key";

CREATE INDEX "idx_user_email" ON "User"("email");
CREATE INDEX "idx_user_deleted_at" ON "User"("deletedAt");
