import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // La demo gira su una data congelata: new Date() la romperebbe in silenzio.
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Usare now() da @basf/core: la demo gira su DEMO_FREEZE_DATE.",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.integration.test.ts", "packages/core/src/time.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  prettier,
);
