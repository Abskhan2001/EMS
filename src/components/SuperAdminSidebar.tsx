import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../lib/sessionManager';
import { useAppDispatch } from '../hooks/redux.CustomHooks';
import { clearAuth } from '../slices/authSlice';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Menu,
  X,
  Shield,
  AlertCircle,
} from 'lucide-react';

interface SuperAdminSidebarProps {
  activeTab: string;
}

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ activeTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      // Use SessionManager for proper logout
      await sessionManager.signOut();

      // Clear both Zustand and Redux auth state
      setUser(null);
      dispatch(clearAuth());

      // Navigate to home page
      navigate('/home');
    } catch (error) {
      console.error('Error logging out:', error);
      // Fallback: clear local state even if remote logout fails
      setUser(null);
      dispatch(clearAuth());
      localStorage.clear();
      navigate('/home');
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/superadmin/dashboard',
    },
    {
      id: 'organizations',
      label: 'Organizations',
      icon: Building2,
      path: '/superadmin/organizations',
    },
    {
      id: 'softwarecomplaint',
      label: 'Software Complaints',
      icon: AlertCircle,
      path: '/superadmin/softwarecomplaint',
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#9A00FF] text-white rounded-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#9A00FF] rounded-lg">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">SuperAdmin</h1>
              <p className="text-sm text-gray-500">Control Panel</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#9A00FF] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500">Super Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false); // Close mobile menu
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-[#9A00FF] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main content spacer for desktop */}
      <div className="hidden md:block w-64 flex-shrink-0" />
    </>
  );
};

export default SuperAdminSidebar;
