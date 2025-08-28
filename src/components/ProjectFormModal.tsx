import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { createNewProject, updateExistingProject } from '../slices/projectsSlice';
import { FiX, FiChevronDown } from 'react-icons/fi';
import { Employee } from '../slices/employeeSlice';
import { Client } from '../slices/clientsSlice';
import Swal from 'sweetalert2';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any;
  employees: Employee[];
  clients: Client[];
}

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  project,
  employees,
  clients
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectType: 'fullstack' as 'frontend' | 'backend' | 'fullstack',
    projectManager: '' as string | null,
    projectClient: '' as string | null,
    teamMembers: [] as Array<{userId: string}>,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const [selectedManager, setSelectedManager] = useState<Employee | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDevelopers, setSelectedDevelopers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [managerSearch, setManagerSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [developerSearch, setDeveloperSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showDeveloperDropdown, setShowDeveloperDropdown] = useState(false);

  // Refs for dropdown management
  const managerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const developerRef = useRef<HTMLDivElement>(null);

  // Debug: Log data when component mounts or data changes
  useEffect(() => {
    console.log('=== DEBUGGING PROJECT FORM ===');
    console.log('isOpen:', isOpen);
    console.log('employees:', employees);
    console.log('clients:', clients);
    console.log('formData:', formData);
    console.log('================================');
  }, [isOpen, employees, clients, formData]);

  // Filter managers - only show users with 'manager' role
  const managers = React.useMemo(() => {
    if (!employees || employees.length === 0) return [];

    const filtered = employees.filter(emp =>
      emp.role === 'manager' ||
      emp.role?.toLowerCase() === 'manager'
    );

    return filtered;
  }, [employees]);

  // Filter developers - show both employees and managers
  const developers = React.useMemo(() => {
    if (!employees || employees.length === 0) return [];

    const filtered = employees.filter(emp =>
      emp.role === 'employee' ||
      emp.role === 'manager' ||
      emp.role?.toLowerCase() === 'employee' ||
      emp.role?.toLowerCase() === 'manager' ||
      emp.role?.toLowerCase().includes('developer')
    );

    return filtered;
  }, [employees]);

  // Filter options based on search terms
  const filteredManagers = managers.filter(manager =>
    manager.fullName?.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const filteredClients = clients.filter(client =>
    client.fullName?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredDevelopers = developers.filter(developer =>
    developer.fullName?.toLowerCase().includes(developerSearch.toLowerCase()) &&
    !selectedDevelopers.some(selected => selected._id === developer._id)
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerRef.current && !managerRef.current.contains(event.target as Node)) {
        setShowManagerDropdown(false);
        setManagerSearch('');
      }
      if (clientRef.current && !clientRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
        setClientSearch('');
      }
      if (developerRef.current && !developerRef.current.contains(event.target as Node)) {
        setShowDeveloperDropdown(false);
        setDeveloperSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Initialize form data when modal opens or project changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (project) {
      console.log('Editing project:', project);
      setFormData({
        name: project.name || '',
        description: project.description || '',
        projectType: project.projectType || 'fullstack',
        projectManager: project.projectManager?._id || null,
        projectClient: project.projectClient?._id || null,
        teamMembers: project.teamMembers?.map((tm: any) => tm.userId?._id || tm._id) || [],
        priority: project.priority || 'medium',
      });

      // Set selected manager (clear if no manager assigned)
      if (project.projectManager && project.projectManager._id && managers.length > 0) {
        const manager = managers.find(m => m._id === project.projectManager._id);
        setSelectedManager(manager || null);
      } else {
        setSelectedManager(null);
      }

      // Set selected client (clear if no client assigned)
      if (project.projectClient && project.projectClient._id && clients.length > 0) {
        const client = clients.find(c => c._id === project.projectClient._id);
        setSelectedClient(client || null);
      } else {
        setSelectedClient(null);
      }

      // Set selected developers (clear if no team members)
      if (project.teamMembers && project.teamMembers.length > 0 && developers.length > 0) {
        const devs = project.teamMembers
          .map((tm: any) => developers.find(d => d._id === (tm.userId?._id || tm._id)))
          .filter(Boolean);
        setSelectedDevelopers(devs);
      } else {
        setSelectedDevelopers([]);
      }
    } else {
      console.log('Creating new project');
      // Reset form for new project
      setFormData({
        name: '',
        description: '',
        projectType: 'fullstack',
        projectManager: null,
        projectClient: null,
        teamMembers: [],
        priority: 'medium',
      });
      setSelectedManager(null);
      setSelectedClient(null);
      setSelectedDevelopers([]);
    }
    
    // Reset search terms
    setManagerSearch('');
    setClientSearch('');
    setDeveloperSearch('');
  }, [isOpen, project, managers, clients, developers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Input change:', name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleManagerSelect = (manager: Employee) => {
    console.log('Manager selected:', manager);
    setSelectedManager(manager);
    setFormData(prev => ({ ...prev, projectManager: manager._id }));
    setManagerSearch('');
    setShowManagerDropdown(false);
  };

  const handleClientSelect = (client: Client) => {
    console.log('Client selected:', client);
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, projectClient: client._id }));
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const handleDeveloperToggle = (developer: Employee) => {
    console.log('Developer selected:', developer);
    const isSelected = selectedDevelopers.some(d => d._id === developer._id);
    
    if (!isSelected) {
      setSelectedDevelopers(prev => [...prev, developer]);
      setFormData(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, { userId: developer._id }]
      }));
    }
    
    setDeveloperSearch('');
    setShowDeveloperDropdown(false);
  };

  const handleRemoveManager = () => {
    setSelectedManager(null);
    setFormData(prev => ({ ...prev, projectManager: null }));
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setFormData(prev => ({ ...prev, projectClient: null }));
  };

  const handleRemoveDeveloper = (developerId: string) => {
    setSelectedDevelopers(prev => prev.filter(d => d._id !== developerId));
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((member: any) => member.userId !== developerId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting form with data:', formData);
    
    if (!formData.name.trim()) {
      Swal.fire({
        title: 'Error!',
        text: 'Project title is required.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      return;
    }

    setLoading(true);

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        projectType: formData.projectType,
        projectManager: formData.projectManager && formData.projectManager.trim() !== '' ? formData.projectManager : null,
        projectClient: formData.projectClient && formData.projectClient.trim() !== '' ? formData.projectClient : null,
        teamMembers: selectedDevelopers.map(dev => ({ userId: dev._id })),
        priority: formData.priority,
      };

      console.log('Sending project data:', projectData);

      if (project) {
        await dispatch(updateExistingProject({ ...projectData, _id: project._id })).unwrap();
        Swal.fire({
          title: 'Success!',
          text: 'Project updated successfully.',
          icon: 'success',
          confirmButtonColor: '#6B46C1',
        });
      } else {
        await dispatch(createNewProject(projectData)).unwrap();
        Swal.fire({
          title: 'Success!',
          text: 'Project created successfully.',
          icon: 'success',
          confirmButtonColor: '#6B46C1',
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to save project.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
        

          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter project title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              autoComplete="off"
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter project description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoComplete="off"
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Type
            </label>
            <select
              name="projectType"
              value={formData.projectType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="frontend">Front-End Developer</option>
              <option value="backend">Back-End Developer</option>
              <option value="fullstack">Full-Stack Developer</option>
            </select>
          </div>

          {/* Add Manager - Searchable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Manager ({managers.length} available)
            </label>
            {selectedManager ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">{selectedManager.fullName}</span>
                <button
                  type="button"
                  onClick={handleRemoveManager}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={managerRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={managerSearch}
                    onChange={(e) => {
                      setManagerSearch(e.target.value);
                      setShowManagerDropdown(true);
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                    placeholder="Search or select Manager..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
                    autoComplete="off"
                  />
                  <FiChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 transition-transform ${showManagerDropdown ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                {showManagerDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredManagers.length > 0 ? (
                      filteredManagers.map(manager => (
                        <button
                          key={manager._id}
                          type="button"
                          onClick={() => handleManagerSelect(manager)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{manager.fullName}</div>
                            <div className="text-sm text-gray-500">{manager.role || 'No role'}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {managers.length === 0 ? 'No managers available' : 'No matches found'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add Product Owner - Searchable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Product Owner ({clients.length} available)
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium">{selectedClient.fullName}</span>
                <button
                  type="button"
                  onClick={handleRemoveClient}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={clientRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search or select Product Owner..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
                    autoComplete="off"
                  />
                  <FiChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                {showClientDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <button
                          key={client._id}
                          type="button"
                          onClick={() => handleClientSelect(client)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{client.fullName}</div>
                            <div className="text-sm text-gray-500">{client.email || 'No email'}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {clients.length === 0 ? 'No clients available' : 'No matches found'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add Developers - Searchable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Developers ({developers.length} available, {selectedDevelopers.length} selected)
            </label>
            <div className="relative mb-3" ref={developerRef}>
              <div className="relative">
                <input
                  type="text"
                  value={developerSearch}
                  onChange={(e) => {
                    setDeveloperSearch(e.target.value);
                    setShowDeveloperDropdown(true);
                  }}
                  onFocus={() => setShowDeveloperDropdown(true)}
                  placeholder="Search or select Developers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
                  autoComplete="off"
                />
                <FiChevronDown 
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 transition-transform ${showDeveloperDropdown ? 'rotate-180' : ''}`} 
                />
              </div>
              
              {showDeveloperDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredDevelopers.length > 0 ? (
                    filteredDevelopers.map(developer => (
                      <button
                        key={developer._id}
                        type="button"
                        onClick={() => handleDeveloperToggle(developer)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">{developer.fullName}</div>
                          <div className="text-sm text-gray-500">{developer.role || 'No role'}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      {developers.length === 0 ? 'No developers available' : 'No matches found'}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Selected Developers */}
            {selectedDevelopers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedDevelopers.map(developer => (
                  <div
                    key={developer._id}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    <span>{developer.fullName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeveloper(developer._id)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Date Fields */}
          

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectFormModal;