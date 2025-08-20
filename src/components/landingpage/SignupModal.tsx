import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle, Building2, UserCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  accountType: 'personal' | 'organization';
  organizationName: string;
  organizationSlug: string;
}

type SignupStatus = 'idle' | 'loading' | 'success' | 'error';

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    accountType: 'personal',
    organizationName: '',
    organizationSlug: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SignupStatus>('idle');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 500, behavior: 'smooth' });
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleClose = () => {
    // Reset all states when closing
    setFormData({
      name: '',
      email: '',
      password: '',
      accountType: 'personal',
      organizationName: '',
      organizationSlug: '',
    });
    setError(null);
    setShowSuccessAlert(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    // Additional validation for organization
    if (formData.accountType === 'organization') {
      if (!formData.organizationName || !formData.organizationSlug) {
        setError('Organization name and slug are required');
        return;
      }
    }

    try {
      setStatus('loading');
      setError(null);

      if (formData.accountType === 'organization') {
        // Organization signup flow

        // Step 1: Create organization first
        const orgResponse = await supabase
          .from('organizations')
          .insert({
            name: formData.organizationName,
            slug: formData.organizationSlug,
            email: formData.email, // Use the user's email as organization email
            created_by: null // Will be updated after user creation
          });

        if (orgResponse.error) {
          // Handle specific error cases
          if (orgResponse.error.message.includes('slug already exists')) {
            throw new Error('Organization slug already exists. Please choose a different slug.');
          } else if (orgResponse.error.message.includes('email already exists')) {
            throw new Error('Organization email already exists. Please use a different email.');
          } else {
            throw new Error(`Failed to create organization: ${orgResponse.error.message}`);
          }
        }
        if (!orgResponse.data) throw new Error('Failed to create organization');

        const organizationId = orgResponse.data.id || orgResponse.data._id;

        // Step 2: Create user with admin role using the new backend API
        const userResponse = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
          role: 'admin',
          organizationId: organizationId
        });

        if (userResponse.error) throw new Error(`Failed to create user: ${userResponse.error.message}`);
        if (!userResponse.data?.user) throw new Error('Failed to create user account');

        // Step 3: Update organization with created_by (TODO: Implement update functionality)
        // For now, we'll skip this step as the organization is created successfully
        // const updateOrgResponse = await supabase
        //   .from('organizations')
        //   .update({ created_by: userResponse.data.user.id })
        //   .eq('id', organizationId);

        // if (updateOrgResponse.error) {
        //   console.warn('Failed to update organization created_by:', updateOrgResponse.error);
        // }

      } else {
        // Personal account signup flow using the new backend API
        const userResponse = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
          role: 'employee'
        });

        if (userResponse.error) throw new Error(`Failed to create user: ${userResponse.error.message}`);
        if (!userResponse.data?.user) throw new Error('Failed to create user account');
      }

      setStatus('success');
      setShowSuccessAlert(true);
      setError(null);

    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      setStatus('error');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" // Changed from max-w-md to max-w-lg
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8"> {/* Increased padding from p-6 to p-8 */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Sign Up</h2> {/* Increased text size */}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {showSuccessAlert ? (
              <motion.div
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg mb-4 flex flex-col items-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
                  <span className="font-medium">Account created successfully!</span>
                </div>
                <p className="text-center mb-3">Please check your email to confirm your account. If you did not receive an email, please check your spam folder.</p>
                <motion.button
                  onClick={handleClose}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center w-full max-w-xs"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  OK
                </motion.button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5"> {/* Increased spacing */}
                {/* Account Type Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-4"> {/* Increased gap */}
                    <motion.label
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.accountType === 'personal'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value="personal"
                        checked={formData.accountType === 'personal'}
                        onChange={(e) => handleInputChange('accountType', e.target.value as 'personal' | 'organization')}
                        className="sr-only"
                      />
                      <div className="flex flex-col items-center text-center w-full">
                        <UserCircle className={`w-10 h-10 mb-2 ${formData.accountType === 'personal' ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        <span className={`text-sm font-medium ${formData.accountType === 'personal' ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                          Personal
                        </span>
                      </div>
                    </motion.label>

                    <motion.label
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.accountType === 'organization'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value="organization"
                        checked={formData.accountType === 'organization'}
                        onChange={(e) => handleInputChange('accountType', e.target.value as 'personal' | 'organization')}
                        className="sr-only"
                      />
                      <div className="flex flex-col items-center text-center w-full">
                        <Building2 className={`w-10 h-10 mb-2 ${formData.accountType === 'organization' ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        <span className={`text-sm font-medium ${formData.accountType === 'organization' ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                          Organization
                        </span>
                      </div>
                    </motion.label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Organization Fields - Show only when organization is selected */}
                <AnimatePresence>
                  {formData.accountType === 'organization' && (
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Name
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={formData.organizationName}
                            onChange={(e) => handleInputChange('organizationName', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            placeholder="Enter organization name"
                            required={formData.accountType === 'organization'}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Slug
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            @
                          </span>
                          <input
                            type="text"
                            value={formData.organizationSlug}
                            onChange={(e) => handleInputChange('organizationSlug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            placeholder="organization-slug"
                            pattern="[a-z0-9\-]+"
                            required={formData.accountType === 'organization'}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          This will be your unique organization identifier
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={status === 'loading'}
                  className={`w-full ${status === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center`}
                  whileHover={{ scale: status === 'loading' ? 1 : 1.02 }}
                  whileTap={{ scale: status === 'loading' ? 1 : 0.98 }}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : status === 'success' ? (
                    'Success! Redirecting...'
                  ) : (
                    'Sign Up'
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SignupModal;