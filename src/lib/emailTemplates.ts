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
            <p>Start solving puzzles today!</p>
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

Start solving puzzles today!
Visit: https://crossword.network

Best regards,
The Crossword Network Team
        `;
      },
    });

    // Waitlist confirmation template
    this.registerTemplate({
      name: 'waitlist-confirmation',
      renderHtml: async (data) => {
        const { email } = data;
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>You're on the Crossword.Network Waitlist</title>
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px; background: #fffbeb; color: #1f2937;">
            <div style="background: linear-gradient(135deg, #f97316, #fbbf24); padding: 32px; border-radius: 20px; color: #fff; text-align: center;">
              <h1 style="margin: 0 0 12px; font-size: 28px;">You're officially on the list!</h1>
              <p style="margin: 0; font-size: 16px;">Thanks for sharing ${email}. We'll keep you posted as we get closer to launch.</p>
            </div>
            <div style="background: #fff; margin-top: -24px; padding: 32px; border-radius: 20px; box-shadow: 0 20px 60px rgba(249, 115, 22, 0.15);">
              <h2 style="margin-top: 0; color: #b45309;">What's next?</h2>
              <ul style="padding-left: 20px; line-height: 1.6;">
                <li>You'll get early access updates in your inbox</li>
                <li>Exclusive invites to community crossword nights</li>
                <li>Early access to new puzzle drops</li>
              </ul>
              <p style="margin-top: 20px;">In the meantime, follow us on socials @crosswordnetwork for backstage updates.</p>
              <a href="https://crossword.network" style="display: inline-block; margin-top: 20px; padding: 14px 28px; border-radius: 999px; background: linear-gradient(135deg, #f97316, #f59e0b); color: #fff; text-decoration: none; font-weight: 600;">Visit Crossword.Network</a>
            </div>
            <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">Need help? Reply to this email or reach us at hello@crossword.network.</p>
          </body>
          </html>
        `;
      },
      renderText: async (data) => {
        const { email } = data;
        return `
You're on the Crossword.Network waitlist!

Thanks for sharing ${email}. We'll send updates, early invites, and launch news straight to your inbox.

Visit https://crossword.network to learn more or reply to this email if you have questions.

— The Crossword.Network team
        `;
      }
    });

    // Waitlist admin notification template
    this.registerTemplate({
      name: 'waitlist-notification',
      renderHtml: async (data) => {
        const { email, totalCount, timestamp } = data;
        const formattedDate = new Date(timestamp || Date.now()).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>New Waitlist Signup</title>
          </head>
          <body style="font-family: 'Inter', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px; background: #fff7ed; color: #1f2937;">
            <h1 style="margin-top: 0; color: #c2410c;">New Waitlist Signup</h1>
            <div style="background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 12px 30px rgba(194, 65, 12, 0.15);">
              <p style="margin: 0 0 12px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 12px;"><strong>Joined:</strong> ${formattedDate}</p>
              <p style="margin: 0 0 12px;"><strong>Total entries:</strong> ${totalCount}</p>
            </div>
            <p style="margin-top: 24px; font-size: 14px;">Reply directly to reach this user if needed.</p>
          </body>
          </html>
        `;
      },
      renderText: async (data) => {
        const { email, totalCount, timestamp } = data;
        const formattedDate = new Date(timestamp || Date.now()).toLocaleString();
        return `
New waitlist signup

Email: ${email}
Joined: ${formattedDate}
Total entries: ${totalCount}
        `;
      }
    });

    // Contact form template (support inbox)
    this.registerTemplate({
      name: 'contact-us',
      renderHtml: async (data) => {
        const { fromEmail, subject, message, ip, userAgent, pageUrl, createdAt } = data;
        const esc = (v: any) => {
          const s = typeof v === 'string' ? v : '';
          return s
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
        };
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Contact Us - Crossword.Network</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
            <h1 style="margin: 0 0 8px;">New Contact Us Message</h1>
            <p style="margin: 0 0 16px; color: #555;">Sent from crossword.network contact form.</p>
            <div style="border: 1px solid #eee; border-radius: 10px; padding: 16px; background: #fafafa;">
              <p style="margin: 0 0 8px;"><strong>From:</strong> ${esc(fromEmail)}</p>
              <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${esc(subject)}</p>
              <p style="margin: 0 0 8px;"><strong>When:</strong> ${esc(createdAt)}</p>
              <p style="margin: 0 0 8px;"><strong>Page:</strong> ${esc(pageUrl)}</p>
              <p style="margin: 0 0 8px;"><strong>IP:</strong> ${esc(ip)}</p>
              <p style="margin: 0;"><strong>User-Agent:</strong> ${esc(userAgent)}</p>
            </div>
            <h2 style="margin: 18px 0 8px;">Message</h2>
            <div style="white-space: pre-wrap; border: 1px solid #eee; border-radius: 10px; padding: 16px;">
${esc(message)}
            </div>
          </body>
          </html>
        `;
      },
      renderText: async (data) => {
        const { fromEmail, subject, message, ip, userAgent, pageUrl, createdAt } = data;
        return `
New Contact Us Message (crossword.network)

From: ${fromEmail}
Subject: ${subject}
When: ${createdAt}
Page: ${pageUrl}
IP: ${ip}
User-Agent: ${userAgent}

Message:
${message}
        `;
      },
    });
  }
}

export const emailTemplateManager = new EmailTemplateManager();
