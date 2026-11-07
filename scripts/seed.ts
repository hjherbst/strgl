import "dotenv/config";
import { runSeed } from "../src/lib/seed";

runSeed()
  .then(() => {
    console.log("Seed complete for tenant strgl");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
