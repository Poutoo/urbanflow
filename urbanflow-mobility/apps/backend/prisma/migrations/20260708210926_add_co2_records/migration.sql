-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "ecoMobileBadge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalCo2SavedKg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "co2_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "co2SavedKg" DOUBLE PRECISION NOT NULL,
    "co2EmittedKg" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "primaryMode" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "co2_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "co2_records_userId_date_idx" ON "co2_records"("userId", "date");

-- AddForeignKey
ALTER TABLE "co2_records" ADD CONSTRAINT "co2_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
