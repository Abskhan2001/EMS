import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, X } from 'lucide-react';
import { FiX } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import TaskBoardAdmin from './TaskBoardAdmin';
import Select from 'react-select';
import { useUser } from '../contexts/UserContext';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { addProjectName } from '../slices/AdminProjectName';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Project {
  id: string;
  title: string;
  type: 'Front-End Developer' | 'Back End Developer' | 'Full Stack Developer';
  devops: { id: string; full_name?: string; name?: string }[];
  created_at: string;
  start_date?: string;
  created_by?: string;
  creatorName?: string;
  manager_id?: string;
  managerName?: string;
  product_owner?: string;
  productOwnerName?: string;
  completedScore: number;
  pendingScore: number;
  totalScore: number;
}

interface Dev {
  id: string;
  full_name: string;
}
interface devopss {
  id: string;
  name?: string;
  full_name?: string;
}

interface EmployeeWithProjects {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
  projects: {
    id: string;
    title: string;
    completedScore: number;
    pendingScore: number;
    totalScore: number;
  }[];
  completedKPI: number;
  pendingKPI: number;
  totalKPI: number;
}

interface ManagerWithProjects {
  id: string;
  full_name: string;
  projects: {
    id: string;
    title: string;
    completedScore: number;
    pendingScore: number;
    totalScore: number;
  }[];
}

