import { svelte } from "eslint-config-avi12/svelte";

export default svelte({ ignores: [".claude/", ".output/", ".wxt/", "build/", "user-profiles/", "keys/"] });
