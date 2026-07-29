import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, LogOut, PlusCircle, Search, User as UserIcon, Compass } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="bg-slate-800 text-white p-1.5 rounded-lg group-hover:bg-slate-700 transition-colors">
          <CheckSquare size={22} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">UniVote</h1>
      </Link>

      <nav className="flex items-center gap-6">
        {currentUser ? (
          <>
            <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors">
              <Compass size={18} />
              <span className="hidden sm:inline">Discover</span>
            </Link>
            <Link to="/my-polls" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors">
              <UserIcon size={18} />
              <span className="hidden sm:inline">My Polls</span>
            </Link>
            <Link to="/search" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors">
              <Search size={18} />
              <span className="hidden sm:inline">Search</span>
            </Link>
            <Link to="/create" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors">
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Create Poll</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-500 hidden md:inline">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 transition-colors p-1.5"
                title="Log out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Log in
            </Link>
            <Link to="/register" className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
