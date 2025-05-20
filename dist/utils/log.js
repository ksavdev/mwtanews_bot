"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.debug = debug;
const LEVEL = process.env.LOG_LEVEL ?? "info"; // "info" | "debug"
function info(...args) {
    console.log("[INFO]", ...args);
}
function debug(...args) {
    if (LEVEL === "debug")
        console.log("[DEBUG]", ...args);
}
