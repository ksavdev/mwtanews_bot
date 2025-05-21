export const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
export const info = (...a: unknown[]) => console.log("[INFO]", ...a);
export const debug = (...a: unknown[]) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);