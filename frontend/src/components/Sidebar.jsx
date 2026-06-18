import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  PieChart,
  Sparkles,
  Heart,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Itinerary', path: '/itinerary', icon: <Map size={20} /> },
    { name: 'Budget', path: '/budget', icon: <PieChart size={20} /> },
    { name: 'AI Assistant', path: '/chat', icon: <Sparkles size={20} /> },
    { name: 'Favorites', path: '/favorites', icon: <Heart size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = user?.user_metadata?.full_name || user?.email || 'Traveler';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo-container">
          <Sparkles className="logo-icon" size={24} color="var(--primary)" />
          <span className="logo-text">Manzil</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive && item.path !== '#' ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initial}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{displayName}</span>
            {user?.email && <span className="sidebar-user-email">{user.email}</span>}
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
