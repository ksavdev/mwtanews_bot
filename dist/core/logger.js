"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("./config");
const isDev = config_1.config.NODE_ENV === 'development';
exports.log = (0, pino_1.default)({
    level: config_1.config.LOG_LEVEL,
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
            },
        },
    }),
});
