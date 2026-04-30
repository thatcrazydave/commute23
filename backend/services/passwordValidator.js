const commonPasswords = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'sunshine',
  'princess', 'shadow', '123123', '1q2w3e4r', 'passw0rd', 'admin123',
  'root', 'toor', 'pass', 'test', 'guest', 'iloveyou', 'qwerty123',
  '111111', '000000', 'baseball', 'football', 'superman', 'batman',
];

const PasswordValidator = {
  validate: (password) => {
    const errors = [];
    const minLength = 8;
    const maxLength = 72;

    if (!password) {
      return { isValid: false, errors: ['Password is required'], score: 0, strength: 'weak' };
    }
    if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters`);
    if (password.length > maxLength) errors.push(`Password must not exceed ${maxLength} characters`);
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, choose a stronger one');
    }

    let score = 0;
    if (password.length >= minLength) score += 20;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 25;

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(100, score),
      strength: score >= 80 ? 'strong' : score >= 60 ? 'medium' : 'weak',
    };
  },
};

module.exports = PasswordValidator;
