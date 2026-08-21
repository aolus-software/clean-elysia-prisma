-- Single-use token enforcement moves from "delete the row" to "stamp usedAt",
-- and both token tables gain the unique index they never had.
--
-- Hand-written: `prisma migrate dev` needs a live connection and there is no
-- database in this environment. Reviewed against prisma/schema.prisma.
--
-- No backfill is needed and none is wanted: under the old scheme a consumed or
-- superseded token was DELETEd, so every row that survives to this migration is
-- genuinely unconsumed and NULL is the correct value for it.

ALTER TABLE "UserEmailVerification" ADD COLUMN "usedAt" TIMESTAMP(3);
ALTER TABLE "PasswordReset" ADD COLUMN "usedAt" TIMESTAMP(3);

-- These two statements are the ones that can fail: each aborts if its table
-- already holds two rows with the same token. Neither table had any index on
-- `token` at all before now, so nothing has been enforcing this. Tokens are 100
-- characters from StrToolkit.random, so a collision is not realistically
-- reachable — but if a statement does fail, dedupe the table and retry rather
-- than dropping the constraint.
CREATE UNIQUE INDEX "UserEmailVerification_token_key" ON "UserEmailVerification"("token");
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

CREATE INDEX "idx_user_email_verification_user_used" ON "UserEmailVerification"("userId", "usedAt");
CREATE INDEX "idx_password_reset_user_used" ON "PasswordReset"("userId", "usedAt");
