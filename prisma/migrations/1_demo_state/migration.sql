-- CreateTable
CREATE TABLE "DemoState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "activeUntil" TIMESTAMP(3),
    "lastTickAt" TIMESTAMP(3),

    CONSTRAINT "DemoState_pkey" PRIMARY KEY ("id")
);

