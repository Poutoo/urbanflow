-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('light', 'dark', 'system');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "themeMode" "ThemeMode" NOT NULL DEFAULT 'system',
ADD COLUMN     "voiceGuidanceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill themeMode from the legacy boolean before dropping it (true -> dark, false -> light)
UPDATE "user_profiles" SET "themeMode" = CASE WHEN "darkModeEnabled" THEN 'dark' ELSE 'light' END::"ThemeMode";

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "darkModeEnabled";
