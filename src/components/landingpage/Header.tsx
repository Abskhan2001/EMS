import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SignupModal from "./SignupModal";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/redux.CustomHooks";
import { useUser } from "../../contexts/UserContext";
import { clearAuth } from "../../slices/authSlice";
import { sessionManager } from "../../lib/sessionManager";
import { useAuthStore } from "../../lib/store";

const Header = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { userProfile, } = useUser();
  const dispatch = useAppDispatch();
  const setUser = useAuthStore((state) => state.setUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const navigationfunction = () => {
    if (userProfile?.role === 'superadmin') {
      navigate('/superadmin');
    } else if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else if (userProfile?.role == "user") {
      navigate("/user")
    }
    else {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    try {
      // Use SessionManager for proper logout
      await sessionManager.signOut();

      // Clear both Zustand and Redux auth state
      setUser(null);
      dispatch(clearAuth());

      // Navigate to home page (will show sign in/sign up buttons)
      navigate('/home');
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear local state even if remote logout fails
      setUser(null);
      dispatch(clearAuth());
      localStorage.clear();
      navigate('/home');
    }
  };



  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <motion.header
      className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? "bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg" : "bg-gradient-to-r from-blue-600/95 to-purple-700/95 backdrop-blur-sm"
        }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex-shrink-0 flex items-center gap-2">
              <motion.div
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src="/ems icon.png"
                  alt="EstroWork Logo"
                  className="w-full h-full object-contain"
                />
              </motion.div>
              <span className="text-2xl font-bold text-yellow-400">
                EstroWork
              </span>
            </div>
          </motion.div>

          <nav className="hidden md:flex space-x-8">
            {["home", "features", "pricing", "contact"].map((section, index) => (
              <motion.button
                key={section}
                onClick={() => scrollToSection(section)}
                className="relative text-white hover:text-yellow-400 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="capitalize">{section}</span>
                <motion.div
                  className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400"
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            ))}
          </nav>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <motion.div
                  className="hidden md:flex items-center space-x-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <motion.button
                    className="relative bg-yellow-400 text-blue-900 px-6 py-2 rounded-lg font-bold overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={navigationfunction}
                  >
                    <motion.div
                      className="absolute inset-0 bg-yellow-300"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <span className="relative z-10">Dashboard</span>
                  </motion.button>
                </motion.div>
                <motion.div
                  className="hidden md:flex items-center space-x-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <motion.button
                    onClick={handleSignOut}
                    className="relative border-2 border-yellow-400 text-yellow-400 px-6 py-2 rounded-lg font-medium hover:bg-yellow-400 hover:text-blue-900 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign out
                  </motion.button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  className="hidden md:flex items-center space-x-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <motion.button
                    className="relative bg-yellow-400 text-blue-900 px-6 py-2 rounded-lg font-bold overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/login")}
                  >
                    <motion.div
                      className="absolute inset-0 bg-yellow-300"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <span className="relative z-10">Sign in</span>
                  </motion.button>
                </motion.div>
                <motion.div
                  className="hidden md:flex items-center space-x-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <motion.button
                    onClick={() => setIsSignupModalOpen(true)}
                    className="relative border-2 border-yellow-400 text-yellow-400 px-6 py-2 rounded-lg font-medium hover:bg-yellow-400 hover:text-blue-900 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign-up
                  </motion.button>
                </motion.div>
              </>
            )}
          </div>

          <div className="md:hidden">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-yellow-400 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden bg-gradient-to-r from-blue-700 to-purple-800 border-t border-yellow-400/30 shadow-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {["home", "features", "pricing", "contact"].map((section, index) => (
                <motion.button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className="block w-full text-left px-3 py-2 text-white hover:text-yellow-400 transition-colors duration-200 rounded-lg hover:bg-white/10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ x: 5 }}
                >
                  <span className="capitalize">{section}</span>
                </motion.button>
              ))}
              {user ? (
                <>
                  <motion.div
                    className="block px-3 pt-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <motion.button
                      className="w-full bg-yellow-400 text-blue-900 px-4 py-2 rounded-lg font-bold"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/dashboard")}
                    >
                      Dashboard
                    </motion.button>
                  </motion.div>
                  <motion.div
                    className="block px-3 pt-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <motion.button
                      onClick={handleSignOut}
                      className="w-full border-2 border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 hover:text-blue-900 transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign out
                    </motion.button>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    className="block px-3 pt-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <motion.button
                      className="w-full bg-yellow-400 text-blue-900 px-4 py-2 rounded-lg font-bold"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/login")}
                    >
                      Sign-in
                    </motion.button>
                  </motion.div>
                  <motion.div
                    className="block px-3 pt-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <motion.button
                      onClick={() => setIsSignupModalOpen(true)}
                      className="w-full border-2 border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 hover:text-blue-900 transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign-up
                    </motion.button>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
      />
    </motion.header>
  );
};

export default Header;
