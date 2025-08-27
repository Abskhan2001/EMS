/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

import Chatbutton from './chatbtn';
import Chatlayout from './chatlayout';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  User,
  ListTodo,
  CloudCog,
  Building2,
  Menu,
  Banknote,
  Notebook
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppSelector } from '../hooks/redux.CustomHooks';
import { useUser } from '../contexts/UserContext';
import { sessionManager } from '../lib/sessionManager';
import { toDate } from 'date-fns';
import Header from './Header';
import TimeTrackerWidget from './TimeTrackerWidget';
import Updateview from './updateview';
import { useAppDispatch } from '../hooks/redux.CustomHooks';
import { clearAuth } from '../slices/authSlice';

const EmployeeLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { userProfile, loading } = useUser();
  const dispatch = useAppDispatch();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 795);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);


  // Close sidebar on small screens when route changes
  useEffect(() => {
    if (isSmallScreen) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isSmallScreen]);

  const handleSignOut = async () => {
    try {
      // Use SessionManager for proper logout
      await sessionManager.signOut();

      // Clear Redux auth state
      dispatch(clearAuth());

      // Navigate to home page
      navigate('/home');
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear local state even if remote logout fails
      dispatch(clearAuth());
      localStorage.clear();
      navigate('/home');
    }
  };

  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Attendance', href: '/attendance', icon: Clock },
    { name: 'Over Time', href: '/overtime', icon: Clock },
    { name: 'Leave', href: '/leave', icon: Calendar },
    { name: 'Projects', href: '/tasks', icon: ListTodo },
    { name: 'Software Complaint', href: '/software-complaint', icon: CloudCog },
    { name: 'Office Complaint', href: '/office-complaint', icon: Building2 },
    { name: "Salary Breakdown", href: "/salary-breakdown", icon: Banknote },
    { name: "DailyLogs", href: "/Dailylogs", icon: Notebook },
  ];

  const clientHiddenItems = ['Attendance', 'Over Time', 'Leave', 'Salary Breakdown', 'DailyLogs'];
  const productManagerHiddenItems = ['Office Complaint', ...clientHiddenItems];

  const navigation = userProfile?.role === 'client'
    ? allNavigation.filter(item => !clientHiddenItems.includes(item.name))
    : userProfile?.role == 'product manager'
      ? allNavigation.filter(item => !productManagerHiddenItems.includes(item.name))
      : allNavigation;

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        setIsSidebarOpen={setIsSidebarOpen}
        handleSignOut={handleSignOut}
      />
      <div>
        <div className="min-h-screen bg-gray-100 overflow-hidden">
          <Updateview />
          <div className="flex">
            {/* Sidebar Toggle Button (Only for Small Screens) */}
            {isSmallScreen && (
              <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white shadow-md rounded-md"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
              >
                <Menu size={24} />
              </button>
            )}
            {/* Overlay (Only for Small Screens when Sidebar is Open) */}
            {isSmallScreen && isSidebarOpen && (
              <div
                className="fixed inset-0 bg-white bg-opacity-50 lg:hidden z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`bg-white p-4 shadow-lg
                ${isSmallScreen
                ? isSidebarOpen
                  ? 'translate-x-0'
                  : '-translate-x-full'
                : 'translate-x-0 w-64'
              }`}></div>
            <div
              className={`bg-[#01094A] w-64 p-4 z-40 shadow-lg fixed left-0 top-0 bottom-0 transform transition-transform duration-300 ease-in-out
                ${isSmallScreen
                  ? isSidebarOpen
                    ? 'translate-x-0'
                    : '-translate-x-full'
                  : 'translate-x-0'
                }`}
            >
              <div className="flex flex-col h-full overflow-y-scroll sidebar-scroll">
                <div className="flex items-center justify-center">
                  <h1 className="text-2xl font-poppins font-bold text-[#FFFFFF] mt-2">Estrowork</h1>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-">
                  {loading ? (
                    // Skeleton loading
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex items-center px-4 py-4 animate-pulse">
                        <div className="w-5 h-5 bg-gray-600 rounded mr-3"></div>
                        <div className="h-4 bg-gray-600 rounded w-24"></div>
                      </div>
                    ))
                  ) : (
                    navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={handleScrollToTop}
                          className={`
                            flex items-center px-4 py-4 text-sm rounded-lg
                            ${location.pathname === item.href
                              ? 'bg-[#C78E2C] text-[#FFFFFF]'
                              : 'text-[#FFFFFF] hover:bg-[#C78E2C]/20'
                            }
                          `}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {item.name}
                        </Link>
                      );
                    })
                  )}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 overflow-auto transition-all duration-300 ease-in-out`}>
              <div className={`w-full ${isSmallScreen && !isSidebarOpen ? "pt-8 px-2" : "sm:p-8"}`}>
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default EmployeeLayout;