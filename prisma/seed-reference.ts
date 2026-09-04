/**
 * Seeds reference data only — the subject and level lists.
 *
 * Safe and correct to run on every deployment: it is idempotent, and without
 * it the search filters render empty. This is what the Vercel build calls.
 */
import { PrismaClient } from "@prisma/client";

import { seedReference } from "./seed-data";

const prisma = new PrismaClient();

seedReference(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
