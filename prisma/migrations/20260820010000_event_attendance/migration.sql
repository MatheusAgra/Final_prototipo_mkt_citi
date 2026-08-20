-- CreateEnum
CREATE TYPE "StatusPresencaEvento" AS ENUM ('PRESENTE', 'AUSENTE', 'ATRASADO');

-- AlterTable
ALTER TABLE "CalendarEventAttendee"
ADD COLUMN "statusPresenca" "StatusPresencaEvento",
ADD COLUMN "presencaRegistradaEm" TIMESTAMP(3);
