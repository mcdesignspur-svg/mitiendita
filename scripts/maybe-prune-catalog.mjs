import { execSync } from "node:child_process";

/** Poda one-shot del catálogo en build de Vercel (`RUN_CATALOG_PRUNE=true`). */
if (process.env.RUN_CATALOG_PRUNE === "true") {
  console.log("[prebuild] RUN_CATALOG_PRUNE=true → podando catálogo (solo Thumbcamera)…");
  execSync("npm run catalog:keep-thumbcamera", { stdio: "inherit" });
}
