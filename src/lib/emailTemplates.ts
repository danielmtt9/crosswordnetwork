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

  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
  }

  getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  private registerDefaultTemplates(): void {
    // Email verification template
    this.registerTemplate({
      name: 'verify-email',
      renderHtml: async (data) => {
        const { verificationUrl, userName, expiresIn } = data;
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Verify Your Email - Crossword Network</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Welcome to Crossword Network, ${userName}!</h1>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
            <p>This link will expire in ${expiresIn}.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </body>
          </html>
        `;
      },
      renderText: async (data) => {
        const { verificationUrl, userName, expiresIn } = data;
        return `
Welcome to Crossword Network, ${userName}!

Please verify your email address by visiting the following link:
${verificationUrl}

This link will expire in ${expiresIn}.

If you didn't create an account, please ignore this email.

Best regards,
The Crossword Network Team
        `;
      },
    });

    // Password reset template
    this.registerTemplate({
      name: 'reset-password',
      renderHtml: async (data) => {
        const { resetUrl, userName, expiresIn } = data;
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Reset Your Password - Crossword Network</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Password Reset Request</h1>
            <p>Hello ${userName},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            <p>This link will expire in ${expiresIn}.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </body>
          </html>
        `;
      },
      renderText: async (data) => {
        const { resetUrl, userName, expiresIn } = data;
        return `
Password Reset Request

Hello ${userName},

You requested to reset your password. Visit the following link to create a new password:
${resetUrl}

This link will expire in ${expiresIn}.

If you didn't request this, please ignore this email.

Best regards,
The Crossword Network Team
        `;
      },
    });

    // Welcome email template
    this.registerTemplate({
      name: 'welcome',
      renderHtml: async (data) => {
        const { userName } = data;
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to Crossword Network</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Welcome to Crossword Network, ${userName}!</h1>
            <p>Thank you for joining our community of crossword enthusiasts.</p>
            <p>Start solving puzzles and collaborating with friends today!</p>
            <a href="https://crossword.network" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Playing</a>
          </body>
          </html>
        `;
      },
      renderText: async (data) => {
        const { userName } = data;
        return `
Welcome to Crossword Network, ${userName}!

Thank you for joining our community of crossword enthusiasts.

Start solving puzzles and collaborating with friends today!
Visit: https://crossword.network

Best regards,
The Crossword Network Team
        `;
      },
    });
  }
}

export const emailTemplateManager = new EmailTemplateManager();