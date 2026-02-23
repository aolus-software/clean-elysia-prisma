/*
  Warnings:

  - Added the required column `group` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "group" VARCHAR(255) NOT NULL;
