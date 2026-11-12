-- CreateIndex
CREATE INDEX "idx_role_permission_permission_id" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "idx_user_role_role_id" ON "UserRole"("roleId");

-- Live emails are unique at the database level. Partial, so a soft-deleted
-- user's address stays reusable; the service's findByMail check still runs
-- first and answers a duplicate with a field-mapped 422. Prisma cannot model a
-- partial index, so it exists only here (named in schema.prisma).
CREATE UNIQUE INDEX "uq_user_email_live" ON "User"("email") WHERE "deletedAt" IS NULL;
