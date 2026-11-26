import { svelte } from "lint-config/eslint/svelte";

export default svelte({ ignores: [".claude/", ".output/", ".wxt/", "build/", "user-profiles/", "keys/"] });
