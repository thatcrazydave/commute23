// Smoke test: the app's root module loads without crashing.
// react-router / react-router-dom are mocked via src/__mocks__/.

jest.mock('./firebase', () => ({
  auth: { onAuthStateChanged: jest.fn(() => () => {}) },
}));
jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  GithubAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
}));
jest.mock('./services/api', () => {
  const m = { get: jest.fn(), post: jest.fn() };
  m.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
  m.defaults = { headers: { common: {} } };
  return m;
});

test('app module loads without errors', () => {
  expect(() => require('./App')).not.toThrow();
});
