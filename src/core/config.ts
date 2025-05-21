import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
    TG_BOT_TOKEN: z.string().min(1, { message: 'TG_BOT_TOKEN is required' }),
    DATABASE_URL: z
        .string()
        .url({ message: 'DATABASE_URL must be a valid URL' })
        .min(1, { message: 'DATABASE_URL is required' }),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
        .default('info'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error(
        '❌ Invalid environment variables:\n' +
            parsed.error.errors
                .map((e) => `• ${e.path.join('.')}: ${e.message}`)
                .join('\n')
    );
    process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;