import { ChevronDown, ChevronUp, LogOut, Menu, Search, User } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../lib/store';
import { Link } from 'react-router-dom';
import { useUserContext } from '../lib/userprovider';
import { supabase } from '../lib/supabase';
import ChangePasswordModal from './ChangePasswordModal';

interface SelectedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at?: string;
  slack_id?: string;
  joining_date?: string;
  personal_email?: string;
  fcm_token: string;
  phone_number?: string;
  per_hour_pay?: string;
  salary?: string;
  profile_image: string | null;
  location?: string;
  profession?: string;
  push_subscription: {
    keys: {
      auth: string;
      p256dh: string;
    };
    endpoint: string;
    expirationTime: string | null;
  };
  CNIC?: string;
  bank_account?: string;
  company_id?: string | null;
}

function Header(
  { setIsSidebarOpen, handleSignOut }: {
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
    handleSignOut: () => void
  } = {
      setIsSidebarOpen: () => { },
      handleSignOut: () => { }
    }
) {
  const user = useAuthStore((state) => state.user);
  const [selecteduser, setselecteduser] = useState<null | SelectedUser>(null)
  console.log("authenticated user is", user)

  const getuserprofile = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/users/${user?.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          // Transform the data to match expected interface
          const transformedData = {
            id: result.user._id || result.user.id,
            email: result.user.email,
            full_name: result.user.fullName || result.user.full_name,
            role: result.user.role,
            department: result.user.department,
            profile_image: result.user.profilePicture || result.user.profile_image,
            personal_email: result.user.personal_email,
            slack_id: result.user.slack_id,
            joining_date: result.user.hireDate || result.user.joining_date
          };
          console.log("user profile is", transformedData);
          setselecteduser(transformedData);
        }
      } else {
        console.error('Error fetching user profile:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  useEffect(() => {
    if (user?.id) {
      getuserprofile()
    }
  }, [user]); // Dependencies - runs when either changes

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  console.log("sdss:", user?.email ? user?.email.slice(0, user?.email.indexOf('@')) : "Techcreator");

  // Skeleton Component
  const ProfileDropdownSkeleton = () => (
    <div className="relative" ref={dropdownRef}>
      <button className="flex items-center text-sm rounded-lg hover:bg-gray-800 px-3 py-2 transition-colors">
        <div className="w-8 h-8 rounded-full bg-gray-600 animate-pulse mr-2"></div>
        <div className="hidden sm:inline w-20 h-4 bg-gray-600 animate-pulse rounded"></div>
        <ChevronDown className="w-[18px] h-[18px] ml-1 text-gray-500" />
      </button>
    </div>
  );

  return (
    <>
      <nav className=''>
        <div className="flex z-10 items-center justify-end p-4 bg-gradient-to-b from-[#0216B0] to-[#01094A] text-white">
          {/* Center - Search bar */}
          <div className="hidden md:block relative max-w-[388px] w-[388px] mx-4">
            <input
              type="text"
              placeholder="Search Project Here"
              className="bg-white text-black rounded-full py-2 px-4 pr-12 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#C78E2C] border border-gray-200 shadow-sm"
            />
            <button className="absolute right-0 top-0 h-full bg-[#C78E2C] hover:bg-[#B8761F] rounded-r-full px-4 transition-colors flex items-center justify-center">
              <Search size={16} className="text-white" />
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {/* Profile Dropdown */}
            {selecteduser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center text-sm rounded-lg hover:bg-gray-800 px-3 py-2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2 overflow-hidden">
                    <img
                      src={(() => {
                        if (selecteduser.profile_image) {
                          const { data: { publicUrl } } = supabase
                            .storage
                            .from("profilepics")
                            .getPublicUrl(selecteduser?.profile_image);
                          return publicUrl;
                        }
                        return selecteduser.role === "admin" ? "./admin.jpeg" : "./profile.png";
                      })()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="hidden sm:inline">
                    {user?.email ? user?.email.slice(0, user?.email.indexOf('@')) : "Techcreator"}
                  </span>
                  {isProfileOpen ? (
                    <ChevronUp className="w-[18px] h-[18px] ml-1" />
                  ) : (
                    <ChevronDown className="w-[18px] h-[18px] ml-1" />
                  )}
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-3 text-sm text-gray-900 border-b">
                      <div className="font-medium">
                        {user?.email ? user?.email.slice(0, user?.email.indexOf('@')) : "Techcreator"}
                      </div>
                      <div className="text-gray-500">
                        {user?.email || "unknown@gmail.com"}
                      </div>

                    </div>

                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Your Profile
                    </Link>
                    <button
                      onClick={() => {
                        setIsChangePasswordModalOpen(true);
                        setIsProfileOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700  hover:bg-gray-100"
                    >
                      Change Password
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700  hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ProfileDropdownSkeleton />
            )}
          </div>
        </div>
      </nav>
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </>
  )
}

export default Header