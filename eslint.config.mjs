import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["test/fixtures/**/*.js"]), {
    extends: compat.extends("eslint:recommended"),

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.jest,
            ...globals.jasmine,
            ...globals.node,
            Test262Error: true,
            gc: true,
            $SOURCE: true,
            fixture: true,
            sandbox: true,
            sinon: true,
        },

        ecmaVersion: 2021,
        sourceType: "module",
    },

    rules: {
        "no-console": [0],
        "no-empty-pattern": [0],
    },
}]);