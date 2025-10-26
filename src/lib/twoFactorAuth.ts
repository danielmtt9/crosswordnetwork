import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from './prisma';

// Configure authenticator
authenticator.options = {
  window: 2, // Allow 2 time steps (60 seconds) of tolerance
  step: 30   // 30 second time step
};

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  backupCodeUsed?: boolean;
}

export class TwoFactorAuthManager {
  /**
   * Generate a new 2FA secret for a user
   */
  static generateSecret(userId: string): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate QR code URL for 2FA setup
   */
  static generateQRCodeUrl(userId: string, secret: string, userEmail: string): string {
    const serviceName = 'Crossword Network Admin';
    const accountName = userEmail;
    
    return authenticator.keyuri(accountName, serviceName, secret);
  }

  /**
   * Generate QR code as data URL
   */
  static async generateQRCodeDataUrl(qrCodeUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrCodeUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Setup 2FA for a user
   */
  static async setupTwoFactor(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    const secret = this.generateSecret(userId);
    const qrCodeUrl = this.generateQRCodeUrl(userId, secret, userEmail);
    const backupCodes = this.generateBackupCodes();

    // Store the secret and backup codes in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
        twoFactorEnabled: false // Will be enabled after verification
      }
    });

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify 2FA token during setup
   */
  static async verifyTwoFactorSetup(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true }
    });

    if (!user?.twoFactorSecret) {
      throw new Error('2FA not set up for user');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret
    });

    if (isValid) {
      // Enable 2FA for the user
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true }
      });
    }

    return isValid;
  }

  /**
   * Verify 2FA token during login
   */
  static async verifyTwoFactorLogin(userId: string, token: string): Promise<TwoFactorVerification> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twoFactorSecret: true, 
        twoFactorEnabled: true,
        twoFactorBackupCodes: true
      }
    });

    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
      return { isValid: false };
    }

    // First try TOTP token
    const totpValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret
    });

    if (totpValid) {
      return { isValid: true };
    }

    // If TOTP fails, try backup codes
    if (user.twoFactorBackupCodes) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes);
      const backupCodeIndex = backupCodes.indexOf(token.toUpperCase());

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(backupCodeIndex, 1);
        
        await prisma.user.update({
          where: { id: userId },
          data: { 
            twoFactorBackupCodes: JSON.stringify(backupCodes)
          }
        });

        return { isValid: true, backupCodeUsed: true };
      }
    }

    return { isValid: false };
  }

  /**
   * Disable 2FA for a user
   */
  static async disableTwoFactor(userId: string, password: string): Promise<boolean> {
    // Verify password before disabling 2FA
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // In a real implementation, you would verify the password hash here
    // For now, we'll assume password verification is handled elsewhere

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      }
    });

    return true;
  }

  /**
   * Regenerate backup codes for a user
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const newBackupCodes = this.generateBackupCodes();

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: JSON.stringify(newBackupCodes) }
    });

    return newBackupCodes;
  }

  /**
   * Check if user has 2FA enabled
   */
  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    });

    return user?.twoFactorEnabled || false;
  }

  /**
   * Get 2FA status for a user
   */
  static async getTwoFactorStatus(userId: string): Promise<{
    enabled: boolean;
    hasBackupCodes: boolean;
    backupCodesCount: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twoFactorEnabled: true,
        twoFactorBackupCodes: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const backupCodes = user.twoFactorBackupCodes 
      ? JSON.parse(user.twoFactorBackupCodes) 
      : [];

    return {
      enabled: user.twoFactorEnabled || false,
      hasBackupCodes: backupCodes.length > 0,
      backupCodesCount: backupCodes.length
    };
  }

  /**
   * Validate 2FA token format
   */
  static validateTokenFormat(token: string): boolean {
    // TOTP tokens are typically 6 digits
    return /^\d{6}$/.test(token);
  }

  /**
   * Validate backup code format
   */
  static validateBackupCodeFormat(code: string): boolean {
    // Backup codes are 8-character alphanumeric
    return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
  }

  /**
   * Get time remaining for current TOTP window
   */
  static getTimeRemaining(): number {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const timeStep = 30; // 30 seconds
    return timeStep - (epoch % timeStep);
  }

  /**
   * Check if 2FA is required for admin access
   */
  static async isTwoFactorRequired(userId: string): Promise<boolean> {
    // Check if user is an admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, twoFactorEnabled: true }
    });

    if (!user) {
      return false;
    }

    // Require 2FA for all admin users
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }

  /**
   * Log 2FA events for audit
   */
  static async logTwoFactorEvent(
    userId: string,
    action: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    details?: any
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action: `TWO_FACTOR_${action}`,
        resource: 'AUTHENTICATION',
        details: {
          success,
          ...details
        },
        ipAddress,
        userAgent
      }
    });
  }

  /**
   * Get 2FA setup instructions
   */
  static getSetupInstructions(): string[] {
    return [
      'Download an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator',
      'Scan the QR code with your authenticator app',
      'Enter the 6-digit code from your app to verify setup',
      'Save your backup codes in a secure location',
      'You can use backup codes if you lose access to your authenticator app'
    ];
  }

  /**
   * Get 2FA security tips
   */
  static getSecurityTips(): string[] {
    return [
      'Never share your authenticator app or backup codes with anyone',
      'Keep backup codes in a secure, offline location',
      'Use a dedicated device for your authenticator app when possible',
      'Regularly check your 2FA settings and regenerate backup codes if needed',
      'If you lose access to your authenticator, use backup codes to regain access'
    ];
  }
}
