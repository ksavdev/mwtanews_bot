"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    TG_BOT_TOKEN: zod_1.z.string().min(1, { message: 'TG_BOT_TOKEN is required' }),
    DATABASE_URL: zod_1.z
        .string()
        .url({ message: 'DATABASE_URL must be a valid URL' })
        .min(1, { message: 'DATABASE_URL is required' }),
    LOG_LEVEL: zod_1.z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
        .default('info'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('production'),
});
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:\n' +
        parsed.error.errors
            .map((e) => `• ${e.path.join('.')}: ${e.message}`)
            .join('\n'));
    process.exit(1);
}
exports.config = parsed.data;
