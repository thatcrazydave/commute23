const { buildValidator, validateSignup, validateLogin } = require('../../middleware/inputValidator');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (body) => ({ body, path: '/test' });

describe('inputValidator', () => {
  describe('buildValidator', () => {
    const validate = buildValidator({
      name: { required: true, minLength: 2, maxLength: 10 },
    });

    it('calls next() on valid input', () => {
      const next = jest.fn();
      validate(mockReq({ name: 'Alice' }), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects missing required field', () => {
      const res = mockRes();
      validate(mockReq({}), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('rejects value shorter than minLength', () => {
      const res = mockRes();
      validate(mockReq({ name: 'A' }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects value longer than maxLength', () => {
      const res = mockRes();
      validate(mockReq({ name: 'A'.repeat(11) }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects NoSQL injection operator ($)', () => {
      const res = mockRes();
      validate(mockReq({ name: '$gt' }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateSignup', () => {
    const validBody = {
      email: 'user@example.com',
      username: 'validuser',
      password: 'Str0ng!Pass',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('passes with valid signup body', () => {
      const next = jest.fn();
      validateSignup(mockReq(validBody), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects invalid email format', () => {
      const res = mockRes();
      validateSignup(mockReq({ ...validBody, email: 'notanemail' }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects username with special chars', () => {
      const res = mockRes();
      validateSignup(mockReq({ ...validBody, username: 'bad user!' }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects password shorter than 8 chars', () => {
      const res = mockRes();
      validateSignup(mockReq({ ...validBody, password: 'short' }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateLogin', () => {
    it('passes with valid credentials', () => {
      const next = jest.fn();
      validateLogin(
        mockReq({ emailOrUsername: 'user@example.com', password: 'Str0ng!Pass' }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalled();
    });

    it('rejects missing password', () => {
      const res = mockRes();
      validateLogin(mockReq({ emailOrUsername: 'user@example.com' }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
