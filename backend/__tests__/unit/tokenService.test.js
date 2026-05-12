const TokenService = require('../../services/tokenService');

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  role: 'user',
  tokenVersion: 0,
};

describe('TokenService', () => {
  describe('generateAccessToken', () => {
    it('returns a string token', () => {
      const token = TokenService.generateAccessToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT structure
    });

    it('encodes the user id and role', () => {
      const token = TokenService.generateAccessToken(mockUser);
      const decoded = TokenService.verifyAccessToken(token);
      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('includes a unique jti on each call', () => {
      const t1 = TokenService.generateAccessToken(mockUser);
      const t2 = TokenService.generateAccessToken(mockUser);
      const d1 = TokenService.verifyAccessToken(t1);
      const d2 = TokenService.verifyAccessToken(t2);
      expect(d1.jti).not.toBe(d2.jti);
    });
  });

  describe('generateRefreshToken', () => {
    it('returns a verifiable refresh token', () => {
      const token = TokenService.generateRefreshToken(mockUser);
      const decoded = TokenService.verifyRefreshToken(token);
      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('throws on an invalid token', () => {
      expect(() => TokenService.verifyAccessToken('not.a.token')).toThrow();
    });

    it('throws with "expired" message for expired tokens', () => {
      const token = TokenService.generateAccessToken(mockUser, '1ms');
      return new Promise((resolve) =>
        setTimeout(() => {
          expect(() => TokenService.verifyAccessToken(token)).toThrow(/expired/i);
          resolve();
        }, 50)
      );
    });
  });

  describe('revokeToken / isTokenRevoked', () => {
    it('marks a jti as revoked', () => {
      const token = TokenService.generateAccessToken(mockUser);
      const { jti } = TokenService.verifyAccessToken(token);
      expect(TokenService.isTokenRevoked(jti)).toBe(false);
      TokenService.revokeToken(jti);
      expect(TokenService.isTokenRevoked(jti)).toBe(true);
    });

    it('returns false for unknown jti', () => {
      expect(TokenService.isTokenRevoked('unknown-jti-xyz')).toBe(false);
    });

    it('returns false for falsy jti', () => {
      expect(TokenService.isTokenRevoked(null)).toBe(false);
      expect(TokenService.isTokenRevoked('')).toBe(false);
    });
  });
});
