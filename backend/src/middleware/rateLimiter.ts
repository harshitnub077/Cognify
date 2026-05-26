import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AuthRequest } from './auth';

// Simple in-memory rate limiter (no Redis dependency for local dev)
export const analyzeRateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    limit: 50,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID if authenticated, else IP (with proper IPv6 handling)
        const authReq = req as AuthRequest;
        if (authReq.user?.id) return authReq.user.id;
        return ipKeyGenerator(req.ip || 'unknown');
    },
    message: {
        success: false,
        error: 'Too many analysis requests from this user, please try again tomorrow.'
    }
});