function ProjectsAdmin() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ProjectId, setProjectId] = useState('');
  const { userProfile, loading: userloading, refreshUserProfile } = useUser();
  const [Devs, setDevs] = useState<Dev[]>([]);
  const [Clients, setClients] = useState<Dev[]>([]);
  const [selectedDevs, setSelectedDevs] = useState<
    { id: string; name?: string; full_name?: string }[]
  >([]);
  // Removed unused projectmanager state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTAB, setSelectedTAB] = useState('Projects');
  const [devopss, setdevops] = useState<devopss[]>([]);
  const [selectedView, setSelectedView] = useState('cardView');
  const [showAll, setShowAll] = useState('');
  const [expandedDevs, setExpandedDevs] = useState<Record<string, boolean>>({});
  const [newProject, setNewProject] = useState({
    title: '',
    type: 'Front-End Developer' as
      | 'Front-End Developer'
      | 'Back End Developer'
      | 'Full Stack Developer',
    manager_id: '',
    managerName: '',

    product_owner: '',
    productOwnerName: '',
  });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeesearch, setDataEmployeesearch] = useState(null);
  const [employeeWorkloads, setEmployeeWorkloads] = useState<
    Record<string, number>
  >({});
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [selectedWorkloadCategory, setSelectedWorkloadCategory] = useState<
    'free' | 'medium' | 'Good' | 'overloaded' | null
  >(null);
  const [workloadEmployees, setWorkloadEmployees] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // New state variables for sorting
  const [sortView, setSortView] = useState<
    'projects' | 'employees' | 'managers'
  >('projects');
  const [employeesWithProjects, setEmployeesWithProjects] = useState<
    EmployeeWithProjects[]
  >([]);
  const [managersWithProjects, setManagersWithProjects] = useState<
    ManagerWithProjects[]
  >([]);
  const [sortLoading, setSortLoading] = useState(false);

  // Search state variables
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});

  // Story points filter state
  const [storyPointsFilter, setStoryPointsFilter] = useState<
    'all' | 'weekly' | 'monthly'
  >('monthly');
  const [projectFilters, setProjectFilters] = useState<
    Record<string, 'all' | 'weekly' | 'monthly'>
  >({});

  const toggleExpandProjects = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const toggleExpandManagerProjects = (key) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Function to handle individual project filter change
  const handleProjectFilterChange = async (
    projectId: string,
    newFilter: 'all' | 'weekly' | 'monthly'
  ) => {
    setProjectFilters((prev) => ({ ...prev, [projectId]: newFilter }));

    // Recalculate scores for this specific project
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks_of_projects')
      .select('score, status, created_at, action_date')
      .eq('project_id', projectId);

    if (!tasksError && tasksData) {
      const filteredTasks = filterTasksByTimePeriod(tasksData, newFilter);

      const completedScore = filteredTasks
        .filter((task) => task.status === 'done')
        .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

      const pendingScore = filteredTasks
        .filter((task) => task.status !== 'done')
        .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

      const totalScore = completedScore + pendingScore;

      // Update only this project's scores
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? { ...project, completedScore, pendingScore, totalScore }
            : project
        )
      );
    }
  };

  const filterTasksByTimePeriod = (
    tasks: any[],
    filter: 'all' | 'weekly' | 'monthly'
  ) => {
    if (filter === 'all') return tasks;

    const now = new Date();
    const filterDate = new Date();

    if (filter === 'weekly') {
      filterDate.setDate(now.getDate() - 7);
    } else if (filter === 'monthly') {
      filterDate.setDate(now.getDate() - 30);
    }

    // Set time to start of day
    filterDate.setHours(0, 0, 0, 0);

    const filteredTasks = tasks.filter((task) => {
      if (!task.created_at) return false;

      // Parse the ISO timestamp
      const taskCreatedDate = new Date(task.created_at);

      // Check if task was created after the filter date
      return taskCreatedDate >= filterDate;
    });

    console.log(
      `Filter: ${filter}, Now: ${now.toISOString()}, FilterDate: ${filterDate.toISOString()}, Tasks before filter: ${
        tasks.length
      }, Tasks after filter: ${filteredTasks.length}`
    );

    return filteredTasks;
  };

  const filteredEmployees = Devs.filter((Dev) =>
    Dev.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to handle opening the workload modal
  const handleWorkloadCategoryClick = async (
    category: 'free' | 'medium' | 'Good' | 'overloaded'
  ) => {
    setSelectedWorkloadCategory(category);
    setWorkloadEmployees([]);
    setShowWorkloadModal(true);
    setModalLoading(true);

    try {
      // Get all employee IDs in this workload category
      const employeeIds = Object.entries(employeeWorkloads)
        .filter(([id, score]) => {
          if (category === 'free') return score >= 0 && score < 50;
          if (category === 'medium') return score >= 50 && score < 100;
          if (category === 'Good') return score >= 100 && score < 150;
          if (category === 'overloaded') return score >= 150;
          return false;
        })
        .map(([id]) => id);

      if (employeeIds.length === 0) {
        setWorkloadEmployees([]);
        setModalLoading(false);
        return;
      }

      // Fetch employee details from the database
      const { data: employeesData, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, joining_date')
        .in('id', employeeIds)
        .eq('organization_id', userProfile?.organization_id);

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      // Fetch tasks for these employees to calculate KPIs
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks_of_projects')
        .select('*');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }

      // Fetch projects for these employees
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, devops')
        .eq('organization_id', userProfile?.organization_id);
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return;
      }

      // Process employee data with projects and KPIs
      const employeesWithDetails = employeesData.map((employee) => {
        // Find projects for this employee
        const employeeProjects = projectsData.filter((project) =>
          project.devops?.some((dev: any) => dev.id === employee.id)
        );

        // Find active tasks for this employee
        const activeTasks = tasksData.filter(
          (task) =>
            task.devops?.some((dev: any) => dev.id === employee.id) &&
            task.status?.toLowerCase() !== 'done'
        );

        // Calculate total KPI from active tasks (pending tasks only)
        // This should match the workload calculation we did earlier
        const totalKPI = employeeWorkloads[employee.id] || 0;

        // Find completed tasks for this employee
        const completedTasks = tasksData.filter(
          (task) =>
            task.devops?.some((dev: any) => dev.id === employee.id) &&
            task.status?.toLowerCase() === 'done'
        );

        // Calculate completed KPI
        const completedKPI = completedTasks.reduce((sum, task) => {
          return sum + (Number(task.score) || 0);
        }, 0);

        return {
          ...employee,
          projects: employeeProjects.map((project) => project.title),
          projectCount: employeeProjects.length,
          TotalKPI: totalKPI,
          activeTaskCount: activeTasks.length,
          completedKPI: completedKPI,
        };
      });

      setWorkloadEmployees(employeesWithDetails);
      setModalLoading(false);
    } catch (error) {
      console.error('Error processing workload data:', error);
      setModalLoading(false);
    }
  };

  // Fetch developers and clients
  useEffect(() => {
    const fetchDevs = async () => {
      if (!userProfile?.organization_id) return;

      const { data, error } = await supabase
        .from('users')
        .select('full_name, id, role')
        .eq('organization_id', userProfile.organization_id);
      if (!error) {
        setDevs(data);
        setClients(data.filter((user) => user.role === 'client'));
      }
    };
    fetchDevs();
  }, [userProfile?.organization_id]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!userProfile?.organization_id) return;

      setLoading(true);

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', userProfile.organization_id);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setLoading(false);
        return;
      }

      // Fetch all users to get creator names
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('organization_id', userProfile.organization_id);

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Create a map of user IDs to full names for quick lookup
      const userMap: Record<string, string> = {};
      if (usersData) {
        usersData.forEach((user) => {
          userMap[user.id] = user.full_name;
        });
      }

      // Initialize workload tracking
      const workloads: Record<string, number> = {};

      // First, fetch all tasks across all projects to calculate individual developer workloads
      const { data: allTasksData, error: allTasksError } = await supabase
        .from('tasks_of_projects')
        .select('*');

      if (allTasksError) {
        console.error('Error fetching all tasks:', allTasksError);
      } else {
        // Calculate workload for each developer based on their assigned tasks
        allTasksData.forEach((task) => {
          // Only count tasks that are not done
          if (
            task.status !== 'done' &&
            task.devops &&
            Array.isArray(task.devops)
          ) {
            // For each developer assigned to this task
            task.devops.forEach((dev: any) => {
              if (dev && dev.id) {
                // Initialize if not exists
                if (!workloads[dev.id]) {
                  workloads[dev.id] = 0;
                }
                // Add this task's score to the developer's workload
                workloads[dev.id] += Number(task.score) || 0;
              }
            });
          }
        });
      }

      console.log('Developer workloads:', workloads);

      // Fetch all tasks for these projects
      const projectsWithScores = await Promise.all(
        projectsData.map(async (project) => {
          // Fetch tasks for this project
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks_of_projects')
            .select('score, status, devops,created_at,action_date')
            .eq('project_id', project.id);

          if (tasksError) {
            console.error(
              `Error fetching tasks for project ${project.id}:`,
              tasksError
            );
            return {
              ...project,
              completedScore: 0,
              pendingScore: 0,
              totalScore: 0,
              creatorName: project.created_by
                ? userMap[project.created_by] || 'Unknown'
                : 'Unknown',
            };
          }

          // Filter tasks based on story points filter
          const filteredTasks = filterTasksByTimePeriod(
            tasksData,
            storyPointsFilter
          );

          // Calculate scores
          const completedScore = filteredTasks
            .filter((task) => task.status === 'done')
            .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

          const pendingScore = filteredTasks
            .filter((task) => task.status !== 'done')
            .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

          const totalScore = completedScore + pendingScore;

          // Ensure developers have both name and full_name properties
          const normalizedDevops = project.devops
            ? project.devops.map(
                (dev: { id: string; name?: string; full_name?: string }) => {
                  // If the developer has neither name nor full_name, try to get it from userMap
                  if (!dev.name && !dev.full_name && dev.id) {
                    const userName = userMap[dev.id];
                    return {
                      ...dev,
                      name: userName || 'Unknown',
                      full_name: userName || 'Unknown',
                    };
                  }
                  // If the developer has full_name but not name, copy full_name to name
                  else if (dev.full_name && !dev.name) {
                    return {
                      ...dev,
                      name: dev.full_name,
                    };
                  }
                  // If the developer has name but not full_name, copy name to full_name
                  else if (dev.name && !dev.full_name) {
                    return {
                      ...dev,
                      full_name: dev.name,
                    };
                  }
                  // Otherwise, return the developer as is
                  return dev;
                }
              )
            : [];

          console.log(
            'Normalized devops for project',
            project.id,
            ':',
            normalizedDevops
          );

          return {
            ...project,
            devops: normalizedDevops,
            completedScore,
            pendingScore,
            totalScore,
            creatorName: project.created_by
              ? userMap[project.created_by] || 'Unknown'
              : 'Unknown',
            managerName: project.manager_id
              ? userMap[project.manager_id] || 'Unknown'
              : null,
            productOwnerName: project.product_owner
              ? userMap[project.product_owner] || 'Unknown'
              : null,
          };
        })
      );

      // Update the employee workloads state
      setEmployeeWorkloads(workloads);
      setProjects(projectsWithScores);
      setLoading(false);
    };

    fetchProjects();
  }, [userProfile?.organization_id, storyPointsFilter]);

  const handleChange = (selectedEmployee: {
    id: string;
    full_name: string;
  }) => {
    if (!selectedDevs.some((dev) => dev.id === selectedEmployee.id)) {
      setSelectedDevs([
        ...selectedDevs,
        {
          id: selectedEmployee.id,
          name: selectedEmployee.full_name,
          full_name: selectedEmployee.full_name,
        },
      ]);
    }
  };

  const handlemanagerchange = (selectedEmployee: {
    id: string;
    full_name: string;
  }) => {
    setNewProject({
      ...newProject,
      manager_id: selectedEmployee.id,
      managerName: selectedEmployee.full_name,
    });
  };

  const handleProductOwnerChange = (selectedEmployee: {
    id: string;
    full_name: string;
  }) => {
    setNewProject({
      ...newProject,
      product_owner: selectedEmployee.id,
      productOwnerName: selectedEmployee.full_name,
    });
  };

  const handleRemove = (id: string) => {
    setSelectedDevs(selectedDevs.filter((dev) => dev.id !== id));
  };

  const toggleExpandDevs = (projectId: string) => {
    setExpandedDevs((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  function DeleteProjectDialog({ onConfirm, children }) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={onConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(projects.filter((project) => project.id !== id));

      // Delete related tasks
      const { error: taskError } = await supabase
        .from('tasks_of_projects')
        .delete()
        .eq('project_id', id);
      if (taskError) throw taskError;
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const openAddModal = () => {
    setNewProject({
      title: '',
      type: 'Front-End Developer' as
        | 'Front-End Developer'
        | 'Back End Developer'
        | 'Full Stack Developer',
      manager_id: '',
      managerName: '',
      product_owner: '',
      productOwnerName: '',
    });
    setSelectedDevs([]);
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setNewProject({
      title: project.title,
      type: project.type,
      manager_id: project.manager_id || project.created_by || '',
      managerName: project.managerName || project.creatorName || '',
      product_owner: project.product_owner || '',
      productOwnerName: project.productOwnerName || '',
    });

    // Convert devops format to include both name and full_name
    const formattedDevs = (project.devops || []).map((dev) => ({
      id: dev.id,
      name: dev.full_name,
      full_name: dev.full_name,
    }));
    setSelectedDevs(formattedDevs);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  // Function to close the workload modal
  const closeWorkloadModal = () => {
    setShowWorkloadModal(false);
    setSelectedWorkloadCategory(null);
  };

  // Function to fetch and process employee data with their projects
  const fetchEmployeesWithProjects = async () => {
    if (!userProfile?.organization_id) return;

    setSortLoading(true);

    try {
      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('organization_id', userProfile.organization_id);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        setSortLoading(false);
        return;
      }

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', userProfile.organization_id);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setSortLoading(false);
        return;
      }

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks_of_projects')
        .select('*');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        setSortLoading(false);
        return;
      }

      // Process each employee
      const employeesWithProjectsData: EmployeeWithProjects[] =
        employeesData.map((employee) => {
          // Find projects for this employee
          const employeeProjects = projectsData.filter((project) =>
            project.devops?.some((dev: any) => dev.id === employee.id)
          );

          // Process each project to include scores
          const processedProjects = employeeProjects.map((project) => {
            // Get tasks for this project
            const projectTasks = tasksData.filter(
              (task) => task.project_id === project.id
            );

            // Filter tasks based on story points filter
            const filteredProjectTasks = filterTasksByTimePeriod(
              projectTasks,
              storyPointsFilter
            );

            // Calculate scores
            const completedScore = filteredProjectTasks
              .filter(
                (task) =>
                  task.status === 'done' &&
                  task.devops?.some((dev: any) => dev.id === employee.id)
              )
              .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

            const pendingScore = filteredProjectTasks
              .filter(
                (task) =>
                  task.status !== 'done' &&
                  task.devops?.some((dev: any) => dev.id === employee.id)
              )
              .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

            const totalScore = completedScore + pendingScore;

            return {
              id: project.id,
              title: project.title,
              completedScore,
              pendingScore,
              totalScore,
            };
          });

          // Calculate total KPIs for the employee
          const completedKPI = processedProjects.reduce(
            (sum, project) => sum + project.completedScore,
            0
          );
          const pendingKPI = processedProjects.reduce(
            (sum, project) => sum + project.pendingScore,
            0
          );
          const totalKPI = completedKPI + pendingKPI;

          return {
            id: employee.id,
            full_name: employee.full_name,
            email: employee.email,
            role: employee.role,
            projects: processedProjects,
            completedKPI,
            pendingKPI,
            totalKPI,
          };
        });

      setEmployeesWithProjects(employeesWithProjectsData);
      setSortLoading(false);
    } catch (error) {
      console.error('Error processing employee data:', error);
      setSortLoading(false);
    }
  };

  // Function to fetch and process manager data with their projects
  const fetchManagersWithProjects = async () => {
    if (!userProfile?.organization_id) return;

    setSortLoading(true);

    try {
      // Fetch all projects with their managers
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', userProfile.organization_id);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setSortLoading(false);
        return;
      }

      // Fetch all users to get manager names
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('organization_id', userProfile.organization_id);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        setSortLoading(false);
        return;
      }

      // Create a map of user IDs to full names
      const userMap: Record<string, string> = {};
      usersData.forEach((user) => {
        userMap[user.id] = user.full_name;
      });

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks_of_projects')
        .select('*');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        setSortLoading(false);
        return;
      }

      // Group projects by manager
      const managerProjectsMap: Record<string, any[]> = {};

      projectsData.forEach((project) => {
        if (project.created_by) {
          if (!managerProjectsMap[project.created_by]) {
            managerProjectsMap[project.created_by] = [];
          }

          // Calculate scores for this project
          const projectTasks = tasksData.filter(
            (task) => task.project_id === project.id
          );

          // Filter tasks based on story points filter
          const filteredProjectTasks = filterTasksByTimePeriod(
            projectTasks,
            storyPointsFilter
          );

          const completedScore = filteredProjectTasks
            .filter((task) => task.status === 'done')
            .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

          const pendingScore = filteredProjectTasks
            .filter((task) => task.status !== 'done')
            .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

          const totalScore = completedScore + pendingScore;

          managerProjectsMap[project.created_by].push({
            id: project.id,
            title: project.title,
            completedScore,
            pendingScore,
            totalScore,
          });
        }
      });

      // Convert to array of managers with projects
      const managersWithProjectsData: ManagerWithProjects[] = Object.entries(
        managerProjectsMap
      ).map(([managerId, projects]) => ({
        id: managerId,
        full_name: userMap[managerId] || 'Unknown Manager',
        projects,
      }));

      setManagersWithProjects(managersWithProjectsData);
      setSortLoading(false);
    } catch (error) {
      console.error('Error processing manager data:', error);
      setSortLoading(false);
    }
  };

  // Function to handle sort view change
  const handleSortViewChange = (
    view: 'projects' | 'employees' | 'managers'
  ) => {
    setSortView(view);

    if (view === 'employees') {
      fetchEmployeesWithProjects();
    } else if (view === 'managers') {
      fetchManagersWithProjects();
    }
  };

  // Effect to refresh data when story points filter changes
  useEffect(() => {
    if (sortView === 'employees') {
      fetchEmployeesWithProjects();
    } else if (sortView === 'managers') {
      fetchManagersWithProjects();
    }
  }, [storyPointsFilter, sortView]);

  // Render the workload employees modal
  const renderWorkloadModal = () => {
    const getCategoryTitle = () => {
      switch (selectedWorkloadCategory) {
        case 'free':
          return 'Free Developers ';
        case 'medium':
          return 'Medium Workload Developers ';
        case 'Good':
          return 'Good Developers ';
        case 'overloaded':
          return 'Overloaded Developers ';
        default:
          return 'Developers';
      }
    };

    const getCategoryColor = () => {
      switch (selectedWorkloadCategory) {
        case 'free':
          return 'bg-red-500';
        case 'medium':
          return 'bg-yellow-500';
        case 'Good':
          return 'bg-green-500';
        case 'overloaded':
          return 'bg-purple-500';
        default:
          return 'bg-gray-500';
      }
    };

    return (
      <div className="fixed  inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${getCategoryColor()}`}
              ></div>
              <h2 className="text-xl font-bold text-gray-800">
                {getCategoryTitle()}
              </h2>
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                {workloadEmployees.length} developers
              </span>
            </div>
            <button
              onClick={closeWorkloadModal}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {workloadEmployees.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No developers found
                </h3>
                <p className="text-gray-500">
                  There are no developers in this workload category.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Developer
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Projects
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Remaining KPIs
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Completed KPIs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modalLoading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                            <p className="text-gray-500">
                              Loading developer data...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      workloadEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium">
                                {employee.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {employee.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {employee.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {employee.projectCount} projects
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {employee.projects?.join(', ') || 'No projects'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  (employee.TotalKPI || 0) < 50
                                    ? 'bg-red-500'
                                    : (employee.TotalKPI || 0) < 100
                                    ? 'bg-yellow-500'
                                    : (employee.TotalKPI || 0) < 150
                                    ? 'bg-green-500'
                                    : 'bg-purple-500'
                                } mr-2`}
                              ></div>
                              <span className="text-sm font-medium">
                                {employee.TotalKPI || 0} KPI
                              </span>
                            </div>
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  (employee.TotalKPI || 0) < 50
                                    ? 'bg-red-500'
                                    : (employee.TotalKPI || 0) < 100
                                    ? 'bg-yellow-500'
                                    : (employee.TotalKPI || 0) < 150
                                    ? 'bg-green-500'
                                    : 'bg-purple-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    ((employee.TotalKPI || 0) / 200) * 100,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium">
                              {employee.completedKPI || 0}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={closeWorkloadModal}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;

    try {
      if (editingProject) {
        // Ensure all developers have both name and full_name properties
        const normalizedDevs = selectedDevs.map((dev) => ({
          id: dev.id,
          name: dev.name || dev.full_name || 'Unknown',
          full_name: dev.full_name || dev.name || 'Unknown',
        }));

        console.log(
          'Normalized developers for updated project:',
          normalizedDevs
        );

        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            title: newProject.title,
            type: newProject.type,
            devops: normalizedDevs,
            created_by: newProject.manager_id || null,
            product_owner: newProject.product_owner || null,
          })
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        // Ensure all developers have both name and full_name properties
        const normalizedDevs = selectedDevs.map((dev) => ({
          id: dev.id,
          name: dev.name || dev.full_name || 'Unknown',
          full_name: dev.full_name || dev.name || 'Unknown',
        }));

        console.log('Normalized developers for new project:', normalizedDevs);

        // Create new project
        const { error } = await supabase.from('projects').insert([
          {
            title: newProject.title,
            type: newProject.type,
            devops: normalizedDevs,
            created_at: new Date().toISOString(),
            created_by: newProject.manager_id || null,
            product_owner: newProject.product_owner || null,
            organization_id: userProfile?.organization_id,
          },
        ]);

        if (error) throw error;
      }

      // Refresh projects list - use the same fetch logic as in the useEffect
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', userProfile?.organization_id);

      if (!error) {
        // Fetch all users to get creator names
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('organization_id', userProfile?.organization_id);

        if (usersError) {
          console.error('Error fetching users:', usersError);
        }

        // Create a map of user IDs to full names for quick lookup
        const userMap: Record<string, string> = {};
        if (usersData) {
          usersData.forEach((user) => {
            userMap[user.id] = user.full_name;
          });
        }

        // Process projects with the same logic as in useEffect
        const projectsWithScores = await Promise.all(
          projectsData.map(async (project) => {
            // Fetch tasks for this project
            const { data: tasksData, error: tasksError } = await supabase
              .from('tasks_of_projects')
              .select('score, status,created_at,action_date')
              .eq('project_id', project.id);

            if (tasksError) {
              console.error(
                `Error fetching tasks for project ${project.id}:`,
                tasksError
              );
              return {
                ...project,
                completedScore: 0,
                pendingScore: 0,
                totalScore: 0,
                creatorName: project.created_by
                  ? userMap[project.created_by] || 'Unknown'
                  : 'Unknown',
                managerName: project.manager_id
                  ? userMap[project.manager_id] || 'Unknown'
                  : null,
                productOwnerName: project.product_owner
                  ? userMap[project.product_owner] || 'Unknown'
                  : null,
              };
            }

            // Filter tasks based on story points filter
            const filteredTasks = filterTasksByTimePeriod(
              tasksData,
              storyPointsFilter
            );

            // Calculate scores
            const completedScore = filteredTasks
              .filter((task) => task.status === 'done')
              .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

            const pendingScore = filteredTasks
              .filter((task) => task.status !== 'done')
              .reduce((sum, task) => sum + (Number(task.score) || 0), 0);

            const totalScore = completedScore + pendingScore;

            // Ensure developers have both name and full_name properties
            const normalizedDevops = project.devops
              ? project.devops.map(
                  (dev: { id: string; name?: string; full_name?: string }) => {
                    // If the developer has neither name nor full_name, try to get it from userMap
                    if (!dev.name && !dev.full_name && dev.id) {
                      const userName = userMap[dev.id];
                      return {
                        ...dev,
                        name: userName || 'Unknown',
                        full_name: userName || 'Unknown',
                      };
                    }
                    // If the developer has full_name but not name, copy full_name to name
                    else if (dev.full_name && !dev.name) {
                      return {
                        ...dev,
                        name: dev.full_name,
                      };
                    }
                    // If the developer has name but not full_name, copy name to full_name
                    else if (dev.name && !dev.full_name) {
                      return {
                        ...dev,
                        full_name: dev.name,
                      };
                    }
                    // Otherwise, return the developer as is
                    return dev;
                  }
                )
              : [];

            return {
              ...project,
              devops: normalizedDevops,
              completedScore,
              pendingScore,
              totalScore,
              creatorName: project.created_by
                ? userMap[project.created_by] || 'Unknown'
                : 'Unknown',
              managerName: project.manager_id
                ? userMap[project.manager_id] || 'Unknown'
                : null,
              productOwnerName: project.product_owner
                ? userMap[project.product_owner] || 'Unknown'
                : null,
            };
          })
        );

        setProjects(projectsWithScores);
      }

      closeModal();
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const dispatch = useDispatch<AppDispatch>();
  const isSidrBarOpen = useSelector((state: RootState) => state.sideBar.isOpen);
  return (
    <div className="min-h-screen">
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          {selectedTAB === 'taskBoard' && (
            <TaskBoardAdmin
              setSelectedTAB={setSelectedTAB}
              selectedTAB={selectedTAB}
              ProjectId={ProjectId}
              devopss={devopss}
            />
          )}

          {selectedTAB == 'Projects' && (
            <div className="max-w-full w-full mx-auto">
              {/* Show workload modal when active */}
              {showWorkloadModal && renderWorkloadModal()}
              <div className="flex flex-col gap-4 p-3 rounded-2xl mb-4 bg-white shadow-sm border-b border-gray-100">
                {/* Top Bar - Title and Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="text-md md:text-2xl font-bold text-gray-800">
                      Your Projects
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Only show view toggle buttons when in projects view */}
                    {sortView === 'projects' && (
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => {
                            setSelectedView('cardView');
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            selectedView === 'cardView'
                              ? 'bg-white text-purple-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Card View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedView('tableView');
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            selectedView === 'tableView'
                              ? 'bg-white text-purple-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Table View
                        </button>
                      </div>
                    )}

                    <button
                      onClick={openAddModal}
                      className="bg-[#9A00FF] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors duration-200 whitespace-nowrap"
                    >
                      <PlusCircle size={20} className="mr-2" /> New Project
                    </button>
                  </div>
                </div>

                {/* Search and Filter Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                  {/* Search and Sort */}
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Search input - changes based on current view */}
                    <div className="relative w-full sm:w-auto">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {sortView === 'projects' && (
                        <input
                          type="text"
                          className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 py-2 pl-10 pr-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Search projects..."
                          value={projectSearchTerm}
                          onChange={(e) => setProjectSearchTerm(e.target.value)}
                        />
                      )}
                      {sortView === 'employees' && (
                        <input
                          type="text"
                          className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 py-2 pl-10 pr-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Search employees..."
                          value={employeeSearchTerm}
                          onChange={(e) =>
                            setEmployeeSearchTerm(e.target.value)
                          }
                        />
                      )}
                      {sortView === 'managers' && (
                        <input
                          type="text"
                          className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 py-2 pl-10 pr-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Search managers..."
                          value={managerSearchTerm}
                          onChange={(e) => setManagerSearchTerm(e.target.value)}
                        />
                      )}
                    </div>

                    {/* View dropdown */}
                    <div className="relative w-full sm:w-auto">
                      <select
                        className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none"
                        value={sortView}
                        onChange={(e) =>
                          handleSortViewChange(
                            e.target.value as
                              | 'projects'
                              | 'employees'
                              | 'managers'
                          )
                        }
                      >
                        <option value="projects">View Projects</option>
                        <option value="employees">View by Employees</option>
                        <option value="managers">View by Managers</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg
                          className="fill-current h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workload Stats */}
              <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-4 ">
                {/* <h2 className="text-lg font-semibold mb-3">Developer Workload</h2> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleWorkloadCategoryClick('free')}
                    className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-2 hover:shadow-md transition-shadow border border-transparent hover:border-green-100"
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium">
                      free:{' '}
                      {
                        Object.values(employeeWorkloads).filter(
                          (score) => score >= 0 && score < 50
                        ).length
                      }{' '}
                      developers
                    </span>
                  </button>
                  <button
                    onClick={() => handleWorkloadCategoryClick('medium')}
                    className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-2 hover:shadow-md transition-shadow border border-transparent hover:border-yellow-100"
                  >
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium">
                      Fair Load:{' '}
                      {
                        Object.values(employeeWorkloads).filter(
                          (score) => score >= 50 && score < 100
                        ).length
                      }{' '}
                      developers
                    </span>
                  </button>
                  <button
                    onClick={() => handleWorkloadCategoryClick('Good')}
                    className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-2 hover:shadow-md transition-shadow border border-transparent hover:border-green-100"
                  >
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">
                      Normal Load:{' '}
                      {
                        Object.values(employeeWorkloads).filter(
                          (score) => score >= 100 && score < 150
                        ).length
                      }{' '}
                      developers
                    </span>
                  </button>
                  <button
                    onClick={() => handleWorkloadCategoryClick('overloaded')}
                    className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-2 hover:shadow-md transition-shadow border border-transparent hover:border-red-100"
                  >
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">
                      Overloaded:{' '}
                      {
                        Object.values(employeeWorkloads).filter(
                          (score) => score >= 150
                        ).length
                      }{' '}
                      developers
                    </span>
                  </button>
                </div>
              </div>

              {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">
                        {editingProject ? 'Edit Project' : 'Create New Project'}
                      </h2>
                      <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Title
                          </label>
                          <input
                            type="text"
                            value={newProject.title}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Enter project title"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Type
                          </label>
                          <select
                            value={newProject.type}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                type: e.target.value as
                                  | 'Front-End Developer'
                                  | 'Back End Developer',
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="Front-End Developer">
                              Front-End Developer
                            </option>
                            <option value="Back End Developer">
                              Back End Developer
                            </option>
                            <option value="Back End Developer">
                              Full Stack Developer
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Add Manager
                          </label>
                          <Select
                            options={filteredEmployees.map((dev) => ({
                              value: dev.id,
                              label: dev.full_name,
                              fullData: dev,
                            }))}
                            value={
                              newProject.manager_id
                                ? {
                                    value: newProject.manager_id,
                                    label: newProject.managerName,
                                  }
                                : null
                            }
                            onChange={(selectedOption) => {
                              if (selectedOption) {
                                handlemanagerchange(selectedOption.fullData);
                              } else {
                                setNewProject({
                                  ...newProject,
                                  manager_id: '',
                                  managerName: '',
                                });
                              }
                            }}
                            placeholder="Search or select Manager..."
                            isSearchable
                            isClearable
                            className="w-full"
                            classNamePrefix="react-select"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Add Product Owner
                          </label>
                          <Select
                            options={Clients.map((client) => ({
                              value: client.id,
                              label: client.full_name,
                              fullData: client,
                            }))}
                            value={
                              newProject.product_owner
                                ? {
                                    value: newProject.product_owner,
                                    label: newProject.productOwnerName,
                                  }
                                : null
                            }
                            onChange={(selectedOption) => {
                              if (selectedOption) {
                                handleProductOwnerChange(
                                  selectedOption.fullData
                                );
                              } else {
                                setNewProject({
                                  ...newProject,
                                  product_owner: '',
                                  productOwnerName: '',
                                });
                              }
                            }}
                            placeholder="Search or select Product Owner..."
                            isSearchable
                            isClearable
                            className="w-full"
                            classNamePrefix="react-select"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Add Developers
                          </label>

                          <Select
                            options={filteredEmployees.map((dev) => ({
                              value: dev.id,
                              label: dev.full_name,
                              fullData: dev, // include full dev object
                            }))}
                            onChange={(selectedOption) => {
                              if (selectedOption) {
                                handleChange(selectedOption.fullData); // Pass the full dev object
                              }
                            }}
                            placeholder="Search or select DevOps..."
                            isSearchable
                            className="w-full"
                            classNamePrefix="react-select"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedDevs.map((dev) => (
                            <div
                              key={dev.id}
                              className="flex items-center bg-gray-200 px-3 py-1 rounded-md"
                            >
                              <span className="mr-2">
                                {dev.name || dev.full_name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemove(dev.id);
                                }}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#9A00FF] text-white rounded-md hover:bg-violet-700"
                          >
                            {editingProject
                              ? 'Update Project'
                              : 'Create Project'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Employee View */}
              {sortView === 'employees' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {sortLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  ) : employeesWithProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-1">
                        No employees found
                      </h3>
                      <p className="text-gray-500">
                        There are no employees with assigned projects.
                      </p>
                    </div>
                  ) : employeesWithProjects.filter(
                      (employee) =>
                        employee.full_name
                          .toLowerCase()
                          .includes(employeeSearchTerm.toLowerCase()) ||
                        (employee.email &&
                          employee.email
                            .toLowerCase()
                            .includes(employeeSearchTerm.toLowerCase())) ||
                        (employee.role &&
                          employee.role
                            .toLowerCase()
                            .includes(employeeSearchTerm.toLowerCase())) ||
                        employee.projects.some((project) =>
                          project.title
                            .toLowerCase()
                            .includes(employeeSearchTerm.toLowerCase())
                        )
                    ).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full  flex items-center justify-center mx-auto mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-1">
                        No employees match your search
                      </h3>
                      <p className="text-gray-500">
                        Try a different search term.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Table view for medium and larger screens */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Employee
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Projects
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                <div className="flex items-center gap-2">
                                  <span>Story Points</span>
                                  <select
                                    value={storyPointsFilter}
                                    onChange={(e) =>
                                      setStoryPointsFilter(
                                        e.target.value as
                                          | 'all'
                                          | 'weekly'
                                          | 'monthly'
                                      )
                                    }
                                    className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="all">All</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                  </select>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {employeesWithProjects
                              .filter(
                                (employee) =>
                                  employee.full_name
                                    .toLowerCase()
                                    .includes(
                                      employeeSearchTerm.toLowerCase()
                                    ) ||
                                  (employee.email &&
                                    employee.email
                                      .toLowerCase()
                                      .includes(
                                        employeeSearchTerm.toLowerCase()
                                      )) ||
                                  (employee.role &&
                                    employee.role
                                      .toLowerCase()
                                      .includes(
                                        employeeSearchTerm.toLowerCase()
                                      )) ||
                                  employee.projects.some((project) =>
                                    project.title
                                      .toLowerCase()
                                      .includes(
                                        employeeSearchTerm.toLowerCase()
                                      )
                                  )
                              )
                              .map((employee) => (
                                <tr
                                  key={employee.id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium">
                                        {employee.full_name
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {employee.full_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {employee.email}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {employee.role || 'No role'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 mb-2">
                                      {employee.projects.length} projects
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        {employee.projects &&
                                        employee.projects.length > 0 ? (
                                          <div>
                                            <div className="text-sm text-gray-900">
                                              {(expandedProjects['all']
                                                ? employee.projects
                                                : employee.projects.slice(0, 2)
                                              ).map((project) => (
                                                <div
                                                  key={project.id}
                                                  className="bg-gray-50 p-2 rounded-md mb-2"
                                                >
                                                  <div
                                                    className="text-sm font-medium text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedTAB(
                                                        'taskBoard'
                                                      );
                                                      setProjectId(project.id);
                                                      const projectData =
                                                        projects.find(
                                                          (p) =>
                                                            p.id === project.id
                                                        );
                                                      if (projectData) {
                                                        setdevops(
                                                          projectData.devops
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    {project.title}
                                                  </div>
                                                  <div className="flex items-center mt-1">
                                                    <span className="text-xs text-green-600 font-medium">
                                                      {project.completedScore}
                                                    </span>
                                                    <span className="mx-1 text-xs text-gray-500">
                                                      /
                                                    </span>
                                                    <span className="text-xs text-red-500 font-medium">
                                                      {project.totalScore}
                                                    </span>
                                                    <div className="ml-2 flex-grow h-1.5 bg-gray-200 rounded-full">
                                                      <div
                                                        className="bg-green-500 h-1.5 rounded-full"
                                                        style={{
                                                          width: `${
                                                            project.totalScore >
                                                            0
                                                              ? (project.completedScore /
                                                                  project.totalScore) *
                                                                100
                                                              : 0
                                                          }%`,
                                                        }}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    Completed:{' '}
                                                    {project.completedScore} |
                                                    Pending:{' '}
                                                    {project.pendingScore}
                                                  </div>
                                                </div>
                                              ))}
                                              {employee.projects.length > 2 &&
                                                !expandedProjects['all'] && (
                                                  <button
                                                    className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 transition-colors duration-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleExpandProjects(
                                                        'all'
                                                      );
                                                    }}
                                                  >
                                                    Show More... (
                                                    {employee.projects.length -
                                                      2}{' '}
                                                    more)
                                                  </button>
                                                )}
                                              {expandedProjects['all'] &&
                                                employee.projects.length >
                                                  2 && (
                                                  <button
                                                    className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 transition-colors duration-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleExpandProjects(
                                                        'all'
                                                      );
                                                    }}
                                                  >
                                                    Show Less
                                                  </button>
                                                )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500">
                                            No projects assigned
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-green-600 font-medium">
                                        {employee.completedKPI}
                                      </span>
                                      <span className="mx-1 text-gray-500">
                                        /
                                      </span>
                                      <span className="text-red-500 font-medium">
                                        {employee.totalKPI}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                      <div
                                        className="bg-green-500 h-1.5 rounded-full"
                                        style={{
                                          width: `${
                                            employee.totalKPI > 0
                                              ? (employee.completedKPI /
                                                  employee.totalKPI) *
                                                100
                                              : 0
                                          }%`,
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Completed: {employee.completedKPI} |
                                      Pending: {employee.pendingKPI}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manager View */}
              {sortView === 'managers' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {sortLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  ) : managersWithProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-1">
                        No managers found
                      </h3>
                      <p className="text-gray-500">
                        There are no managers with assigned projects.
                      </p>
                    </div>
                  ) : managersWithProjects.filter(
                      (manager) =>
                        manager.full_name
                          .toLowerCase()
                          .includes(managerSearchTerm.toLowerCase()) ||
                        manager.projects.some((project) =>
                          project.title
                            .toLowerCase()
                            .includes(managerSearchTerm.toLowerCase())
                        )
                    ).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-1">
                        No managers match your search
                      </h3>
                      <p className="text-gray-500">
                        Try a different search term.
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Manager
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Projects
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-2">
                              <span>Total Story Points</span>
                              <select
                                value={storyPointsFilter}
                                onChange={(e) =>
                                  setStoryPointsFilter(
                                    e.target.value as
                                      | 'all'
                                      | 'weekly'
                                      | 'monthly'
                                  )
                                }
                                className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="all">All</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {managersWithProjects
                          .filter(
                            (manager) =>
                              manager.full_name
                                .toLowerCase()
                                .includes(managerSearchTerm.toLowerCase()) ||
                              manager.projects.some((project) =>
                                project.title
                                  .toLowerCase()
                                  .includes(managerSearchTerm.toLowerCase())
                              )
                          )
                          .map((manager) => (
                            <tr
                              key={manager.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-[#9A00FF] to-[#5A00B4] flex items-center justify-center text-white font-medium">
                                    {manager.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {manager.full_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 mb-2">
                                  {manager.projects.length} projects
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                      Manager Projects
                                    </h3>
                                    {manager.projects &&
                                    manager.projects.length > 0 ? (
                                      <div>
                                        <div className="text-sm text-gray-900">
                                          {(expandedProjects['manager']
                                            ? manager.projects
                                            : manager.projects.slice(0, 2)
                                          ).map((project) => (
                                            <div
                                              key={project.id}
                                              className="bg-gray-50 p-2 rounded-md mb-2"
                                            >
                                              <div
                                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedTAB('taskBoard');
                                                  setProjectId(project.id);
                                                  const projectData =
                                                    projects.find(
                                                      (p) => p.id === project.id
                                                    );
                                                  if (projectData) {
                                                    setdevops(
                                                      projectData.devops
                                                    );
                                                  }
                                                }}
                                              >
                                                {project.title}
                                              </div>
                                              <div className="flex items-center mt-1">
                                                <span className="text-xs text-green-600 font-medium">
                                                  {project.completedScore}
                                                </span>
                                                <span className="mx-1 text-xs text-gray-500">
                                                  /
                                                </span>
                                                <span className="text-xs text-red-500 font-medium">
                                                  {project.totalScore}
                                                </span>
                                                <div className="ml-2 flex-grow h-1.5 bg-gray-200 rounded-full">
                                                  <div
                                                    className="bg-green-500 h-1.5 rounded-full"
                                                    style={{
                                                      width: `${
                                                        project.totalScore > 0
                                                          ? (project.completedScore /
                                                              project.totalScore) *
                                                            100
                                                          : 0
                                                      }%`,
                                                    }}
                                                  ></div>
                                                </div>
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">
                                                Completed:{' '}
                                                {project.completedScore} |
                                                Pending: {project.pendingScore}
                                              </div>
                                            </div>
                                          ))}
                                          {manager.projects.length > 2 &&
                                            !expandedProjects['manager'] && (
                                              <button
                                                className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 transition-colors duration-200"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleExpandManagerProjects(
                                                    'manager'
                                                  );
                                                }}
                                              >
                                                Show More... (
                                                {manager.projects.length - 2}{' '}
                                                more)
                                              </button>
                                            )}
                                          {expandedProjects['manager'] &&
                                            manager.projects.length > 2 && (
                                              <button
                                                className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 transition-colors duration-200"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleExpandManagerProjects(
                                                    'manager'
                                                  );
                                                }}
                                              >
                                                Show Less
                                              </button>
                                            )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500">
                                        No projects assigned
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-green-600 font-medium">
                                    {manager.projects.reduce(
                                      (sum, project) =>
                                        sum + project.completedScore,
                                      0
                                    )}
                                  </span>
                                  <span className="mx-1 text-gray-500">/</span>
                                  <span className="text-red-500 font-medium">
                                    {manager.projects.reduce(
                                      (sum, project) =>
                                        sum + project.totalScore,
                                      0
                                    )}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className="bg-green-500 h-1.5 rounded-full"
                                    style={{
                                      width: `${
                                        manager.projects.reduce(
                                          (sum, project) =>
                                            sum + project.totalScore,
                                          0
                                        ) > 0
                                          ? (manager.projects.reduce(
                                              (sum, project) =>
                                                sum + project.completedScore,
                                              0
                                            ) /
                                              manager.projects.reduce(
                                                (sum, project) =>
                                                  sum + project.totalScore,
                                                0
                                              )) *
                                            100
                                          : 0
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Completed:{' '}
                                  {manager.projects.reduce(
                                    (sum, project) =>
                                      sum + project.completedScore,
                                    0
                                  )}{' '}
                                  | Pending:{' '}
                                  {manager.projects.reduce(
                                    (sum, project) =>
                                      sum + project.pendingScore,
                                    0
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Projects View */}
              {sortView === 'projects' && selectedView === 'cardView' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {projects.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500 text-lg">
                        No projects yet. Create one!
                      </p>
                    </div>
                  ) : projects.filter(
                      (project) =>
                        project.title
                          .toLowerCase()
                          .includes(projectSearchTerm.toLowerCase()) ||
                        (project.creatorName &&
                          project.creatorName
                            .toLowerCase()
                            .includes(projectSearchTerm.toLowerCase())) ||
                        (project.managerName &&
                          project.managerName
                            .toLowerCase()
                            .includes(projectSearchTerm.toLowerCase()))
                    ).length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500 text-lg">
                        No projects match your search.
                      </p>
                    </div>
                  ) : (
                    projects
                      .filter(
                        (project) =>
                          project.title
                            .toLowerCase()
                            .includes(projectSearchTerm.toLowerCase()) ||
                          (project.creatorName &&
                            project.creatorName
                              .toLowerCase()
                              .includes(projectSearchTerm.toLowerCase())) ||
                          (project.managerName &&
                            project.managerName
                              .toLowerCase()
                              .includes(projectSearchTerm.toLowerCase()))
                      )
                      .map((project) => (
                        <div
                          key={project.id}
                          className="bg-white rounded-[20px] w-full p-4 sm:p-6 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                          onClick={() => {
                            setSelectedTAB('taskBoard');
                            setdevops(project.devops);
                            setProjectId(project.id);
                            navigate(`/admin/projects/${project.id}`, {
                              replace: false,
                            });
                            dispatch(addProjectName(project.title));
                          }}
                        >
                          <div className="flex flex-col mb-4">
                            <div className="flex items-center justify-end mb-2">
                              <div className="flex space-x-2">
                                <button
                                  className="text-gray-400 hover:text-gray-600"
                                  onClick={(e) => openEditModal(project, e)}
                                >
                                  <Pencil size={16} color="#667085" />
                                </button>
                                <DeleteProjectDialog
                                  onConfirm={() =>
                                    handleDeleteProject(project.id)
                                  }
                                >
                                  <button
                                    className="text-red-600 hover:text-red-800"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </DeleteProjectDialog>
                              </div>
                            </div>
                            <div className="w-full border flex justify-between items-center pl-2 pr-2 py-2 bg-purple-400 rounded-lg ">
                              <div className="flex flex-col items-center gap-2 mb-1">
                                <span className="text-sm font-semibold">
                                  Story Points:
                                </span>
                                <select
                                  value={
                                    projectFilters[project.id] || 'monthly'
                                  }
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleProjectFilterChange(
                                      project.id,
                                      e.target.value as
                                        | 'all'
                                        | 'weekly'
                                        | 'monthly'
                                    );
                                  }}
                                  className="text-xs bg-white  rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 w-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="all">All</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                              <div className="flex  flex-col  justify-end">
                                <div className="  text-end">
                                  <span className="text-sm font-semibold w-full ">
                                    <span className="text-green-200">
                                      {project.completedScore}
                                    </span>
                                    <span className="text-gray-500"> / </span>
                                    <span className="text-red-500">
                                      {project.totalScore}
                                    </span>
                                  </span>
                                </div>
                                <div
                                  className={`${
                                    isSidrBarOpen
                                      ? 'text-[10px]'
                                      : 'text-[12px]'
                                  } text-gray-600 mt-1 font-extralight`}
                                >
                                  Completed:{' '}
                                  <span className="font-bold text-black">
                                    {project.completedScore}
                                  </span>{' '}
                                  | Pending:{' '}
                                  <span className="font-bold text-black">
                                    {project.pendingScore}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <h3 className="text-[22px] font-semibold text-[#263238] mb-4">
                            {project.title}
                          </h3>

                          {(project.managerName ||
                            project.creatorName !== 'Unknown') && (
                            <div>
                              <label className="font-semibold text-[15px] text-[#9A00FF]">
                                Manager:{' '}
                              </label>
                              <span className="text-sm font-semibold text-[#9A00FF]">
                                {project.managerName || project.creatorName}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-col items-start justify-between">
                            <div className="mb-2">
                              <span className="leading-7 text-[#686a6d]">
                                <label className="font-semibold">
                                  Developers:{' '}
                                </label>
                                <ul className="ml-2 list-disc list-inside">
                                  {project.devops &&
                                  project.devops.length > 0 ? (
                                    project.devops.map((dev) => (
                                      <li key={dev.id}>
                                        {dev.full_name ||
                                          dev.name ||
                                          'Unknown Developer'}
                                      </li>
                                    ))
                                  ) : (
                                    <li>No developers assigned</li>
                                  )}
                                </ul>
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-base leading-7 text-[#C4C7CF]">
                                {formatDistanceToNow(
                                  new Date(project.created_at)
                                )}{' '}
                                ago
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* Table View */}
              {sortView === 'projects' && selectedView === 'tableView' && (
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
                  {projects.length === 0 ? (
                    <p className="text-gray-500 p-6 text-center text-sm">
                      No projects yet. Create one!
                    </p>
                  ) : projects.filter(
                      (project) =>
                        project.title
                          .toLowerCase()
                          .includes(projectSearchTerm.toLowerCase()) ||
                        (project.creatorName &&
                          project.creatorName
                            .toLowerCase()
                            .includes(projectSearchTerm.toLowerCase())) ||
                        (project.managerName &&
                          project.managerName
                            .toLowerCase()
                            .includes(projectSearchTerm.toLowerCase()))
                    ).length === 0 ? (
                    <p className="text-gray-500 p-6 text-center text-sm">
                      No projects match your search.
                    </p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Project Name
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Manager
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Developers
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-2">
                              <span>Story Points</span>
                              <select
                                value={storyPointsFilter}
                                onChange={(e) =>
                                  setStoryPointsFilter(
                                    e.target.value as
                                      | 'all'
                                      | 'weekly'
                                      | 'monthly'
                                  )
                                }
                                className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="all">All</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Created
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {projects
                          .filter(
                            (project) =>
                              project.title
                                .toLowerCase()
                                .includes(projectSearchTerm.toLowerCase()) ||
                              (project.creatorName &&
                                project.creatorName
                                  .toLowerCase()
                                  .includes(projectSearchTerm.toLowerCase())) ||
                              (project.managerName &&
                                project.managerName
                                  .toLowerCase()
                                  .includes(projectSearchTerm.toLowerCase()))
                          )
                          .map((project) => (
                            <tr
                              key={project.id}
                              className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                              onClick={() => {
                                setSelectedTAB('taskBoard');
                                setdevops(project.devops);
                                setProjectId(project.id);
                              }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {project.title}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {project.managerName ||
                                    project.creatorName ||
                                    'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {project.devops && project.devops.length > 0 ? (
                                  <div>
                                    <div className="text-sm text-gray-900">
                                      {(expandedDevs[project.id]
                                        ? project.devops
                                        : project.devops.slice(0, 3)
                                      ).map((dev) => (
                                        <div
                                          key={dev.id}
                                          className="mb-1 flex items-center"
                                        >
                                          <span className="h-2 w-2 bg-purple-500 rounded-full mr-2"></span>
                                          {dev.full_name ||
                                            dev.name ||
                                            'Unknown Developer'}
                                        </div>
                                      ))}
                                      {project.devops.length > 3 &&
                                        !expandedDevs[project.id] && (
                                          <button
                                            className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleExpandDevs(project.id);
                                            }}
                                          >
                                            Show More... (
                                            {project.devops.length - 3} more)
                                          </button>
                                        )}
                                      {expandedDevs[project.id] &&
                                        project.devops.length > 3 && (
                                          <button
                                            className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleExpandDevs(project.id);
                                            }}
                                          >
                                            Show Less
                                          </button>
                                        )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">
                                    No developers assigned
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1 mb-1">
                                  <span className="text-green-600 font-semibold">
                                    {project.completedScore}
                                  </span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-red-500 font-semibold">
                                    {project.totalScore}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  Completed: {project.completedScore} | Pending:{' '}
                                  {project.pendingScore}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${
                                        project.totalScore > 0
                                          ? (project.completedScore /
                                              project.totalScore) *
                                            100
                                          : 0
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {formatDistanceToNow(
                                    new Date(project.created_at)
                                  )}{' '}
                                  ago
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  className="text-indigo-600 hover:text-indigo-800 mr-4 transition-colors duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(project, e);
                                  }}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-900 transition-colors duration-200"
                                  onClick={(e) =>
                                    handleDeleteProject(project.id, e)
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProjectsAdmin;
