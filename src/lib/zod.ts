import { z } from "zod";

// YouTube's Trusted-Types CSP blocks the `new Function` probe zod runs on its first object-schema build
z.config({ jitless: true });

export { z };
