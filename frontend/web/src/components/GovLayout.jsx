import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  AlertTriangle, 
  Package, 
  Users, 
  BarChart, 
  Settings,
  Brain,
  Truck,
  LogOut,
  ChevronRight,
  Shield,
  Bell
} from "lucide-react";

export default function GovLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadAlerts] = useState(3);

  const menuItems = [
    {
      section: 'Main',
      items: [
        { 
          path: '/gov/dashboard', 
          label: 'Dashboard', 
          icon: Home
        },
        { 
          path: '/gov/incidents', 
          label: 'Incidents', 
          icon: AlertTriangle,
          badge: 5
        }
      ]
    },
    {
      section: 'Management',
      items: [
        { 
          path: '/gov/resources', 
          label: 'Resources', 
          icon: Package
        },
        { 
          path: '/gov/response-teams', 
          label: 'Response Teams', 
          icon: Users
        }
      ]
    },
    {
      section: 'Analytics & AI',
      items: [
        { 
          path: '/gov/analytics', 
          label: 'Reports', 
          icon: BarChart
        },
        { 
          path: '/gov/risk-prediction', 
          label: 'AI Risk Prediction', 
          icon: Brain
        },
        { 
          path: '/gov/resource-optimization', 
          label: 'Resource Optimizer', 
          icon: Truck
        }
      ]
    },
    {
      section: 'Admin',
      items: [
        { 
          path: '/gov/settings', 
          label: 'Settings', 
          icon: Settings
        }
      ]
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col relative`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-sm">Crisis Response</h1>
                <p className="text-xs text-purple-400">Government Dashboard</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {menuItems.map((section) => (
            <div key={section.section}>
              {sidebarOpen && (
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {section.section}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'G'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.name || 'Officer'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.department || 'Government'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-4 w-full flex items-center ${sidebarOpen ? 'gap-2' : 'justify-center'} px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-6 -right-3 bg-gray-700 p-1.5 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-900">
        {/* Top Bar */}
        <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {menuItems.flatMap(s => s.items).find(i => isActivePath(i.path))?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                )}
              </button>
              <div className="text-sm text-gray-400">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
