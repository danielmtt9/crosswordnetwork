import { Resend } from 'resend';
import { EmailTemplate, emailTemplateManager } from './emailTemplates';
import { EmailAnalytics } from './emailAnalytics';
import { EmailSecurity } from './emailSecurity';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);
const DEFAULT_FROM_ADDRESS =
  process.env.EMAIL_FROM?.trim() || 'Crossword Network <noreply@crossword.network>';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  tags?: Record<string, string>;
  from?: string;
  /**
   * Optional key used for rate limiting. Useful when many user messages go to a shared inbox
   * (e.g. Contact Us -> support@...), where limiting by recipient would block all users.
   */
  rateLimitKey?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAfter?: number;
}

export class EmailService {
  private analytics: EmailAnalytics;
  private security: EmailSecurity;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second base delay

  constructor() {
    this.analytics = new EmailAnalytics();
    this.security = new EmailSecurity();
  }

  /**
   * Send email with retry logic and error handling
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Security checks
      const securityCheck = await this.security.validateEmailRequest(options);
      if (!securityCheck.allowed) {
        return {
          success: false,
          error: securityCheck.reason,
          retryAfter: securityCheck.retryAfter
        };
      }

      // Rate limiting check
      const rateLimitCheck = await this.security.checkRateLimit(options.rateLimitKey || options.to);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitCheck.retryAfter
        };
      }

      // Generate email content from template
      const emailContent = await this.generateEmailContent(options);

      // Send email with retry logic
      const fromAddress = options.from?.trim() || DEFAULT_FROM_ADDRESS;

      const result = await this.sendWithRetry({
        to: options.to,
        subject: options.subject,
        from: fromAddress,
        html: emailContent.html,
        text: emailContent.text,
        tags: options.tags || {}
      });

      if (result.success) {
        // Track successful delivery
        await this.analytics.trackDelivery({
          messageId: result.messageId!,
          to: options.to,
          subject: options.subject,
          template: options.template.name,
          timestamp: new Date()
        });
      }

      return result;
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send email with exponential backoff retry
   */
  private async sendWithRetry(emailData: {
    to: string | string[];
    from: string;
    subject: string;
    html: string;
    text: string;
    tags?: Record<string, string>;
  }): Promise<EmailResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await resend.emails.send(emailData);
        
        if (response.error) {
          throw new Error(response.error.message);
        }

        return {
          success: true,
          messageId: response.data?.id
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to send email after retries'
    };
  }

  /**
   * Generate email content from template
   */
  private async generateEmailContent(options: EmailOptions): Promise<{ html: string; text: string }> {
    const template = options.template;
    const data = options.data || {};

    // Render template with data
    const html = await template.renderHtml(data);
    const text = await template.renderText(data);

    return { html, text };
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableErrors = [
      'Invalid email address',
      'Email address not found',
      'Invalid API key',
      'Forbidden'
    ];

    return nonRetryableErrors.some(msg => 
      error.message?.includes(msg)
    );
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, verificationUrl: string, userName: string): Promise<boolean> {
    try {
      const template = emailTemplateManager.getTemplate('verify-email');
      if (!template) {
        throw new Error('Verification email template not found');
      }

      const result = await this.sendEmail({
        to: email,
        subject: 'Verify your email address - Crossword Network',
        template,
        data: {
          verificationUrl,
          userName,
          expiresIn: '24 hours'
        },
        priority: 'high',
        tags: {
          type: 'verification'
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetUrl: string, userName: string): Promise<boolean> {
    try {
      const template = emailTemplateManager.getTemplate('reset-password');
      if (!template) {
        throw new Error('Password reset template not found');
      }

      const result = await this.sendEmail({
        to: email,
        subject: 'Reset your password - Crossword Network',
        template,
        data: {
          resetUrl,
          userName,
          expiresIn: '1 hour'
        },
        priority: 'high',
        tags: {
          type: 'password-reset'
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Get email service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      // Test API connectivity
      const testResponse = await resend.emails.send({
        to: 'test@example.com',
        from: DEFAULT_FROM_ADDRESS,
        subject: 'Health Check',
        html: '<p>Health check</p>',
        text: 'Health check'
      });

      return {
        status: testResponse.error ? 'degraded' : 'healthy',
        details: {
          apiConnected: !testResponse.error,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get email delivery statistics
   */
  async getDeliveryStats(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
  }> {
    return await this.analytics.getDeliveryStats(timeframe);
  }
}

// Export singleton instance
export const emailService = new EmailService();

export async function sendPasswordResetEmail(email: string, resetUrl: string, userName: string): Promise<boolean> {
  try {
    return await emailService.sendPasswordResetEmail(email, resetUrl, userName);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, verificationUrl: string, userName: string): Promise<boolean> {
  try {
    return await emailService.sendVerificationEmail(email, verificationUrl, userName);
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
