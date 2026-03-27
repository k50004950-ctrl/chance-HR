declare module 'rate-limit-redis' {
  export class RedisStore {
    constructor(options: {
      sendCommand: (...args: string[]) => Promise<any>;
      prefix?: string;
    });
  }
}
