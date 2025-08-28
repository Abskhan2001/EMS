import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { 
  fetchProjects, 
  setView, 
  setGroupBy, 
  setFilters,
  deleteExistingProject 
} from '../slices/projectsSlice';
import { fetchEmployees } from '../slices/employeeSlice';
import { fetchClients } from '../slices/clientsSlice';
import { FiSearch, FiPlus, FiEdit, FiTrash2, FiCalendar } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Swal from 'sweetalert2';
import ProjectFormModal from '../components/ProjectFormModal';

const AdminProjects: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    projects, 
    loading, 
    error, 
    view, 
    groupBy, 
   
  } = useSelector((state: RootState) => state.projects);
  
  const { employees } = useSelector((state: RootState) => state.employee);
  const { clients } = useSelector((state: RootState) => state.clients);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState('All');

  useEffect(() => {
    console.log('Fetching data...');
    dispatch(fetchProjects()).catch(err => console.error('Failed to fetch projects:', err));
    dispatch(fetchEmployees()).catch(err => console.error('Failed to fetch employees:', err));
    dispatch(fetchClients()).catch(err => console.error('Failed to fetch clients:', err));
  }, [dispatch]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    dispatch(setFilters({ search: term }));
  };

  const handleViewChange = (newView: 'card' | 'table') => {
    dispatch(setView(newView));
  };

  const handleGroupByChange = (newGroupBy: 'all' | 'employees' | 'managers') => {
    dispatch(setGroupBy(newGroupBy));
  };

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter);

    // Implement time-based filtering logic
    const now = new Date();
    let dateFilter: any = {};

    if (filter === 'Weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: weekAgo.toISOString() };
    } else if (filter === 'Monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: monthAgo.toISOString() };
    }

    dispatch(setFilters(dateFilter));
  };

  const handleCreateProject = () => {
    // Ensure data is loaded before opening modal
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }
    if (clients.length === 0) {
      dispatch(fetchClients());
    }

    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: any) => {
    // Ensure data is loaded before opening modal
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }
    if (clients.length === 0) {
      dispatch(fetchClients());
    }

    console.log('Editing project:', project);
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteExistingProject(projectId)).unwrap();
        Swal.fire({
          title: 'Deleted!',
          text: 'Project has been deleted successfully.',
          icon: 'success',
          confirmButtonColor: '#6B46C1',
        });
      } catch (error) {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete project.',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      }
    }
  };

  // const getProjectTypeColor = (type: string) => {
  //   switch (type) {
  //     case 'frontend': return 'bg-blue-100 text-blue-800';
  //     case 'backend': return 'bg-green-100 text-green-800';
  //     case 'fullstack': return 'bg-purple-100 text-purple-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'planning': return 'bg-yellow-100 text-yellow-800';
  //     case 'active': return 'bg-green-100 text-green-800';
  //     case 'on_hold': return 'bg-orange-100 text-orange-800';
  //     case 'completed': return 'bg-blue-100 text-blue-800';
  //     case 'cancelled': return 'bg-red-100 text-red-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  // const getPriorityColor = (priority: string) => {
  //   switch (priority) {
  //     case 'low': return 'bg-green-100 text-green-800';
  //     case 'medium': return 'bg-yellow-100 text-yellow-800';
  //     case 'high': return 'bg-orange-100 text-orange-800';
  //     case 'urgent': return 'bg-red-100 text-red-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  const filteredProjects = projects.filter(project => {
    // Search filter
    if (searchTerm) {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Time filter
    if (timeFilter !== 'All') {
      const projectDate = new Date(project.createdAt);
      const now = new Date();

      if (timeFilter === 'Weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (projectDate < weekAgo) return false;
      } else if (timeFilter === 'Monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (projectDate < monthAgo) return false;
      }
    }

    return true;
  });

  const getGroupedData = () => {
    if (groupBy === 'employees') {
      // Group projects by team members
      const employeeProjects: { [key: string]: { employee: any; projects: any[] } } = {};

      filteredProjects.forEach(project => {
        if (project.teamMembers && Array.isArray(project.teamMembers)) {
          project.teamMembers.forEach(member => {
            if (member?.userId?._id) {
              const employeeId = member.userId._id;
              if (!employeeProjects[employeeId]) {
                employeeProjects[employeeId] = {
                  employee: member.userId,
                  projects: []
                };
              }
              employeeProjects[employeeId].projects.push(project);
            }
          });
        }
      });

      return Object.values(employeeProjects).filter(item => item.employee && item.employee._id);
    } else if (groupBy === 'managers') {
      // Group projects by managers
      const managerProjects: { [key: string]: { manager: any; projects: any[] } } = {};

      filteredProjects.forEach(project => {
        const managerId = project.projectManager?._id || 'unassigned';
        const manager = project.projectManager || { fullName: 'Unassigned', _id: 'unassigned', email: '' };

        if (!managerProjects[managerId]) {
          managerProjects[managerId] = {
            manager: manager,
            projects: []
          };
        }
        managerProjects[managerId].projects.push(project);
      });

      return Object.values(managerProjects).filter(item => item.manager && item.manager._id);
    }

    return filteredProjects;
  };

  const groupedData = getGroupedData();

  const getProjectStats = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalDevelopers = new Set(
      projects.flatMap(p => p.teamMembers.map(tm => tm.userId._id))
    ).size;

    return { totalProjects, activeProjects, completedProjects, totalDevelopers };
  };

  const stats = getProjectStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        <span className="ml-3">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error loading projects</div>
          <div className="text-gray-500 text-sm">{error}</div>
          <button
            onClick={() => {
              dispatch(fetchProjects());
              dispatch(fetchEmployees());
              dispatch(fetchClients());
            }}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
          <p className="text-gray-600 mt-1">Manage and track your organization's projects</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleViewChange('card')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              view === 'card' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Card View
          </button>
          <button
            onClick={() => handleViewChange('table')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              view === 'table' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Table View
          </button>
          <button
            onClick={handleCreateProject}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
          >
            <FiPlus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={groupBy}
            onChange={(e) => handleGroupByChange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">View Projects</option>
            <option value="employees">View by Employees</option>
            <option value="managers">View by Managers</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => handleTimeFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="All">All</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">free: {stats.totalDevelopers} developers</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Fair Load: {stats.activeProjects} developers</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Normal Load: {stats.completedProjects} developers</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Overloaded: 1 developers</span>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No projects yet. Create one!</div>
        </div>
      ) : groupBy === 'employees' ? (
        <div className="space-y-6">
          {(groupedData as any[]).filter(item => item?.employee?._id).map((item: any) => (
            <div key={item.employee._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {item.employee?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.employee?.fullName || 'Unknown Employee'}</h3>
                  <p className="text-sm text-gray-500">{item.employee?.email || 'No email'}</p>
                  <p className="text-xs text-gray-400">employee</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{item.projects.length} projects</h4>
                <div className="space-y-2">
                  {item.projects.slice(0, 3).map((project: any) => (
                    <div key={project._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <div className="font-medium text-sm">{project.name}</div>
                        <div className="text-xs text-gray-500">
                          Progress: {project.progress?.percentage || 0}% | Pending: {100 - (project.progress?.percentage || 0)}%
                        </div>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${project.progress?.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {item.projects.length > 3 && (
                    <button className="text-purple-600 text-sm hover:text-purple-800">
                      Show More... ({item.projects.length - 3} more)
                    </button>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {item.projects.reduce((total: number, p: any) => total + (p.progress?.percentage || 0), 0)} / {item.projects.length * 100}
                </div>
                <div className="text-xs text-gray-500">
                  Completed: {item.projects.reduce((total: number, p: any) => total + (p.progress?.percentage || 0), 0)} |
                  Pending: {(item.projects.length * 100) - item.projects.reduce((total: number, p: any) => total + (p.progress?.percentage || 0), 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groupBy === 'managers' ? (
        <div className="space-y-6">
          {(groupedData as any[]).filter(item => item?.manager?._id).map((item: any) => (
            <div key={item.manager._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {item.manager?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.manager?.fullName || 'Unknown Manager'}</h3>
                  <p className="text-sm text-gray-500">{item.manager?.email || 'No email'}</p>
                  <p className="text-xs text-gray-400">manager</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{item.projects.length} projects</h4>
                <div className="space-y-2">
                  {item.projects.slice(0, 3).map((project: any) => (
                    <div key={project._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <div className="font-medium text-sm">{project.name}</div>
                        <div className="text-xs text-gray-500">
                          Progress: {project.progress?.percentage || 0}% | Pending: {100 - (project.progress?.percentage || 0)}%
                        </div>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${project.progress?.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {item.projects.length > 3 && (
                    <button className="text-purple-600 text-sm hover:text-purple-800">
                      Show More... ({item.projects.length - 3} more)
                    </button>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {item.projects.reduce((total: number, p: any) => total + (p.progress?.percentage || 0), 0)} / {item.projects.length * 100}
                </div>
                <div className="text-xs text-gray-500">
                  Completed: {item.projects.reduce((total: number, p: any) => total + (p.progress?.percentage || 0), 0)} |
                  Pending: {(item.projects.length * 100) - item.projects.reduce((total: number, p: any) => total + (p.progress?.percentage || 0), 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.filter(project => project && project._id).map(project => (
            <div key={project._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-4xl font-semibold text-gray-900 truncate">{project.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditProject(project)}
                    className="text-gray-400 hover:text-purple-600 transition"
                  >
                    <FiEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project._id)}
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project.projectType)}`}>
                    {project.projectType}
                  </span>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div> */}

                {/* {project.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                )} */}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {/* <div className="flex items-center gap-1">
                    <FiUsers className="h-4 w-4" />
                    <span>{project.teamMembers.length} members</span>
                  </div> */}
                  <div className="flex items-center gap-1">
                    <FiCalendar className="h-4 w-4" />
                    <span>{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {project.projectManager && (
                  <div className="text-sm">
                    <span className="text-blue-700 text-lg font-semibold">Manager: </span>
                    <span className="font-medium text-gray-900">{project.projectManager.fullName}</span>
                  </div>
                )}

                {project.teamMembers.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-600 text-lg">Developers: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.teamMembers.slice(0, 3).map(member => (
                        <span key={member.userId._id} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {member.userId.fullName}
                        </span>
                      ))}
                      {project.teamMembers.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{project.teamMembers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* {project.progress && (
                  <div className="text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{project.progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )} */}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Developers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Story Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.filter(project => project && project._id).map(project => (
                  <tr key={project._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        <div className="flex gap-1 mt-1">
                          {/* <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project.projectType)}`}>
                            {project.projectType}
                          </span> */}
                          {/* <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.projectManager?.fullName || 'Not assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {project.teamMembers.slice(0, 2).map(member => (
                          <span key={member.userId._id} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {member.userId.fullName}
                          </span>
                        ))}
                        {project.teamMembers.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{project.teamMembers.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.progress ? `${project.progress.percentage}%` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <FiEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Form Modal */}
      {isModalOpen && (
        <ProjectFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProject(null);
            // Refresh projects after modal closes
            dispatch(fetchProjects());
          }}
          project={editingProject}
          employees={employees}
          clients={clients}
        />
      )}
    </div>
  );
};

export default AdminProjects;
