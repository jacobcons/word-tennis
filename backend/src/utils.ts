import { pino } from 'pino';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ZodType } from 'zod';

export const logger = pino({
  level: process.env.NODE_ENV === 'dev' ? 'trace' : 'info',
  transport:
    process.env.NODE_ENV === 'dev'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

export const redis = new Redis(`${process.env.REDIS_URL}`);

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chatCompletion(content: string, responseFormat: ZodType) {
  const openai = new OpenAI();

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a bot that judges a game where users type words back and forth between each other. The current word must be related to the previous one.',
      },
      {
        role: 'user',
        content,
      },
    ],
    response_format: zodResponseFormat(responseFormat, 'question'),
  });

  return completion.choices[0].message.parsed;
}
