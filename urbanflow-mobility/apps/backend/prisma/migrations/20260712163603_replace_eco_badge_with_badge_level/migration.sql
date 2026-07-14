-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "badgeLevel" INTEGER NOT NULL DEFAULT 0;

-- Recalcule le palier à partir du CO2 cumulé existant (l'ancien booléen était
-- décerné à 10 kg, un seuil différent des 3 nouveaux paliers : 5 / 25 / 100 kg)
UPDATE "user_profiles"
SET "badgeLevel" = CASE
  WHEN "totalCo2SavedKg" >= 100 THEN 3
  WHEN "totalCo2SavedKg" >= 25 THEN 2
  WHEN "totalCo2SavedKg" >= 5 THEN 1
  ELSE 0
END;

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "ecoMobileBadge";
