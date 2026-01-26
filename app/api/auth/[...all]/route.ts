import { auth } from "@/lib/auth/server"; // import your auth instance
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
