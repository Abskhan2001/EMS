import React, { useState, useEffect, useRef, useContext } from 'react';
import Employeeprofile from './Employeeprofile';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { addEmployee, getEmployeesByOrganization } from '../services/adminService';
import axios from 'axios';

import {
  FiPlus,
  FiTrash2,
  FiX,
  FiPlusSquare,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { AttendanceContext } from './AttendanceContext';
import TaskBoardAdmin from '../components/TaskBoardAdmin';
import { useUser } from '../contexts/UserContext';
import { useNavigate, useParams } from 'react-router-dom';

interface Employee {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  hireDate?: string;
  projects?: any[];
  TotalKPI?: number;
  role?: string;
  rating?: number;
  daily_log?: string | null;
}

interface Project {
  id: string;
  title: string;
  devops: any[];
}

const EmployeesDetails = () => {

  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { userProfile } = useUser();
  const [loading, setLoading] = useState<boolean>(true);
  const [employeeview, setEmployeeView] = useState<
    'generalview' | 'detailview'
  >('generalview');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [assignment, setAssignment] = useState({
    title: '',
    project: '',
    description: '',
    score: '',
  });

  const [selectedTAB, setSelectedTAB] = useState('');
  const [performancePeriod, setPerformancePeriod] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [showPerformanceMenu, setShowPerformanceMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllProjects, setShowAllProjects] = useState<{
    [key: string]: boolean;
  }>({});
  const [showLogModal, setShowLogModal] = useState(false);
  const [modalLogText, setModalLogText] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<FormDataType>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);



  const { openTaskBoard } = useContext(AttendanceContext);
  const formRef = useRef<HTMLFormElement>(null);

  // Custom function to handle task board navigation
  const handleOpenTaskBoard = (projectId: string, devops: any[]) => {
    setProjectId(projectId);
    setDevopss(devops);
    setSelectedTAB('TaskBoard');
  };

  // Form states
  const [signupData, setSignupData] = useState({
    email: '',
  });

  // Restore needed state variables for TaskBoardAdmin and employee selection
  const [devopss, setDevopss] = useState<any[]>([]);
  const [ProjectId, setProjectId] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Ensure formData uses the FormDataType with index signature
  type FormDataType = {
    full_name: string;
    role: string;
    phone: string;
    email: string;
    personal_email: string;
    location: string;
    profession: string;
    per_hour_pay: string;
    salary: string;
    slack_id: string;
    joining_date: string;
    profile_image: File | null;
    [key: string]: any;
  };
  const [formData, setFormData] = useState<FormDataType>({
    full_name: '',
    role: 'employee',
    phone: '',
    email: '',
    personal_email: '',
    location: '',
    profession: '',
    per_hour_pay: '',
    salary: '',
    slack_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    profile_image: null,
  });

  // Function to handle opening daily log modal
  const handleLogClick = (logText: string) => {
    setModalLogText(logText);
    setShowLogModal(true);
  };

  // Function to handle profile navigation
  const handleProfileClick = (employee: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmployee(employee);
    setEmployeeId(employee.id);
    setEmployeeView('detailview');
  };

  // Function to handle opening check-out message modal
  const handleCheckOutClick = (checkOutMessage: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalLogText(checkOutMessage || "didn't update tasks");
    setShowLogModal(true);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        const employeesData = await getEmployeesByOrganization(organizationId);
        setEmployees(employeesData);
      } else {
        toast.error('Organization ID not found.');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Employee form handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (name === 'salary' || name === 'per_hour_pay') {
      const decimalValue = value.replace(/[^0-9.]/g, '');
      setFormData((prev) => ({ ...prev, [name]: decimalValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const errors = { ...formErrors };
    const optionalFields = ['personal_email', 'slack_id', 'per_hour_pay'];

    if (!optionalFields.includes(name) && !value) {
      errors[name] = 'This field is required';
    } else {
      delete errors[name];
    }

    setFormErrors(errors);
  };


  const handleSubmitEmployeeInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<FormDataType> = {};
    const requiredFields: (keyof FormDataType)[] = [
      'full_name',
      'role',
      'phone',
      'email',
      'location',
      'profession',
      'salary',
      'joining_date',
    ];

    requiredFields.forEach((field) => {
      if (!formData[field]) {
        errors[field] = 'This field is required';
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const employeeData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'profile_image' && formData.profile_image) {
          employeeData.append('profile_image', formData.profile_image);
        } else {
          employeeData.append(key, formData[key]);
        }
      });
      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        employeeData.append('organization_id', organizationId);
      }

      await addEmployee(employeeData);

      resetForm();
      setShowForm(false);
      fetchEmployees();
      Swal.fire({
        icon: 'success',
        title: 'Employee Created!',
        text: 'An email has been sent to the employee to set their password.',
        confirmButtonText: 'OK'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.response?.data?.message || 'Failed to create employee',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // const navigate = useNavigate();
  const resetForm = () => {
    setFormData({
      full_name: '',
      role: 'employee',
      phone: '',
      email: '',
      personal_email: '',
      location: '',
      profession: '',
      per_hour_pay: '',
      salary: '',
      slack_id: '',
      joining_date: new Date().toISOString().split('T')[0],
      profile_image: null,
    });
    setSignupData({ email: '' });
    if (formRef.current) formRef.current.reset();
  };

  const Loader = () => (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
      <svg
        className="animate-spin h-14 w-14 text-[#9A00FF]"
        viewBox="0 0 50 50"
      >
        <circle
          className="opacity-20"
          cx="25"
          cy="25"
          r="20"
          stroke="#9A00FF"
          strokeWidth="6"
          fill="none"
        />
        <path
          className="opacity-80"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="65, 150"
          d="M25 5
             a 20 20 0 0 1 0 40
             a 20 20 0 0 1 0 -40"
        />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9A00FF" />
            <stop offset="100%" stopColor="#5A00B4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pt-4 text-[#9A00FF] font-semibold text-lg animate-pulse">
        Loading employees...
      </div>
    </div>
  );

  const handleCancel = () => {
    resetForm();
    setFormErrors({});
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const token = JSON.parse(localStorage.getItem('user') || '{}').token;
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      toast.success('Employee deleted successfully');
    } catch (err) {
      console.error('Error deleting employee:', err);
      toast.error('Failed to delete employee');
    }
  };

  // Log Modal Component
  const LogModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={() => setShowLogModal(false)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Daily Log</h2>
          <button
            onClick={() => setShowLogModal(false)}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="text-gray-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded-lg border">
          {modalLogText}
        </div>
      </div>
    </div>
  );



  // Inline StarDisplay component for ratings
  const StarDisplay: React.FC<{
    rating: number;
    size?: 'sm' | 'md' | 'lg';
  }> = ({ rating, size = 'sm' }) => {
    const getStarColor = (rating: number) => {
      if (rating <= 2) return 'text-red-400 fill-red-400';
      if (rating <= 4) return 'text-yellow-400 fill-yellow-400';
      return 'text-green-400 fill-green-400';
    };
    const getStarSize = (size: string) => {
      switch (size) {
        case 'sm':
          return 'w-3 h-3';
        case 'md':
          return 'w-4 h-4';
        case 'lg':
          return 'w-5 h-5';
        default:
          return 'w-3 h-3';
      }
    };
    return (
      <div className="flex items-center justify-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`${getStarSize(size)} ${
              i <= rating
                ? getStarColor(rating)
                : 'text-gray-300  fill-gray-300'
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
          </svg>
        ))}
      </div>
    );
  };

  // Render methods
  const renderEmployeeForm = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Add New Employee</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmitEmployeeInfo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                />
                {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
              </div>
              {Object.entries(formData).map(
                ([field, value]) =>
                  field !== 'profile_image' &&
                  field !== 'email' && (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {field.replace(/_/g, ' ')}
                      </label>
                      {field === 'role' ? (
                        <select
                          name={field}
                          value={value as string}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                        >
                          <option value="employee">Member</option>
                          <option value="manager">Project Manager</option>
                          <option value="admin">Admin</option>
                          <option value="client">Client</option>
                        </select>
                      ) : (
                        <input
                          type={
                            field === 'joining_date'
                              ? 'date'
                              : field === 'phone'
                              ? 'tel'
                              : 'text'
                          }
                          name={field}
                          value={value as string}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                        />
                      )}
                      {formErrors[field] && <p className="text-red-500 text-xs">{formErrors[field]}</p>}
                    </div>
                  )
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Image
                </label>
                <input
                  type="file"
                  name="profile_image"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      profile_image:
                        e.target.files && e.target.files[0]
                          ? e.target.files[0]
                          : null,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="   min-h-screen bg-gray-50 p-4 sm:p-6 ">
      {selectedTAB === 'TaskBoard' ? (
        <TaskBoardAdmin
          devopss={devopss}
          ProjectId={ProjectId}
          setSelectedTAB={setSelectedTAB}
          selectedTAB={selectedTAB}
        />
      ) : (
        <>
          {showForm && renderEmployeeForm()}
          {showLogModal && <LogModal />}

          {employeeview === 'detailview' ? (
            <Employeeprofile
              employeeid={employeeId}
              employeeview={employeeview}
              employee={currentEmployee}
              setemployeeview={setEmployeeView}
            />
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="">
                {/* <form className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">Team Management</h1>
                      <p className="text-gray-500 mt-1">View and manage your team members</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        name="password"
                        value={signupData.password}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#9A00FF] text-white hover:bg-[#8a00e6] transition-colors shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                </form> */}

              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-7xl mx-auto  ">
            {/* General Employee View */}
            {employeeview === 'generalview' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">
                        Team Management
                      </h1>
                      <p className="text-gray-500 mt-1">
                        View and manage your team members
                      </p>
                    </div>


                    
                    <div className="flex items-center gap-3">
                      <div className="relative w-48">
                        <input
                          type="text"
                          placeholder="Search employees..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A00FF] focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9A00FF] hover:bg-[#8a00e6] text-white text-sm font-medium transition-colors shadow-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                        <span>Add Employee</span>
                      </button>
                    </div>
                  </div>
                </div>

           

                {loading ? (
                  <Loader />
                ) : (
                  <div className="w-full ">
                    <div className="hidden md:block w-full">
                      <div className="w-full inline-block align-middle">
                        <div className="overflow-x-auto ">
                          <table className="w-full divide-y divide-gray-200 table-auto">
                            <thead className="bg-gray-50">
                              <tr className="">
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Employee
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Joined
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Phone
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Projects
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Workload
                                </th>
                                <th className="py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                                  Daily Log
                                </th>
                                <th
                                  scope="col"
                                  className="  px-4 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {/* <ul>
                                    <li>
                                      <ArrowLeft />
                                    </li>
                                  </ul> */}
                                  Performance
                                  <div className="relative inline-block text-left ml-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowPerformanceMenu((v) => !v)
                                      }
                                      className="inline-flex justify-center w-[120px] rounded-md border border-gray-300 shadow-sm px-2 py-1 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
                                      id="performance-menu"
                                      aria-haspopup="true"
                                      aria-expanded={showPerformanceMenu}
                                    >
                                      {performancePeriod
                                        .charAt(0)
                                        .toUpperCase() +
                                        performancePeriod.slice(1)}{' '}
                                      ▼
                                    </button>
                                    {showPerformanceMenu && (
                                      <div className="origin-top-right absolute right-0  w-28 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                        <div
                                          className="py-1"
                                          role="menu"
                                          aria-orientation="vertical"
                                          aria-labelledby="performance-menu"
                                        >
                                          <button
                                            onClick={() => {
                                              setPerformancePeriod('daily');
                                              setShowPerformanceMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-xs ${
                                              performancePeriod === 'daily'
                                                ? 'bg-gray-100'
                                                : ''
                                            }`}
                                          >
                                            Daily
                                          </button>
                                          <button
                                            onClick={() => {
                                              setPerformancePeriod('weekly');
                                              setShowPerformanceMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-xs ${
                                              performancePeriod === 'weekly'
                                                ? 'bg-gray-100'
                                                : ''
                                            }`}
                                          >
                                            Weekly
                                          </button>
                                          <button
                                            onClick={() => {
                                              setPerformancePeriod('monthly');
                                              setShowPerformanceMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-xs ${
                                              performancePeriod === 'monthly'
                                                ? 'bg-gray-100'
                                                : ''
                                            }`}
                                          >
                                            Monthly
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {/* <ul>
                                    <li>
                                      <ArrowRight />{" "}
                                    </li>
                                  </ul> */}
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 lg:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {employees
                                .filter(
                                  (entry) =>
                                    entry.fullName
                                      ?.toLowerCase()
                                      .includes(searchQuery.toLowerCase()) ||
                                    entry.email
                                      ?.toLowerCase()
                                      .includes(searchQuery.toLowerCase())
                                )
                                .map((entry) => {
                                  return (
                                    <tr
                                      key={entry._id}
                                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                                      onClick={() => {
                                        setEmployee(entry);
                                        setEmployeeId(entry._id);
                                        setEmployeeView('detailview');
                                      }}
                                    >
                                      <td className="px-4 lg:px-2 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                          <div className="h-9 w-9 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium text-xs">
                                            {entry.fullName?.charAt(0) || '?'}
                                          </div>
                                          <div>
                                            <div className="font-semibold text-gray-800 text-sm">
                                              {entry.fullName || 'N/A'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {entry.email || 'N/A'}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.hireDate
                                          ? new Date(
                                              entry.hireDate
                                            ).toLocaleDateString()
                                          : 'N/A'}
                                      </td>
                                      <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.phoneNumber || 'N/A'}
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {entry.projects &&
                                        entry.projects.length > 0 ? (
                                          <div className="flex flex-wrap gap-1.5 ">
                                            {(showAllProjects[entry.id]
                                              ? entry.projects
                                              : entry.projects.slice(0, 2)
                                            ).map((project: any) => (
                                              <button
                                                key={project.id}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenTaskBoard(
                                                    project.id,
                                                    project.devops
                                                  );
                                                }}
                                                className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                              >
                                                {project.title}
                                              </button>
                                            ))}
                                            {entry.projects.length > 2 && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowAllProjects(
                                                    (prev) => ({
                                                      ...prev,
                                                      [entry.id]:
                                                        !prev[entry.id],
                                                    })
                                                  );
                                                }}
                                                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                              >
                                                {showAllProjects[entry.id]
                                                  ? 'Show Less'
                                                  : `+${
                                                      entry.projects.length - 2
                                                    }`}
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-xs text-gray-400">
                                            Not assigned
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                                        <span className="font-medium ">
                                          {entry.TotalKPI ?? 0}
                                        </span>
                                      </td>
                                      <td className="px-4 lg:px-1 py-4 text-[8px] text-gray-700 max-w-xs">
                                        <div
                                          className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-all"
                                          onClick={(e) => handleCheckOutClick(entry.daily_log || "didn't update tasks", e)}
                                          title="Click to view full message"
                                        >
                                          <div className="text-gray-700 truncate">
                                            {entry.daily_log && entry.daily_log.length > 50
                                              ? entry.daily_log.substring(0, 50) + '...'
                                              : entry.daily_log || "didn't update tasks"}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-center">
                                        <StarDisplay
                                          rating={
                                            typeof entry.rating === 'number'
                                              ? entry.rating
                                              : 0
                                          }
                                          size="md"
                                        />
                                      </td>
                                      <td className="px-4 lg:px-4 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(entry.id);
                                            }}
                                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                            title="Delete"
                                          >
                                            <FiTrash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Mobile card view - shown only on small screens */}
                    <div className="md:hidden">
                      {employees
                        .filter(
                          (entry) =>
                            entry.full_name
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            entry.email
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase())
                        )
                        .map((entry) => {
                          return (
                            <div
                              key={entry.id}
                              className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden border border-gray-200"
                            >
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <button
                                    onClick={() => {
                                      setEmployee(entry);
                                      setEmployeeId(entry.id);
                                      setEmployeeView('detailview');
                                    }}
                                    className="flex items-center gap-3 group"
                                  >
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium text-xs">
                                      {entry.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div className="text-left">
                                      <div className="font-semibold text-gray-800 text-sm">
                                        {entry.full_name || 'N/A'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {entry.email || 'N/A'}
                                      </div>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(entry.id);
                                      }}
                                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                      title="Delete"
                                    >
                                      <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="space-y-0.5">
                                    <p className="text-gray-500 font-medium">
                                      Joined
                                    </p>
                                    <p className="text-gray-700 truncate font-semibold max-w-[120px] ">
                                      {entry.joining_date &&
                                      entry.joining_date !== 'NA'
                                        ? new Date(
                                            entry.joining_date
                                          ).toLocaleDateString()
                                        : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-gray-500 font-medium">
                                      Projects
                                    </p>
                                    {entry.projects &&
                                    entry.projects.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        {(showAllProjects[entry.id]
                                          ? entry.projects
                                          : entry.projects.slice(0, 2)
                                        ).map((project: any) => (
                                          <button
                                            key={project.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenTaskBoard(
                                                project.id,
                                                project.devops
                                              );
                                            }}
                                            className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                          >
                                            {project.title}
                                          </button>
                                        ))}
                                        {entry.projects.length > 2 && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowAllProjects((prev) => ({
                                                ...prev,
                                                [entry.id]: !prev[entry.id],
                                              }));
                                            }}
                                            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                          >
                                            {showAllProjects[entry.id]
                                              ? 'Show Less'
                                              : `+${entry.projects.length - 2}`}
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">
                                        Not assigned
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5 flex ">
                                    <p className="text-gray-500 font-medium">
                                      Workload
                                    </p>
                                    <span className="text-xs font-medium">
                                      {entry.TotalKPI ?? 0}
                                    </span>
                                  </div>
                                  <div className="col-span-2 space-y-0.5">
                                    <p className="text-gray-500 font-medium">
                                      Daily Log
                                    </p>
                                    <div
                                      className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-all"
                                      onClick={(e) => handleCheckOutClick(entry.daily_log || "didn't update tasks", e)}
                                      title="Click to view full message"
                                    >
                                      <div className="text-gray-700 text-xs truncate">
                                        {entry.daily_log && entry.daily_log.length > 50
                                          ? entry.daily_log.substring(0, 50) + '...'
                                          : entry.daily_log || "didn't update tasks"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-gray-500 font-medium">
                                      Performance
                                    </p>
                                    <StarDisplay
                                      rating={
                                        typeof entry.rating === 'number'
                                          ? entry.rating
                                          : 0
                                      }
                                      size="md"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeesDetails;
