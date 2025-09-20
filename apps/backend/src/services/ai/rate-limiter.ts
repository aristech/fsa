export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 50, windowMs = 60000) { // 50 requests per minute by default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true; // Request allowed
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(key: string): number {
    const userRequests = this.requests.get(key) || [];
    if (userRequests.length === 0) return 0;

    const oldestRequest = Math.min(...userRequests);
    return oldestRequest + this.windowMs;
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter instance
export const aiRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

// Cleanup old entries every 5 minutes
setInterval(() => {
  aiRateLimiter.cleanup();
}, 5 * 60 * 1000);