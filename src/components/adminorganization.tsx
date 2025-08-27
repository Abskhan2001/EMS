import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MapPinIcon, UsersIcon, FolderIcon } from '@heroicons/react/24/outline';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useUser } from '../contexts/UserContext';
import { getLocation, setLocation, updateLocation } from '../services/adminService';
import Swal from 'sweetalert2';

const AdminOrganization: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationExists, setLocationExists] = useState(false);
    const [locationData, setLocationData] = useState<{ longitude: string; latitude: string; radius: string; id?: string } | null>(null);
    const [organizationData, setOrganizationData] = useState<any>(null);
    const [userCount, setUserCount] = useState<number>(0);
    const [projectCount, setProjectCount] = useState<number>(0);
    const [clientCount, setClientCount] = useState<number>(0);
    const { userProfile } = useUser();

    useEffect(() => {
        const fetchOrganizationData = async () => {
            // Get organization ID from localStorage
            const organizationId = localStorage.getItem('organizationId');
            
            if (!organizationId) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Organization ID not found in local storage',
                    icon: 'error',
                    confirmButtonColor: '#D32F2F',
                });
                return;
            }

            try {
                const data = await getLocation(organizationId);
                if (data && data.length > 0) {
                    const locationInfo = data[0]; // Get the first location from array
                    setLocationExists(true);
                    setLocationData({
                        longitude: locationInfo.coordinates?.longitude?.toString() || '',
                        latitude: locationInfo.coordinates?.latitude?.toString() || '',
                        radius: locationInfo.radius?.toString() || '',
                        id: locationInfo._id || locationInfo.id
                    });
                } else {
                    setLocationExists(false);
                    setLocationData(null);
                }
            } catch (error: any) {
                console.error("Failed to fetch location", error);
                setLocationExists(false);
                setLocationData(null);
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to fetch location data',
                    icon: 'error',
                    confirmButtonColor: '#D32F2F',
                });
            }
        };

        fetchOrganizationData();
    }, [userProfile]);

    const closeModal = () => setIsOpen(false);
    const openModal = () => setIsOpen(true);

    const LocationSchema = Yup.object().shape({
        longitude: Yup.number()
            .required('Longitude is required')
            .typeError('Longitude must be a number')
            .min(-180, 'Longitude must be between -180 and 180')
            .max(180, 'Longitude must be between -180 and 180'),
        latitude: Yup.number()
            .required('Latitude is required')
            .typeError('Latitude must be a number')
            .min(-90, 'Latitude must be between -90 and 90')
            .max(90, 'Latitude must be between -90 and 90'),
        radius: Yup.number()
            .required('Radius is required')
            .typeError('Radius must be a number')
            .min(0, 'Radius must be a positive number')
    });

    const initialValues = locationData || {
        longitude: '',
        latitude: '',
        radius: ''
    };

    const handleSubmit = async (values: { longitude: string | number; latitude: string | number; radius: string | number }) => {
        // Get organization ID from localStorage
        const organizationId = localStorage.getItem('organizationId');
        
        if (!organizationId) {
            Swal.fire({
                title: 'Error!',
                text: 'Organization ID not found in local storage',
                icon: 'error',
                confirmButtonColor: '#D32F2F',
            });
            return;
        }

        setLoading(true);
        try {
            if (locationExists && locationData?.id) {
                // Update existing location using PUT API
                await updateLocation(locationData.id, {
                    coordinates: {
                        latitude: Number(values.latitude),
                        longitude: Number(values.longitude)
                    },
                    radius: Number(values.radius)
                });
            } else {
                // Create new location using POST API
                await setLocation({
                    organization_id: organizationId,
                    coordinates: {
                        latitude: Number(values.latitude),
                        longitude: Number(values.longitude)
                    },
                    radius: Number(values.radius)
                });
            }

            // Fetch the updated location data from the server
            const updatedLocationData = await getLocation(organizationId);
            
            if (updatedLocationData && updatedLocationData.length > 0) {
                const locationInfo = updatedLocationData[0];
                setLocationExists(true);
                setLocationData({
                    longitude: locationInfo.coordinates?.longitude?.toString() || '',
                    latitude: locationInfo.coordinates?.latitude?.toString() || '',
                    radius: locationInfo.radius?.toString() || '',
                    id: locationInfo._id || locationInfo.id
                });
            }

            Swal.fire({
                title: 'Success!',
                text: `Location ${locationExists ? 'updated' : 'set'} successfully.`,
                icon: 'success',
                confirmButtonColor: '#6B46C1',
            });

            closeModal();
        } catch (error: any) {
            Swal.fire({
                title: 'Error!',
                text: error?.response?.data?.message || error.message || 'An unknown error occurred.',
                icon: 'error',
                confirmButtonColor: '#D32F2F',
            });
            console.error('Error saving location:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = async (setFieldValue: any) => {
        if (!navigator.geolocation) {
            Swal.fire({
                title: 'Error!',
                text: 'Geolocation is not supported by your browser',
                icon: 'error',
                confirmButtonColor: '#D32F2F',
            });
            return;
        }

        setGettingLocation(true);

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;
                setFieldValue('longitude', longitude.toFixed(6));
                setFieldValue('latitude', latitude.toFixed(6));
                setGettingLocation(false);
                Swal.fire({
                    title: 'Success!',
                    text: 'Location detected successfully',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    confirmButtonColor: '#6B46C1',
                });
            },
            (error) => {
                setGettingLocation(false);
                let errorMessage = 'An unknown error occurred while getting location.';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                
                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#D32F2F',
                });
            },
            options
        );
    };

    return (
        <>
            <div className="bg-white rounded-md p-8 mt-4 mx-auto max-w-6xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Organization Detail</h2>
                        <p className="text-gray-500 mt-1">View and manage your organization details here</p>
                    </div>
                    <button
                        onClick={openModal}
                        className="ml-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition"
                    >
                        {locationExists ? '+ Update Location' : '+ Set Location'}
                    </button>
                </div>

                {organizationData && (
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Name</p>
                                <p className="text-base text-gray-900">{organizationData.name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Slug</p>
                                <p className="text-base text-gray-900">{organizationData.slug || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <p className="text-base text-gray-900">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${organizationData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {organizationData.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500">Description</p>
                            <p className="text-base text-gray-900">{organizationData.description || 'No description available'}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-purple-100 mr-4">
                                <UsersIcon className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Member</p>
                                <p className="text-2xl font-bold text-gray-900">{userCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-100 mr-4">
                                <FolderIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                                <p className="text-2xl font-bold text-gray-900">{projectCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-100 mr-4">
                                <UsersIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                                <p className="text-2xl font-bold text-gray-900">{clientCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => {}} static>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                                    <div className="flex items-center justify-between mb-6">
                                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                            {locationExists ? 'Update Location' : 'Set Location'}
                                        </Dialog.Title>
                                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                            <XMarkIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                    <Formik
                                        key={locationData ? 'edit-form' : 'new-form'}
                                        initialValues={initialValues}
                                        validationSchema={LocationSchema}
                                        onSubmit={handleSubmit}
                                        enableReinitialize
                                    >
                                        {({ errors, touched, setFieldValue }) => (
                                            <Form>
                                                <div className="mb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => getCurrentLocation(setFieldValue)}
                                                        disabled={gettingLocation}
                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-purple-600 text-purple-600 font-medium ${gettingLocation
                                                            ? 'opacity-70 cursor-not-allowed bg-purple-50'
                                                            : 'hover:bg-purple-50 hover:text-purple-700'
                                                            }`}
                                                    >
                                                        <MapPinIcon className="h-5 w-5" />
                                                        {gettingLocation ? 'Getting Location...' : 'Set My Location'}
                                                    </button>
                                                </div>

                                                <div className="relative mb-4">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <div className="w-full border-t border-gray-300"></div>
                                                    </div>
                                                    <div className="relative flex justify-center text-sm">
                                                        <span className="px-2 bg-white text-gray-500">Or enter manually</span>
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Longitude
                                                    </label>
                                                    <Field
                                                        name="longitude"
                                                        type="text"
                                                        className={`w-full border ${errors.longitude && touched.longitude ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                        placeholder="Enter longitude"
                                                    />
                                                    <ErrorMessage name="longitude" component="div" className="text-red-500 text-sm mt-1" />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Latitude
                                                    </label>
                                                    <Field
                                                        name="latitude"
                                                        type="text"
                                                        className={`w-full border ${errors.latitude && touched.latitude ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                        placeholder="Enter latitude"
                                                    />
                                                    <ErrorMessage name="latitude" component="div" className="text-red-500 text-sm mt-1" />
                                                </div>
                                                <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Radius (in meters)
                                                    </label>
                                                    <Field
                                                        name="radius"
                                                        type="text"
                                                        className={`w-full border ${errors.radius && touched.radius ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                        placeholder="Enter radius"
                                                    />
                                                    <ErrorMessage name="radius" component="div" className="text-red-500 text-sm mt-1" />
                                                </div>
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={closeModal}
                                                        className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={loading || gettingLocation}
                                                        className={`px-4 py-2 rounded-md bg-purple-600 text-white font-semibold ${loading || gettingLocation
                                                            ? 'opacity-70 cursor-not-allowed'
                                                            : 'hover:bg-purple-700'
                                                            }`}
                                                    >
                                                        {loading ? 'Saving...' : (locationExists ? 'Update Location' : 'Set Location')}
                                                    </button>
                                                </div>
                                            </Form>
                                        )}
                                    </Formik>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default AdminOrganization;