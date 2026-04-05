import meteorPlugin from "eslint-plugin-meteor";
import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      meteor: meteorPlugin,
    },
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.meteor, // Ajoute les globales Meteor (Meteor, Tracker, etc.)
      },
    },
    rules: {
      ...meteorPlugin.configs.recommended.rules,
      "no-console": "off", // Optionnel : autorise les console.log
    },
  },
];