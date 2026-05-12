const React = require('react');

const mockNavigate = jest.fn();
const mockLocation = { state: null, pathname: '/', search: '', hash: '' };

module.exports = {
  Link: ({ children, to, ...rest }) =>
    React.createElement('a', { href: to, ...rest }, children),
  NavLink: ({ children, to, ...rest }) =>
    React.createElement('a', { href: to, ...rest }, children),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  MemoryRouter: ({ children }) => React.createElement(React.Fragment, null, children),
  BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
  Routes: ({ children }) => React.createElement(React.Fragment, null, children),
  Route: ({ element }) => element || null,
  Outlet: () => null,
  Navigate: () => null,
};
