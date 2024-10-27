declare global {
  namespace Express {
    interface Request {
      player: {
        id: number;
      };
    }
  }
}

declare module 'wink-lemmatizer' {
  export function noun(word: string): string;
  export function verb(word: string): string;
  export function adjective(word: string): string;
}

declare module 'ioredis' {
  interface RedisCommander {
    checkAndPopPlayers(): Promise<string[]>;
  }
}
