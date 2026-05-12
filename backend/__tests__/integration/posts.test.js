jest.mock('../../config/db', () => ({ connectDB: jest.fn().mockResolvedValue(true) }));
jest.mock('../../config/redis', () => ({
  createRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false),
}));
jest.mock('../../config/firebaseAdmin', () => ({
  initFirebaseAdmin: jest.fn(),
  getFirebaseAdmin: jest.fn().mockReturnValue(null),
}));
jest.mock('../../config/supabase', () => ({}));
jest.mock('../../queues/archiveQueue', () => ({
  getArchiveQueue: jest.fn().mockReturnValue(null),
}));

jest.mock('../../models/Post');
jest.mock('../../models/User');
jest.mock('../../models/Like');
jest.mock('../../models/Comment');
jest.mock('../../models/CommentLike');
jest.mock('../../models/Notification');
jest.mock('../../models/Connection');

const express = require('express');
const request = require('supertest');
const TokenService = require('../../services/tokenService');
const User = require('../../models/User');
const Post = require('../../models/Post');

const postsRoutes = require('../../routes/posts');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', postsRoutes);
  return app;
};

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  tokenVersion: 0,
  isActive: true,
  isDeleted: false,
  toSafeJSON: jest.fn().mockReturnValue({ id: '507f1f77bcf86cd799439011' }),
};

let validToken;

beforeAll(() => {
  validToken = TokenService.generateAccessToken(mockUser);
});

beforeEach(() => {
  jest.clearAllMocks();
  // Auth middleware fetches fresh user for every request
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
});

describe('GET /api/posts', () => {
  it('returns 401 with no auth token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid auth and mocked post list', async () => {
    // aggregate() returns an object with exec() or is awaited directly
    Post.aggregate = jest.fn().mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.posts)).toBe(true);
  });
});

describe('POST /api/posts', () => {
  it('returns 401 with no auth token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/posts').send({ content: 'Hello world' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when post has no content and no media', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('creates a post and returns 201', async () => {
    const createdPost = {
      _id: '60d5f484f7b4e01b8c8b4567',
      shortId: 'abc123',
      content: 'Hello world',
      authorId: mockUser._id,
      mediaIds: [],
      mediaType: 'none',
      status: 'active',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    Post.create = jest.fn().mockResolvedValue(createdPost);
    Post.aggregate = jest.fn().mockResolvedValue([{ ...createdPost, author: mockUser }]);

    const app = buildApp();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ content: 'Hello world' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/posts/:id', () => {
  it('returns 401 with no auth', async () => {
    const app = buildApp();
    const res = await request(app).delete('/api/posts/60d5f484f7b4e01b8c8b4567');
    expect(res.status).toBe(401);
  });

  it('returns 404 when post does not exist', async () => {
    Post.findOne = jest.fn().mockResolvedValue(null);

    const app = buildApp();
    const res = await request(app)
      .delete('/api/posts/60d5f484f7b4e01b8c8b4567')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
  });
});
