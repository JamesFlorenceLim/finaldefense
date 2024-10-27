/*
  Warnings:

  - You are about to drop the column `driver_id` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `operator_id` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `van_id` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_address` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_name` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_address` on the `Operator` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_name` on the `Operator` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Operator` table. All the data in the column will be lost.
  - You are about to drop the column `role_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `terminal_id` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mv_file_no]` on the table `Van` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[plate_number]` on the table `Van` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[engine_no]` on the table `Van` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chassis_no]` on the table `Van` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schedule_id` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `van_driver_operator_id` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birth_date` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_brgy` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_city` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_firstname` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_lastname` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_middlename` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_region` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_street` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birth_date` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_brgy` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_city` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_firstname` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_lastname` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_middlename` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_region` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergency_street` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleType` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('admin', 'terminal1', 'terminal2');

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_driver_id_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_operator_id_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_van_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_role_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_terminal_id_fkey";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "driver_id",
DROP COLUMN "operator_id",
DROP COLUMN "van_id",
ADD COLUMN     "schedule_id" INTEGER NOT NULL,
ADD COLUMN     "temporary_driver_id" INTEGER,
ADD COLUMN     "van_driver_operator_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Driver" DROP COLUMN "emergency_address",
DROP COLUMN "emergency_name",
DROP COLUMN "type",
ADD COLUMN     "birth_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "emergency_brgy" TEXT NOT NULL,
ADD COLUMN     "emergency_city" TEXT NOT NULL,
ADD COLUMN     "emergency_firstname" TEXT NOT NULL,
ADD COLUMN     "emergency_lastname" TEXT NOT NULL,
ADD COLUMN     "emergency_middlename" TEXT NOT NULL,
ADD COLUMN     "emergency_region" TEXT NOT NULL,
ADD COLUMN     "emergency_street" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Operator" DROP COLUMN "emergency_address",
DROP COLUMN "emergency_name",
DROP COLUMN "type",
ADD COLUMN     "birth_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "emergency_brgy" TEXT NOT NULL,
ADD COLUMN     "emergency_city" TEXT NOT NULL,
ADD COLUMN     "emergency_firstname" TEXT NOT NULL,
ADD COLUMN     "emergency_lastname" TEXT NOT NULL,
ADD COLUMN     "emergency_middlename" TEXT NOT NULL,
ADD COLUMN     "emergency_region" TEXT NOT NULL,
ADD COLUMN     "emergency_street" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role_id",
DROP COLUMN "terminal_id",
ADD COLUMN     "roleType" "RoleType" NOT NULL;

-- CreateTable
CREATE TABLE "VanDriverOperator" (
    "id" SERIAL NOT NULL,
    "van_id" INTEGER NOT NULL,
    "driver_id" INTEGER,
    "operator_id" INTEGER NOT NULL,

    CONSTRAINT "VanDriverOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminal" "TerminalType" NOT NULL,

    CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VanDriverOperator_driver_id_key" ON "VanDriverOperator"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_date_key" ON "Schedule"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Van_mv_file_no_key" ON "Van"("mv_file_no");

-- CreateIndex
CREATE UNIQUE INDEX "Van_plate_number_key" ON "Van"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "Van_engine_no_key" ON "Van"("engine_no");

-- CreateIndex
CREATE UNIQUE INDEX "Van_chassis_no_key" ON "Van"("chassis_no");

-- AddForeignKey
ALTER TABLE "VanDriverOperator" ADD CONSTRAINT "VanDriverOperator_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanDriverOperator" ADD CONSTRAINT "VanDriverOperator_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VanDriverOperator" ADD CONSTRAINT "VanDriverOperator_van_id_fkey" FOREIGN KEY ("van_id") REFERENCES "Van"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_van_driver_operator_id_fkey" FOREIGN KEY ("van_driver_operator_id") REFERENCES "VanDriverOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_temporary_driver_id_fkey" FOREIGN KEY ("temporary_driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
