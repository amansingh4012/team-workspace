import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Moon, Sun } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { getInitials } from '../utils/helpers';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 dark:bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold text-indigo-400">
          <LayoutDashboard className="w-6 h-6" />
          TeamWork
        </Link>

        <div className="flex items-center gap-4">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-medium">
              {getInitials(user?.name)}
            </div>
            <span className="text-sm font-medium text-gray-300">{user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
