import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface EmailTemplate {
  name: string;
  renderHtml: (data: Record<string, any>) => Promise<string>;
  renderText: (data: Record<string, any>) => Promise<string>;
}

export class EmailTemplateManager {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register a new email template
   */
  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * List all available templates
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Register default email templates
   */
  private registerDefaultTemplates(): void {
    // Email verification template
    this.registerTemplate({
      name: 'verify-email',
      renderHtml: async (data) => {
        const { verificationUrl, userName, expiresIn } = data;
        return renderToStaticMarkup(
          <EmailVerificationTemplate 
            verificationUrl={verificationUrl}
            userName={userName}
            expiresIn={expiresIn}
          />
        );
      },
      renderText: async (data) => {
        const { verificationUrl, userName, expiresIn } = data;
        return `
Welcome to Crossword Network, ${userName}!

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in ${expiresIn} hours.

If you didn't create an account, please ignore this email.

Best regards,
The Crossword Network Team
        `.trim();
      }
    });

    // Password reset template
    this.registerTemplate({
      name: 'reset-password',
      renderHtml: async (data) => {
        const { resetUrl, userName, expiresIn } = data;
        return renderToStaticMarkup(
          <PasswordResetTemplate 
            resetUrl={resetUrl}
            userName={userName}
            expiresIn={expiresIn}
          />
        );
      },
      renderText: async (data) => {
        const { resetUrl, userName, expiresIn } = data;
        return `
Password Reset Request

Hello ${userName},

You requested to reset your password. Click the link below to reset it:
${resetUrl}

This link will expire in ${expiresIn} hours.

If you didn't request this, please ignore this email.

Best regards,
The Crossword Network Team
        `.trim();
      }
    });

    // Welcome email template
    this.registerTemplate({
      name: 'welcome',
      renderHtml: async (data) => {
        const { userName, dashboardUrl } = data;
        return renderToStaticMarkup(
          <WelcomeTemplate 
            userName={userName}
            dashboardUrl={dashboardUrl}
          />
        );
      },
      renderText: async (data) => {
        const { userName, dashboardUrl } = data;
        return `
Welcome to Crossword Network, ${userName}!

Your account has been successfully created. You can now:
- Create and join multiplayer rooms
- Solve puzzles with friends
- Track your achievements
- Compete on leaderboards

Get started: ${dashboardUrl}

Best regards,
The Crossword Network Team
        `.trim();
      }
    });

    // Trial reminder template
    this.registerTemplate({
      name: 'trial-reminder',
      renderHtml: async (data) => {
        const { userName, daysLeft, upgradeUrl } = data;
        return renderToStaticMarkup(
          <TrialReminderTemplate 
            userName={userName}
            daysLeft={daysLeft}
            upgradeUrl={upgradeUrl}
          />
        );
      },
      renderText: async (data) => {
        const { userName, daysLeft, upgradeUrl } = data;
        return `
Trial Reminder

Hello ${userName},

Your free trial will expire in ${daysLeft} days.

Upgrade to premium to continue enjoying:
- Unlimited multiplayer rooms
- Advanced puzzle features
- Priority support

Upgrade now: ${upgradeUrl}

Best regards,
The Crossword Network Team
        `.trim();
      }
    });
  }
}

// Email template components
interface EmailVerificationTemplateProps {
  verificationUrl: string;
  userName: string;
  expiresIn: number;
}

function EmailVerificationTemplate({ verificationUrl, userName, expiresIn }: EmailVerificationTemplateProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '8px' }}>
          <h1 style={{ color: '#d97706', textAlign: 'center', marginBottom: '30px' }}>
            Welcome to Crossword Network!
          </h1>
          
          <p>Hello {userName},</p>
          
          <p>Thank you for signing up! Please verify your email address to complete your account setup.</p>
          
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a 
              href={verificationUrl}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '6px',
                display: 'inline-block',
                fontWeight: 'bold'
              }}
            >
              Verify Email Address
            </a>
          </div>
          
          <p style={{ fontSize: '14px', color: '#666' }}>
            This link will expire in {expiresIn} hours. If you didn't create an account, please ignore this email.
          </p>
          
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
          
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Best regards,<br />
            The Crossword Network Team
          </p>
        </div>
      </body>
    </html>
  );
}

interface PasswordResetTemplateProps {
  resetUrl: string;
  userName: string;
  expiresIn: number;
}

function PasswordResetTemplate({ resetUrl, userName, expiresIn }: PasswordResetTemplateProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '8px' }}>
          <h1 style={{ color: '#d97706', textAlign: 'center', marginBottom: '30px' }}>
            Password Reset Request
          </h1>
          
          <p>Hello {userName},</p>
          
          <p>You requested to reset your password. Click the button below to create a new password.</p>
          
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a 
              href={resetUrl}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '6px',
                display: 'inline-block',
                fontWeight: 'bold'
              }}
            >
              Reset Password
            </a>
          </div>
          
          <p style={{ fontSize: '14px', color: '#666' }}>
            This link will expire in {expiresIn} hours. If you didn't request this, please ignore this email.
          </p>
          
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
          
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Best regards,<br />
            The Crossword Network Team
          </p>
        </div>
      </body>
    </html>
  );
}

interface WelcomeTemplateProps {
  userName: string;
  dashboardUrl: string;
}

function WelcomeTemplate({ userName, dashboardUrl }: WelcomeTemplateProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Crossword Network!</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '8px' }}>
          <h1 style={{ color: '#d97706', textAlign: 'center', marginBottom: '30px' }}>
            🎉 Welcome to Crossword Network!
          </h1>
          
          <p>Hello {userName},</p>
          
          <p>Your account has been successfully created! You can now enjoy all the features of Crossword Network:</p>
          
          <ul style={{ margin: '20px 0', paddingLeft: '20px' }}>
            <li>Create and join multiplayer rooms</li>
            <li>Solve puzzles with friends in real-time</li>
            <li>Track your achievements and progress</li>
            <li>Compete on global leaderboards</li>
            <li>Unlock special rewards and badges</li>
          </ul>
          
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a 
              href={dashboardUrl}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '6px',
                display: 'inline-block',
                fontWeight: 'bold'
              }}
            >
              Get Started
            </a>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
          
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Best regards,<br />
            The Crossword Network Team
          </p>
        </div>
      </body>
    </html>
  );
}

interface TrialReminderTemplateProps {
  userName: string;
  daysLeft: number;
  upgradeUrl: string;
}

function TrialReminderTemplate({ userName, daysLeft, upgradeUrl }: TrialReminderTemplateProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Trial Reminder</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '8px' }}>
          <h1 style={{ color: '#d97706', textAlign: 'center', marginBottom: '30px' }}>
            ⏰ Trial Reminder
          </h1>
          
          <p>Hello {userName},</p>
          
          <p>Your free trial will expire in <strong>{daysLeft} days</strong>.</p>
          
          <p>Upgrade to premium to continue enjoying:</p>
          
          <ul style={{ margin: '20px 0', paddingLeft: '20px' }}>
            <li>Unlimited multiplayer rooms</li>
            <li>Advanced puzzle features</li>
            <li>Priority customer support</li>
            <li>Exclusive achievements and rewards</li>
            <li>Ad-free experience</li>
          </ul>
          
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a 
              href={upgradeUrl}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '6px',
                display: 'inline-block',
                fontWeight: 'bold'
              }}
            >
              Upgrade Now
            </a>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
          
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Best regards,<br />
            The Crossword Network Team
          </p>
        </div>
      </body>
    </html>
  );
}

// Export template manager instance
export const emailTemplateManager = new EmailTemplateManager();
