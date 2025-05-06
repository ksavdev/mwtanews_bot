const LEVEL = process.env.LOG_LEVEL ?? "info";   // "info" | "debug"

export function info(...args: unknown[]) {
  console.log("[INFO]", ...args);
}

export function debug(...args: unknown[]) {
  if (LEVEL === "debug") console.log("[DEBUG]", ...args);
}
