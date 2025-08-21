import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle, Building2, UserCircle, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: 'personal' | 'organization';
  organizationName: string;
  organizationSlug: string;
}

interface ValidationErrors extends Partial<Record<keyof FormData, string>> {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  organizationName?: string;
  organizationSlug?: string;
}

type SignupStatus = 'idle' | 'loading' | 'success' | 'error';

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'personal',
    organizationName: '',
    organizationSlug: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [status, setStatus] = useState<SignupStatus>('idle');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 500, behavior: 'smooth' });
    } else {
      // Restore background scrolling when modal is closed
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters long';
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name should only contain letters and spaces';
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character (@$!%*?&)';
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return undefined;
  };

  const validateOrganizationName = (name: string): string | undefined => {
    if (!name.trim()) return 'Organization name is required';
    if (name.trim().length < 2) return 'Organization name must be at least 2 characters long';
    if (name.trim().length > 100) return 'Organization name must be less than 100 characters';
    return undefined;
  };

  const validateOrganizationSlug = (slug: string): string | undefined => {
    if (!slug.trim()) return 'Organization slug is required';
    if (slug.length < 3) return 'Organization slug must be at least 3 characters long';
    if (slug.length > 50) return 'Organization slug must be less than 50 characters';
    if (!/^[a-z0-9-]+$/.test(slug)) return 'Organization slug can only contain lowercase letters, numbers, and hyphens';
    if (slug.startsWith('-') || slug.endsWith('-')) return 'Organization slug cannot start or end with a hyphen';
    if (slug.includes('--')) return 'Organization slug cannot contain consecutive hyphens';
    return undefined;
  };

  const validateField = (field: keyof FormData, value: string) => {
    let fieldError: string | undefined;

    switch (field) {
      case 'name':
        fieldError = validateName(value);
        break;
      case 'email':
        fieldError = validateEmail(value);
        break;
      case 'password':
        fieldError = validatePassword(value);
        // Also revalidate confirm password if it exists
        if (formData.confirmPassword) {
          const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, value);
          setValidationErrors(prev => ({ ...prev, confirmPassword: confirmPasswordError }));
        }
        break;
      case 'confirmPassword':
        fieldError = validateConfirmPassword(value, formData.password);
        break;
      case 'organizationName':
        fieldError = validateOrganizationName(value);
        break;
      case 'organizationSlug':
        fieldError = validateOrganizationSlug(value);
        break;
    }

    setValidationErrors(prev => ({ ...prev, [field]: fieldError }));
    return fieldError;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    // Special handling for organization slug
    if (field === 'organizationSlug') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate field if it has been touched
    if (touched[field]) {
      validateField(field, value);
    }

    if (error) setError(null);
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleClose = () => {
    // Restore background scrolling before closing
    document.body.style.overflow = 'unset';
    
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: 'personal',
      organizationName: '',
      organizationSlug: '',
    });
    setError(null);
    setValidationErrors({});
    setShowSuccessAlert(false);
    setStatus('idle');
    setTouched({});
    onClose();
  };

  const validateAllFields = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    // Validate basic fields
    errors.name = validateName(formData.name);
    errors.email = validateEmail(formData.email);
    errors.password = validatePassword(formData.password);
    errors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password);

    // Validate organization fields if applicable
    if (formData.accountType === 'organization') {
      errors.organizationName = validateOrganizationName(formData.organizationName);
      errors.organizationSlug = validateOrganizationSlug(formData.organizationSlug);
    }

    // Check if any errors exist
    Object.values(errors).forEach(error => {
      if (error) isValid = false;
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show errors
    const allFieldsTouched: Partial<Record<keyof FormData, boolean>> = {
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    };
    if (formData.accountType === 'organization') {
      allFieldsTouched.organizationName = true;
      allFieldsTouched.organizationSlug = true;
    }
    setTouched(allFieldsTouched);

    // Validate all fields
    if (!validateAllFields()) {
      setError('Please fix the errors below before submitting');
      return;
    }

    try {
      setStatus('loading');
      setError(null);

      const userData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        role: formData.accountType === 'organization' ? 'admin' : 'employee',
        organizationName: formData.accountType === 'organization' ? formData.organizationName : undefined,
        organizationSlug: formData.accountType === 'organization' ? formData.organizationSlug : undefined,
      };

      const { data, error } = await authService.signUp(userData);

      if (error) {
        throw error;
      }

      if (data) {
        setStatus('success');
        setShowSuccessAlert(true);
        setError(null);
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      setStatus('error');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const renderInputError = (field: keyof FormData) => {
    const error = validationErrors[field];
    if (!error || !touched[field]) return null;
    return (
      <div className="flex items-center mt-1 text-red-600 text-sm">
        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Removed onClick={handleClose} to prevent closing when clicking outside
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
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
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Account Type Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.label
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.accountType === 'personal'
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
                        <UserCircle className={`w-8 h-8 mb-2 ${
                          formData.accountType === 'personal' ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          formData.accountType === 'personal' ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          Personal
                        </span>
                      </div>
                    </motion.label>

                    <motion.label
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.accountType === 'organization'
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
                        <Building2 className={`w-8 h-8 mb-2 ${
                          formData.accountType === 'organization' ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          formData.accountType === 'organization' ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          Organization
                        </span>
                      </div>
                    </motion.label>
                  </div>
                </div>

                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        touched.name && validationErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  {renderInputError('name')}
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        touched.email && validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                  {renderInputError('email')}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        touched.password && validationErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Create a strong password"
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
                  {renderInputError('password')}
                  <div className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        touched.confirmPassword && validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {renderInputError('confirmPassword')}
                </div>

                {/* Organization Fields */}
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
                          Organization Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={formData.organizationName}
                            onChange={(e) => handleInputChange('organizationName', e.target.value)}
                            onBlur={() => handleBlur('organizationName')}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              touched.organizationName && validationErrors.organizationName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter organization name"
                            required={formData.accountType === 'organization'}
                          />
                        </div>
                        {renderInputError('organizationName')}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Slug <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            @
                          </span>
                          <input
                            type="text"
                            value={formData.organizationSlug}
                            onChange={(e) => handleInputChange('organizationSlug', e.target.value)}
                            onBlur={() => handleBlur('organizationSlug')}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              touched.organizationSlug && validationErrors.organizationSlug ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="organization-slug"
                            pattern="[a-z0-9\-]+"
                            required={formData.accountType === 'organization'}
                          />
                        </div>
                        {renderInputError('organizationSlug')}
                        <p className="text-xs text-gray-500 mt-1">
                          This will be your unique organization identifier (lowercase, numbers, and hyphens only)
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={status === 'loading'}
                  className={`w-full ${
                    status === 'success' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                  whileHover={{ scale: status === 'loading' ? 1 : 1.02 }}
                  whileTap={{ scale: status === 'loading' ? 1 : 0.98 }}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : status === 'success' ? (
                    'Success! Redirecting...'
                  ) : (
                    'Create Account'
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
