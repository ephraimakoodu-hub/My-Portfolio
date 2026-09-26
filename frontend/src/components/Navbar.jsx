import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/projects', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar({ name }) {
  return (
    <header style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 10 }}>
      <nav className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }} aria-label="Primary">
        <NavLink to="/" style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>
          {name || 'Portfolio'}
        </NavLink>
        <div style={{ display: 'flex', gap: 28 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontSize: '0.92rem',
                fontWeight: 500,
                color: isActive ? 'var(--accent)' : 'var(--ink)',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
