/**
 * Seeds demo tutors and demo accounts — sample content, not reference data.
 *
 * Gated on SEED_DEMO_DATA so this can sit in the build command permanently and
 * do nothing. To populate a deployment once: set SEED_DEMO_DATA=true in the
 * host's environment variables, redeploy, then remove the variable. Leaving it
 * set means every future deploy resurrects accounts you may have deliberately
 * deleted, and resets any edits made to the demo tutors.
 *
 * Every seeded account shares one password (DEMO_PASSWORD, default
 * "password123"). Do not enable this on a deployment the public can reach
 * without also setting DEMO_PASSWORD to something private.
 */
import { PrismaClient } from "@prisma/client";

import { DEMO_PASSWORD, seedDemo } from "./seed-data";

if (process.env.SEED_DEMO_DATA !== "true") {
  console.log("Demo data skipped. Set SEED_DEMO_DATA=true to seed it.");
  process.exit(0);
}

if (DEMO_PASSWORD === "password123") {
  console.warn(
    "Warning: seeding demo accounts with the default password. Set DEMO_PASSWORD if this deployment is reachable by anyone else.",
  );
}

const prisma = new PrismaClient();

seedDemo(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
