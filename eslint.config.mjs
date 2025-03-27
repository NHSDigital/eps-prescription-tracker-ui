import globals from "globals";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslintJsPlugin from "@eslint/js";
import importNewlines from "eslint-plugin-import-newlines";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react"

const commonConfig = {
  plugins: {
    "@typescript-eslint": tsPlugin,
    "import-newlines": importNewlines,
    react: react
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    "@typescript-eslint/array-type": [
      "error",
      {
        default: "generic",
      },
    ],

    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "never",
      },
    ],

    "block-spacing": "error",
    "brace-style": ["error", "1tbs"],
    "comma-dangle": ["error", "never"],

    "comma-spacing": [
      "error",
      {
        before: false,
        after: true,
      },
    ],

    "dot-location": ["error", "property"],
    "eol-last": ["error", "always"],
    eqeqeq: "error",
    "func-call-spacing": "error",

    "func-style": [
      "error",
      "declaration",
      {
        allowArrowFunctions: true,
      },
    ],

    "import-newlines/enforce": [
      "error",
      {
        items: 3,
        "max-len": 120,
        semi: false,
      },
    ],

    indent: [
      "error",
      2,
      {
        SwitchCase: 1,
      },
    ],

    "max-len": ["error", 120],
    "no-multi-spaces": "error",

    "no-multiple-empty-lines": [
      "error",
      {
        max: 1,
      },
    ],

    "no-trailing-spaces": "error",
    "object-curly-spacing": ["error", "never"],

    quotes: [
      "error",
      "double",
      {
        allowTemplateLiterals: true,
        avoidEscape: true,
      },
    ],

    semi: ["error", "never"],
  },
};

export default [
  {
    ignores: ["**/lib/*", "**/coverage/*", "**/cdk.out/**", "**/dist/**"],
  },
  {
    rules: eslintJsPlugin.configs.recommended.rules,
  },
  {
    files: ["**/*.ts"],

    languageOptions: {
      parser: typescriptParser,
      globals: {
        ...globals.node,
      },
    },
    ...commonConfig,
  },
  {
    files: ["**/*.js",],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    ...commonConfig,
  },
  {
    files: [ "**/*.{jsx,mjs,cjs,ts,tsx}" ],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
     },
     globals: {
        ...globals.browser,
      },
    },
    ...commonConfig,
  },
  {
    files: [ "**/__tests__/*.{jsx,mjs,cjs,ts,tsx}" ],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
     },
     globals: {
        ...globals.browser,
        ...globals.jest
      },
    },
    ...commonConfig,
  },
  {
    files: ["**/tests/**/*.ts"],

    languageOptions: {
      parser: typescriptParser,
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    ...commonConfig,
  },
];
