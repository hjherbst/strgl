import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { runSeed } from "../src/lib/seed";

runSeed()
  .then((result) => {
    console.log("Seed complete for tenant strgl", result);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
