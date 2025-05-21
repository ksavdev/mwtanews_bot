"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = exports.info = exports.LOG_LEVEL = void 0;
exports.LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a) => console.log("[INFO]", ...a);
exports.info = info;
const debug = (...a) => exports.LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);
exports.debug = debug;
