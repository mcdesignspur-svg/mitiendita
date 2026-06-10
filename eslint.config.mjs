// ESLint flat config (ESLint 9 + Next 16). eslint-config-next@16 ya exporta
// config flat nativo, así que se importa directo — NO usar FlatCompat (rompe
// con un error de estructura circular al traducir el plugin de React).
import next from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      ".data/**",
      "._*",
    ],
  },
  ...next,
];

export default config;
