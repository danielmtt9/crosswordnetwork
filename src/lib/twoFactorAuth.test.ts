import { TwoFactorAuthManager } from './twoFactorAuth';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Mock dependencies
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    verify: jest.fn(),
    keyuri: jest.fn(),
    options: {}
  }
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

jest.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    }
  }
}));

const mockPrisma = require('./prisma').prisma;

describe('TwoFactorAuthManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate a secret for a user', () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      (authenticator.generateSecret as jest.Mock).mockReturnValue(mockSecret);

      const secret = TwoFactorAuthManager.generateSecret('user1');

      expect(secret).toBe(mockSecret);
      expect(authenticator.generateSecret).toHaveBeenCalled();
    });
  });

  describe('generateQRCodeUrl', () => {
    it('should generate QR code URL', () => {
      const mockUrl = 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Crossword%20Network%20Admin';
      (authenticator.keyuri as jest.Mock).mockReturnValue(mockUrl);

      const url = TwoFactorAuthManager.generateQRCodeUrl('user1', 'secret', 'test@example.com');

      expect(url).toBe(mockUrl);
      expect(authenticator.keyuri).toHaveBeenCalledWith(
        'test@example.com',
        'Crossword Network Admin',
        'secret'
      );
    });
  });

  describe('generateQRCodeDataUrl', () => {
    it('should generate QR code as data URL', async () => {
      const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockDataUrl);

      const dataUrl = await TwoFactorAuthManager.generateQRCodeDataUrl('otpauth://totp/test');

      expect(dataUrl).toBe(mockDataUrl);
      expect(QRCode.toDataURL).toHaveBeenCalledWith('otpauth://totp/test');
    });

    it('should throw error if QR code generation fails', async () => {
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

      await expect(TwoFactorAuthManager.generateQRCodeDataUrl('invalid')).rejects.toThrow('Failed to generate QR code');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate backup codes with default count', () => {
      const codes = TwoFactorAuthManager.generateBackupCodes();

      expect(codes).toHaveLength(10);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });

    it('should generate backup codes with custom count', () => {
      const codes = TwoFactorAuthManager.generateBackupCodes(5);

      expect(codes).toHaveLength(5);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });
  });

  describe('setupTwoFactor', () => {
    it('should setup 2FA for a user', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      const mockUrl = 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP';
      
      (authenticator.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (authenticator.keyuri as jest.Mock).mockReturnValue(mockUrl);
      mockPrisma.user.update.mockResolvedValue({});

      const setup = await TwoFactorAuthManager.setupTwoFactor('user1', 'test@example.com');

      expect(setup.secret).toBe(mockSecret);
      expect(setup.qrCodeUrl).toBe(mockUrl);
      expect(setup.backupCodes).toHaveLength(10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          twoFactorSecret: mockSecret,
          twoFactorBackupCodes: JSON.stringify(setup.backupCodes),
          twoFactorEnabled: false
        }
      });
    });
  });

  describe('verifyTwoFactorSetup', () => {
    it('should verify 2FA setup with valid token', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: mockSecret
      });
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      const isValid = await TwoFactorAuthManager.verifyTwoFactorSetup('user1', '123456');

      expect(isValid).toBe(true);
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: mockSecret
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { twoFactorEnabled: true }
      });
    });

    it('should return false for invalid token', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: mockSecret
      });
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const isValid = await TwoFactorAuthManager.verifyTwoFactorSetup('user1', '123456');

      expect(isValid).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(TwoFactorAuthManager.verifyTwoFactorSetup('user1', '123456')).rejects.toThrow('2FA not set up for user');
    });
  });

  describe('verifyTwoFactorLogin', () => {
    it('should verify TOTP token successfully', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: mockSecret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: null
      });
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await TwoFactorAuthManager.verifyTwoFactorLogin('user1', '123456');

      expect(result.isValid).toBe(true);
      expect(result.backupCodeUsed).toBeUndefined();
    });

    it('should verify backup code successfully', async () => {
      const backupCodes = ['ABC12345', 'DEF67890'];
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: 'secret',
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      });
      (authenticator.verify as jest.Mock).mockReturnValue(false);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await TwoFactorAuthManager.verifyTwoFactorLogin('user1', 'ABC12345');

      expect(result.isValid).toBe(true);
      expect(result.backupCodeUsed).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { twoFactorBackupCodes: JSON.stringify(['DEF67890']) }
      });
    });

    it('should return false for invalid token and backup code', async () => {
      const backupCodes = ['ABC12345', 'DEF67890'];
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: 'secret',
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      });
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const result = await TwoFactorAuthManager.verifyTwoFactorLogin('user1', 'INVALID');

      expect(result.isValid).toBe(false);
    });

    it('should return false if 2FA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorSecret: 'secret',
        twoFactorEnabled: false,
        twoFactorBackupCodes: null
      });

      const result = await TwoFactorAuthManager.verifyTwoFactorLogin('user1', '123456');

      expect(result.isValid).toBe(false);
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable 2FA for a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        password: 'hashedpassword'
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await TwoFactorAuthManager.disableTwoFactor('user1', 'password');

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null
        }
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(TwoFactorAuthManager.disableTwoFactor('user1', 'password')).rejects.toThrow('User not found');
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const codes = await TwoFactorAuthManager.regenerateBackupCodes('user1');

      expect(codes).toHaveLength(10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { twoFactorBackupCodes: JSON.stringify(codes) }
      });
    });
  });

  describe('isTwoFactorEnabled', () => {
    it('should return true if 2FA is enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorEnabled: true
      });

      const enabled = await TwoFactorAuthManager.isTwoFactorEnabled('user1');

      expect(enabled).toBe(true);
    });

    it('should return false if 2FA is disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorEnabled: false
      });

      const enabled = await TwoFactorAuthManager.isTwoFactorEnabled('user1');

      expect(enabled).toBe(false);
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should return 2FA status', async () => {
      const backupCodes = ['ABC12345', 'DEF67890'];
      mockPrisma.user.findUnique.mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      });

      const status = await TwoFactorAuthManager.getTwoFactorStatus('user1');

      expect(status.enabled).toBe(true);
      expect(status.hasBackupCodes).toBe(true);
      expect(status.backupCodesCount).toBe(2);
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(TwoFactorAuthManager.getTwoFactorStatus('user1')).rejects.toThrow('User not found');
    });
  });

  describe('validateTokenFormat', () => {
    it('should validate 6-digit token format', () => {
      expect(TwoFactorAuthManager.validateTokenFormat('123456')).toBe(true);
      expect(TwoFactorAuthManager.validateTokenFormat('000000')).toBe(true);
    });

    it('should reject invalid token formats', () => {
      expect(TwoFactorAuthManager.validateTokenFormat('12345')).toBe(false);
      expect(TwoFactorAuthManager.validateTokenFormat('1234567')).toBe(false);
      expect(TwoFactorAuthManager.validateTokenFormat('abcdef')).toBe(false);
      expect(TwoFactorAuthManager.validateTokenFormat('')).toBe(false);
    });
  });

  describe('validateBackupCodeFormat', () => {
    it('should validate 8-character alphanumeric backup code format', () => {
      expect(TwoFactorAuthManager.validateBackupCodeFormat('ABC12345')).toBe(true);
      expect(TwoFactorAuthManager.validateBackupCodeFormat('abc12345')).toBe(true);
      expect(TwoFactorAuthManager.validateBackupCodeFormat('12345678')).toBe(true);
    });

    it('should reject invalid backup code formats', () => {
      expect(TwoFactorAuthManager.validateBackupCodeFormat('ABC1234')).toBe(false);
      expect(TwoFactorAuthManager.validateBackupCodeFormat('ABC123456')).toBe(false);
      expect(TwoFactorAuthManager.validateBackupCodeFormat('ABC-1234')).toBe(false);
      expect(TwoFactorAuthManager.validateBackupCodeFormat('')).toBe(false);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return time remaining for current TOTP window', () => {
      const timeRemaining = TwoFactorAuthManager.getTimeRemaining();
      
      expect(timeRemaining).toBeGreaterThanOrEqual(0);
      expect(timeRemaining).toBeLessThanOrEqual(30);
    });
  });

  describe('isTwoFactorRequired', () => {
    it('should require 2FA for admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        twoFactorEnabled: true
      });

      const required = await TwoFactorAuthManager.isTwoFactorRequired('user1');

      expect(required).toBe(true);
    });

    it('should require 2FA for super admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SUPER_ADMIN',
        twoFactorEnabled: true
      });

      const required = await TwoFactorAuthManager.isTwoFactorRequired('user1');

      expect(required).toBe(true);
    });

    it('should not require 2FA for non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        twoFactorEnabled: false
      });

      const required = await TwoFactorAuthManager.isTwoFactorRequired('user1');

      expect(required).toBe(false);
    });

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const required = await TwoFactorAuthManager.isTwoFactorRequired('user1');

      expect(required).toBe(false);
    });
  });

  describe('logTwoFactorEvent', () => {
    it('should log 2FA events', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      await TwoFactorAuthManager.logTwoFactorEvent(
        'user1',
        'SETUP',
        true,
        '192.168.1.1',
        'Mozilla/5.0',
        { test: 'data' }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          action: 'TWO_FACTOR_SETUP',
          resource: 'AUTHENTICATION',
          details: {
            success: true,
            test: 'data'
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      });
    });
  });

  describe('getSetupInstructions', () => {
    it('should return setup instructions', () => {
      const instructions = TwoFactorAuthManager.getSetupInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('authenticator app');
    });
  });

  describe('getSecurityTips', () => {
    it('should return security tips', () => {
      const tips = TwoFactorAuthManager.getSecurityTips();

      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]).toContain('Never share');
    });
  });
});
