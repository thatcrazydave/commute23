const React = require('react');

module.exports = {
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: null, pathname: '/', search: '', hash: '' }),
  useParams: () => ({}),
  Outlet: () => null,
  Navigate: () => null,
};
