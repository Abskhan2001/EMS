import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  // useContext,
} from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import AddClientModal from '../components/addclientModal';
// import { useUser } from '../contexts/UserContext';
// import { AttendanceContext } from './AttendanceContext';
import TaskBoardAdmin from '../components/TaskBoardAdmin';
import Employeeprofile from './Employeeprofile';
import { 
  getClientsByOrganization, 
  deleteEmployee 
} from '../services/adminService';
import Swal from 'sweetalert2';

interface Client {
  _id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  joining_date?: string;
  profile_image?: string;
  role: string;
  organization_id: string;
  projects: Project[];
  created_at: string;
}

interface Project {
  _id: string;
  title: string;
  description?: string;
  created_at: string;
}

const AdminClient: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Navigation state management
  const [selectedTAB, setSelectedTAB] = useState('');
  const [clientview, setClientView] = useState<'generalview' | 'detailview'>(
    'generalview'
  );
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [clientId, setClientId] = useState<string>('');

  // Task board state for project navigation
  const [devopss, setDevopss] = useState<any[]>([]);
  const [ProjectId, setProjectId] = useState<string>('');


  // Navigation handlers
  const handleClientClick = (client: Client) => {
    setCurrentClient(client);
    setClientId(client._id);
    setClientView('detailview');
  };

  const handleOpenTaskBoard = async (projectId: string) => {
    try {
      setProjectId(projectId);
      setDevopss([]);
      setSelectedTAB('TaskBoard');
    } catch (error) {
      console.error('Error navigating to task board:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to open task board. Please try again.',
        confirmButtonColor: '#d33'
      });
    }
  };
 const organizationId= localStorage.getItem("organizationId");
  // Fetch clients (filtering employees with role 'client')
  const fetchClients = useCallback(async () => {
    // Don't fetch if no organization_id
 
    try {
      console.log('Starting to fetch clients for organization:', organizationId);
      setLoading(true);

      // Using existing getEmployeesByOrganization and filter for clients
      const employeesData = await getClientsByOrganization(organizationId);
      console.log('Employees data received:', employeesData);
      
      // Filter only clients
      const clientsData = employeesData.filter((employee: any) => 
        employee.role === 'client' || employee.role === 'Client'
      );
      console.log('Filtered clients:', clientsData);
      
      // Transform the data to match our interface
      const transformedClients: Client[] = clientsData.map((client: any) => ({
        _id: client._id,
        full_name: client.full_name || client.fullName || 'Unknown',
        email: client.email || '',
        phone: client.phone || client.phone_number || client.phoneNumber,
        location: client.location,
        joining_date: client.hireDate,
        profile_image: client.profile_image || client.profileImage,
        role: client.role,
        organization_id: client.organization_id,
        created_at: client.created_at || client.createdAt,
        projects: client.projects || [],
      }));

      setClients(transformedClients);
      console.log('Clients set successfully:', transformedClients.length, 'clients');
    } catch (error) {
      console.error('Error fetching clients:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to load clients. Please try again.',
        confirmButtonColor: '#d33'
      });
      setClients([]); // Set empty array on error
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [organizationId]);

  // Delete client with optimistic update
  const handleDeleteClient = useCallback(
    async (clientId: string) => {
      // Show confirmation dialog with SweetAlert2
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will delete the client and all their associated data. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        return;
      }

      setIsDeleting(clientId);

      // Optimistic update - remove client from UI immediately
      const previousClients = [...clients];
      setClients((prev) => prev.filter((client) => client._id !== clientId));

      try {
        // Using existing deleteEmployee service (since clients are stored as employees with role 'client')
        await deleteEmployee(clientId);
        
        console.log('Client deleted successfully');
        
        // Success message
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Client has been deleted successfully.',
          confirmButtonColor: '#10b981'
        });
      } catch (error) {
        console.error('Delete error:', error);
        // Revert optimistic update on error
        setClients(previousClients);
        
        // Error message
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to delete the client. Please try again.',
          confirmButtonColor: '#d33'
        });
      } finally {
        setIsDeleting(null);
      }
    },
    [clients]
  );

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) {
      return clients;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return clients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(lowerSearchTerm) ||
        client.email.toLowerCase().includes(lowerSearchTerm) ||
        (client.phone && client.phone.toLowerCase().includes(lowerSearchTerm)) ||
        (client.location && client.location.toLowerCase().includes(lowerSearchTerm))
    );
  }, [clients, searchTerm]);

  // Handle client added - refetch clients to get the updated list
  const handleClientAdded = useCallback(
    async (newClient?: any) => {
      try {
        console.log('Client added, refetching clients...');
        
        // Add the new client to the list immediately if provided
        if (newClient && newClient._id) {
          const transformedClient: Client = {
            _id: newClient._id,
            full_name: newClient.full_name || 'Unknown',
            email: newClient.email || '',
            phone: newClient.phone || newClient.phone_number ||  newClient.phoneNumber,
            location: newClient.location,
            joining_date: newClient.joining_date,
            profile_image: newClient.profile_image,
            role: newClient.role || 'client',
            organization_id: newClient.organization_id,
            created_at: newClient.created_at || new Date().toISOString(),
            projects: newClient.projects || [],
          };
          
          setClients(prev => [transformedClient, ...prev]);
        } else {
          // Fallback: refetch all clients if no new client data
          await fetchClients();
        }
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Client has been added successfully.',
          confirmButtonColor: '#10b981'
        });
        
        // Close modal
        setModalOpen(false);
      } catch (error) {
        console.error('Error in handleClientAdded:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Client was created but failed to refresh the list. Please refresh the page.',
          confirmButtonColor: '#d33'
        });
      }
    },
    [fetchClients]
  );

  // Load clients on component mount and when organization changes
  useEffect(() => {
    console.log('useEffect triggered, userProfile?.organizationId:', organizationId);
    if (organizationId) {
      fetchClients();
    } else {
      console.log('No organizationId found, setting loading to false');
      setLoading(false);
    }
  }, [organizationId, fetchClients]);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  console.log('Rendering AdminClient, loading:', loading, 'clients count:', clients.length);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen overflow-x-scroll bg-gray-50 p-4 sm:p-6">
      {selectedTAB === 'TaskBoard' ? (
        <TaskBoardAdmin
          devopss={devopss}
          ProjectId={ProjectId}
          setSelectedTAB={setSelectedTAB}
          selectedTAB={selectedTAB}
        />
      ) : clientview === 'detailview' ? (
        <Employeeprofile
          employeeid={clientId}
          employeeview={clientview}
          employee={currentClient}
          setemployeeview={setClientView}
        />
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Client Management
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    View and manage your clients ({clients.length} total)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search clients by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64"
                  />
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
                    onClick={() => setModalOpen(true)}
                  >
                    <FiPlus className="mr-1" />
                    Add Client
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center">
                          <div className="text-4xl mb-4">👥</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {searchTerm ? 'No clients found' : 'No clients yet'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {searchTerm
                              ? 'Try adjusting your search criteria.'
                              : 'Get started by adding your first client.'}
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={() => setModalOpen(true)}
                              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                            >
                              <FiPlus className="inline mr-1" />
                              Add Your First Client
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr
                        key={client._id}
                        className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleClientClick(client)}
                      >
                        {/* Client */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {client.profile_image ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover mr-4"
                                src={client.profile_image}
                                alt={client.full_name}
                                onError={(e) => {
                                  // Fallback to initials if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div 
                              className={`flex-shrink-0 h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold uppercase mr-4 ${client.profile_image ? 'hidden' : ''}`}
                            >
                              {client.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 hover:text-purple-600 transition-colors">
                                {client.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {client.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {client.phone && (
                              <div className="text-xs text-gray-600">{client.phone}</div>
                            )}
                            {client.location && (
                              <div className="text-xs text-gray-600">{client.location}</div>
                            )}
                            {!client.phone && !client.location && (
                              <span className="text-xs text-gray-400">No contact info</span>
                            )}
                          </div>
                        </td>

                        {/* Projects */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {client.projects && client.projects.length > 0 ? (
                              <div className="space-y-1">
                                {client.projects.slice(0, 2).map((project) => (
                                  <button
                                    key={project._id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenTaskBoard(project._id);
                                    }}
                                    className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-1 rounded transition-colors cursor-pointer block max-w-32 truncate"
                                    title={project.title}
                                  >
                                    {project.title}
                                  </button>
                                ))}
                                {client.projects.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{client.projects.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                No projects
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {client.joining_date ? formatDate(client.joining_date) : 
     client.created_at ? formatDate(client.created_at) : 'N/A'}
  </div>
</td>


                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(client._id);
                            }}
                            disabled={isDeleting === client._id}
                            className={`text-red-600 hover:text-red-900 transition-colors p-2 rounded-full hover:bg-red-50 ${
                              isDeleting === client._id
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                            title="Delete Client"
                          >
                            {isDeleting === client._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                            ) : (
                              <FiTrash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      <AddClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onClientAdded={handleClientAdded}
      />
    </div>
  );
};

export default AdminClient;