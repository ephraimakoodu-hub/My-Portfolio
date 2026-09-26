import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/projects/new', label: '+ Add Project' },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/taxonomy', label: 'Categories & Tech' },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/experience', label: 'Experience' },
  { to: '/admin/settings', label: 'Profile Settings' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true" />
          <span>Admin</span>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-account">
          <p className="admin-account-label">Signed in as</p>

          <p className="admin-email">
            {admin?.email || 'Administrator'}
          </p>

          <button
            className="admin-logout"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <Outlet />
      </main>

    </div>
  );
}