/**
 * Seeds everything — reference data and demo content — for local development.
 *
 * Deployments do not use this entry point: they run seed-reference.ts on every
 * build, and seed-demo.ts only when SEED_DEMO_DATA is set.
 */
import { PrismaClient } from "@prisma/client";

import { DEMO_PASSWORD, seedDemo, seedReference } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  await seedReference(prisma);
  await seedDemo(prisma);
  console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
