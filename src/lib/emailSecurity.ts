import crypto from 'crypto';
import { prisma } from './prisma';

export interface SecurityCheck {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  retryAfter?: number;
}

export class EmailSecurity {
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly MAX_EMAILS_PER_HOUR = 5;
  private readonly MAX_EMAILS_PER_DAY = 20;

  /**
   * Validate email request for security issues
   */
  async validateEmailRequest(options: {
    to: string | string[];
    subject: string;
    template: any;
  }): Promise<SecurityCheck> {
    try {
      // Check for suspicious patterns
      if (this.containsSuspiciousContent(options.subject)) {
        return {
          allowed: false,
          reason: 'Suspicious content detected in subject'
        };
      }

      // Validate email addresses
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      for (const email of recipients) {
        if (!this.isValidEmail(email)) {
          return {
            allowed: false,
            reason: 'Invalid email address format'
          };
        }

        if (this.isBlockedEmail(email)) {
          return {
            allowed: false,
            reason: 'Email address is blocked'
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Email security validation error:', error);
      return {
        allowed: false,
        reason: 'Security validation failed'
      };
    }
  }

  /**
   * Check rate limits for email sending
   */
  async checkRateLimit(recipient: string | string[]): Promise<RateLimitCheck> {
    try {
      const recipients = Array.isArray(recipient) ? recipient : [recipient];
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - this.RATE_LIMIT_WINDOW);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const email of recipients) {
        // Check hourly rate limit
        const hourlyCount = await prisma.emailLog.count({
          where: {
            recipient: email,
            sentAt: {
              gte: oneHourAgo
            }
          }
        });

        if (hourlyCount >= this.MAX_EMAILS_PER_HOUR) {
          const retryAfter = Math.ceil((oneHourAgo.getTime() + this.RATE_LIMIT_WINDOW - now.getTime()) / 1000);
          return {
            allowed: false,
            retryAfter
          };
        }

        // Check daily rate limit
        const dailyCount = await prisma.emailLog.count({
          where: {
            recipient: email,
            sentAt: {
              gte: oneDayAgo
            }
          }
        });

        if (dailyCount >= this.MAX_EMAILS_PER_DAY) {
          const retryAfter = Math.ceil((oneDayAgo.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000);
          return {
            allowed: false,
            retryAfter
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Allow on error to prevent blocking legitimate emails
    }
  }

  /**
   * Generate secure token for email verification
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure token with expiration
   */
  generateTokenWithExpiration(expiresInHours: number = 24): {
    token: string;
    expiresAt: Date;
  } {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    return { token, expiresAt };
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify token against hash
   */
  verifyToken(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  }

  /**
   * Sanitize email content to prevent XSS
   */
  sanitizeContent(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^>]*>/gi, '')
      .replace(/<object\b[^>]*>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '');
  }

  /**
   * Check if email contains suspicious content
   */
  private containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Check if email is in blocked list
   */
  private isBlockedEmail(email: string): boolean {
    const blockedDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return blockedDomains.includes(domain || '');
  }

  /**
   * Log email security event
   */
  async logSecurityEvent(event: {
    type: 'rate_limit' | 'suspicious_content' | 'blocked_email' | 'invalid_email';
    recipient: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      await prisma.emailSecurityLog.create({
        data: {
          eventType: event.type,
          recipient: event.recipient,
          details: event.details,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number;
    rateLimitHits: number;
    suspiciousContent: number;
    blockedEmails: number;
    invalidEmails: number;
  }> {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalEvents, rateLimitHits, suspiciousContent, blockedEmails, invalidEmails] = await Promise.all([
      prisma.emailSecurityLog.count({ where: { timestamp: { gte: since } } }),
      prisma.emailSecurityLog.count({ where: { eventType: 'rate_limit', timestamp: { gte: since } } }),
      prisma.emailSecurityLog.count({ where: { eventType: 'suspicious_content', timestamp: { gte: since } } }),
      prisma.emailSecurityLog.count({ where: { eventType: 'blocked_email', timestamp: { gte: since } } }),
      prisma.emailSecurityLog.count({ where: { eventType: 'invalid_email', timestamp: { gte: since } } })
    ]);

    return {
      totalEvents,
      rateLimitHits,
      suspiciousContent,
      blockedEmails,
      invalidEmails
    };
  }
}
