const attempts = new Map<string, { count: number; resetAt: number }>();
export function allowLogin(key: string) { const now = Date.now(); const current = attempts.get(key); if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 }); return true; } if (current.count >= 10) return false; current.count++; return true; }
const aiRequests = new Map<string, { count: number; resetAt: number }>();
export function allowAI(key: string) { const now = Date.now(); const current = aiRequests.get(key); if (!current || current.resetAt <= now) { aiRequests.set(key, { count: 1, resetAt: now + 15 * 60_000 }); return true; } if (current.count >= 30) return false; current.count++; return true; }
