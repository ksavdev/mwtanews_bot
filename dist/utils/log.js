const LEVEL = process.env.LOG_LEVEL ?? "info"; // "info" | "debug"
export function info(...args) {
    console.log("[INFO]", ...args);
}
export function debug(...args) {
    if (LEVEL === "debug")
        console.log("[DEBUG]", ...args);
}
