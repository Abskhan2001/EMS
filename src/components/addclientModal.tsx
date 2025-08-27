import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { addClient } from '../services/adminService';
import Swal from 'sweetalert2';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: (newClient?: any) => void;
}

const validationSchema = Yup.object({
  fullName: Yup.string()
    .min(2, 'Full name must be at least 2 characters')
    .required('Full name is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .optional(),
  location: Yup.string().optional(),
  joiningDate: Yup.date().optional(),
});

const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onClientAdded,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const initialValues = {
    fullName: '',
    phone: '',
    email: '',
    location: '',
     joiningDate: new Date().toISOString().split("T")[0],
    profileImage: undefined as File | undefined,
  };

  // Reset all state variables when modal is closed
  const handleClose = () => {
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    setIsLoading(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      // Prepare client data for API call
      const clientData = {
        full_name: values.fullName,
        email: values.email,
        phone: values.phone,
        location: values.location,
        joining_date: values.joiningDate || today,
        profile_image: values.profileImage,
      };

      console.log('Submitting client data:', clientData);

      // Call the API service
      const response = await addClient(clientData);
      console.log('Client created successfully:', response);

      // Show success message with SweetAlert2
      await Swal.fire({
        icon: 'success',
        title: 'Client Added Successfully!',
        html: `
          <div class="text-left">
            <p class="mb-2"><strong>${values.fullName}</strong> has been added as a client.</p>
            <p class="text-sm text-gray-600">📧 An email has been sent to <strong>${values.email}</strong></p>
            <p class="text-sm text-gray-600">🔐 The client can set their password using the link in the email.</p>
          </div>
        `,
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#8b5cf6',
        timer: 8000,
        timerProgressBar: true,
      });

      // Reset form and close modal
      resetForm();
      handleClose();
      if (onClientAdded) {
        onClientAdded(response.data || response);
      }

    } catch (error: any) {
      console.error('Error creating client:', error);
      
      // Handle different types of errors
      let errorTitle = 'Failed to Add Client';
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.response?.status === 409) {
        errorTitle = 'Email Already Exists';
        errorMessage = 'This email is already registered. Please use a different email address.';
      } else if (error.response?.status === 400) {
        errorTitle = 'Invalid Data';
        errorMessage = error.response.data?.message || 'Please check your input and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error with SweetAlert2
      Swal.fire({
        icon: 'error',
        title: errorTitle,
        text: errorMessage,
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={handleClose}
          disabled={isLoading}
        >
          <FiX size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Add New Client</h2>
        <div className="h-1 w-full bg-purple-500 mb-6" />

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ setFieldValue, errors, touched, values }) => (
            <Form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Field
                    type="text"
                    name="fullName"
                    placeholder="Enter client's full name"
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.fullName && touched.fullName
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <ErrorMessage
                    name="fullName"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Field
                    type="email"
                    name="email"
                    placeholder="client@example.com"
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.email && touched.email 
                        ? 'border-red-500' 
                        : 'border-gray-300'
                    }`}
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Field
                    type="text"
                    name="phone"
                    placeholder="+1 (555) 123-4567"
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.phone && touched.phone 
                        ? 'border-red-500' 
                        : 'border-gray-300'
                    }`}
                  />
                  <ErrorMessage
                    name="phone"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <Field
                    type="text"
                    name="location"
                    placeholder="City, Country"
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      errors.location && touched.location
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <ErrorMessage
                    name="location"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joining Date
                  </label>
                  <Field
  type="date"
  name="joiningDate"
  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
    errors.joiningDate && touched.joiningDate
      ? 'border-red-500'
      : 'border-gray-300'
  }`}
/>

                  <ErrorMessage
                    name="joiningDate"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                {/* Profile Image */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Image
                  </label>
                  <input
                    type="file"
                    name="profileImage"
                    accept="image/*"
                    onChange={(e) =>
                      setFieldValue('profileImage', e.target.files?.[0])
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                  </p>
                  {values.profileImage && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {values.profileImage.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end mt-8 space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  className="px-6 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-2 rounded-md bg-purple-600 text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors ${
                    isLoading
                      ? 'opacity-70 cursor-not-allowed'
                      : 'hover:bg-purple-700'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Adding Client...
                    </div>
                  ) : (
                    'Add Client'
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddClientModal;