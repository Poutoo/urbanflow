-- CreateTable
CREATE TABLE "favorite_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_addresses_userId_idx" ON "favorite_addresses"("userId");

-- AddForeignKey
ALTER TABLE "favorite_addresses" ADD CONSTRAINT "favorite_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
