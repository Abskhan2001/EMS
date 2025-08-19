import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PlusCircle,
  User,
  X,
  ArrowLeft,
  Plus,
  LayoutGrid,
  Table2,
  Edit3,
} from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { useAuthStore } from '../lib/store';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AttendanceContext } from '../pages/AttendanceContext';
import Comments from '../pages/Comments';
import NotionTableView from './NotionTableView';
import TodoTask from './TodoTask';
import EmployeTodoInput from './EmployeTodoInput';

interface Developer {
  id: string;
  name?: string;
  full_name?: string;
}

interface Task {
  id: string;
  title: string;
  created_at: string;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  score: number;
  priority?: string;
  devops?: Developer[];
  description?: string;
  imageurl?: string;
  comments?: Array<any>;
  commentCount?: number;
  deadline?: string;
}

const COLUMN_IDS = {
  todo: 'todo',
  inProgress: 'inProgress',
  review: 'review',
  done: 'done',
};

function TaskBoard({
  setSelectedTAB,
}: {
  setSelectedTAB: (tab: string) => void;
}) {
  const { projectIdd, devopsss, setdevopsss } = useContext(AttendanceContext);
  console.log('supabse pro id', projectIdd);
  const user = useAuthStore();
  const { id } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalKPI, setTotalKPI] = useState(0);
  const [isEmployeTodoInputOpen, setisEmployeTodoInputOpen] = useState(false);
  const [earnedKPI, setEarnedKPI] = useState(0);
  const [assignedKPIs, setAssignedKPIs] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentByTaskID, setCommentByTaskID] = useState({});
  const navigate = useNavigate();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  // New state variables for task creation
  const [userRole, setUserRole] = useState<string>('');
  const [isProjectManager, setIsProjectManager] = useState<boolean>(false);
  const [developersLoaded, setDevelopersLoaded] = useState<boolean>(false);
  const [projectDevelopers, setProjectDevelopers] = useState<Developer[]>([]);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    score: 0,
    priority: 'Low',
    deadline: '',
    selectedDevs: [] as string[],
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [openedTask, setOpenedTask] = useState<Task | null>(null);
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState('');
  const [view, setView] = useState<'card' | 'table'>('card');
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskData, setEditTaskData] = useState({
    title: '',
    description: '',
    score: 0
  });

  // Fetch user role, project manager status, and project developers on component mount
  useEffect(() => {
    const fetchUserRoleAndProjectInfo = async () => {
      try {
        const userId = localStorage.getItem('user_id');
        if (userId) {
          // Fetch user role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

          if (userData && !userError) {
            setUserRole(userData.role);
          }

          // Fetch project information to check if user is project manager
          const projectId = id || projectIdd[0];
          if (projectId) {
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('created_by, devops')
              .eq('id', projectId)
              .single();

            if (projectData && !projectError) {
              // Check if current user is the project manager (creator)
              const isManager = projectData.created_by === userId;
              setIsProjectManager(isManager);

              // Set project developers for task assignment
              if (projectData.devops && projectData.devops.length > 0) {
                setProjectDevelopers(projectData.devops);
                setDevelopersLoaded(true);

                // Also update context if empty
                if (devopsss.length === 0) {
                  setdevopsss(projectData.devops);
                }
              } else {
                // If project.devops is empty, fetch all users as fallback
                const { data: allUsers, error: usersError } = await supabase
                  .from('users')
                  .select('id, full_name')
                  .neq('role', 'admin'); // Exclude admins from assignment

                if (allUsers && !usersError) {
                  const formattedUsers = allUsers.map((user) => ({
                    id: user.id,
                    name: user.full_name,
                  }));
                  setProjectDevelopers(formattedUsers);
                  setdevopsss(formattedUsers);
                  setDevelopersLoaded(true);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role and project info:', error);
      }
    };

    fetchUserRoleAndProjectInfo();
  }, [id, projectIdd]); // Removed devopsss.length to avoid infinite loops

  const ViewToggle = ({ view, setView }) => (
    <div className="flex items-center gap-2 bg-[#232326] rounded-lg p-1">
      <button
        className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors duration-200
          ${
            view === 'card'
              ? 'bg-[#9A00FF] text-white'
              : 'text-gray-300 hover:bg-[#18181A]'
          }
        `}
        onClick={() => setView('card')}
      >
        <LayoutGrid size={18} />
        <span className="hidden sm:inline">Card</span>
      </button>
      <button
        className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors duration-200
          ${
            view === 'table'
              ? 'bg-[#9A00FF] text-white'
              : 'text-gray-300 hover:bg-[#18181A]'
          }
        `}
        onClick={() => setView('table')}
      >
        <Table2 size={18} />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );

  const handleQuickAddTask = async (title: string) => {
    try {
      const currentUserId = localStorage.getItem('user_id');
      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', currentUserId)
        .single();

      const assignedDevs =
        currentUserData && !userError
          ? [
              {
                id: currentUserId!,
                name: currentUserData.full_name || 'Unknown',
              },
            ]
          : [];
      const newTask = {
        title: title,
        project_id: id || projectIdd[0],
        status: 'todo',
        score: 0,
        priority: 'Low',
        devops: assignedDevs,
        description: '',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    newStatus: 'done' | Task['status']
  ) => {
    try {
      const { error } = await supabase
        .from('tasks_of_projects')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Define fetchTasks at the component level so it can be called from anywhere
  const fetchTasks = async () => {
    try {
      const userId = localStorage.getItem('user_id');

      // Step 1: Fetch all tasks in the selected project
      const { data: taskData, error: taskError } = await supabase
        .from('tasks_of_projects')
        .select('*')
        .eq('project_id', id || projectIdd[0])
        .order('created_at', { ascending: true });

      if (taskError) throw taskError;

      // Step 2: Filter tasks based on devops array (manually, not joined)
      const filteredTasks = taskData.filter((task) => {
        return (
          (Array.isArray(task.devops) &&
            task.devops.some((dev) => dev.id === userId)) ||
          !task.devops ||
          task.devops.length === 0
        );
      });

      // Step 3: Fetch all comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*');

      if (commentsError) throw commentsError;

      // Step 4: Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name');

      if (usersError) throw usersError;

      // Step 5: Create user map
      const userMap = usersData.reduce((acc, user) => {
        acc[user.id] = user.full_name;
        return acc;
      }, {});

      // Step 6: Enrich comments with user names
      const enrichedComments = commentsData.map((comment) => ({
        ...comment,
        commentor_name: userMap[comment.user_id] || 'Unknown User',
      }));

      setComments(enrichedComments); // For global comment list if needed

      // Step 7: Attach comments and images to tasks
      const processedTasks = filteredTasks.map((task) => {
        const taskComments = enrichedComments.filter(
          (comment) => comment.task_id === task.id
        );

        const imageData = task.imageurl
          ? {
              image_url: task.imageurl,
              thumbnail_url: task.imageurl, // Placeholder: customize for thumbnails
            }
          : {};

        return {
          ...task,
          comments: taskComments,
          commentCount: taskComments.length,
          ...imageData,
        };
      });

      setTasks(processedTasks);

      // Step 8: Group comments by task ID
      const commentsByTask = enrichedComments.reduce((acc, comment) => {
        if (!acc[comment.task_id]) acc[comment.task_id] = [];
        acc[comment.task_id].push(comment);
        return acc;
      }, {});

      setCommentByTaskID(commentsByTask);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Show toast, alert, etc. if needed
    }
  };

  useEffect(() => {
    // const fetchTasks = async () => {
    //   const { data: taskData, error: taskError } = await supabase
    //     .from("tasks_of_projects")
    //     .select("*")
    //     .eq("project_id", id || projectIdd[0])
    //     .order("created_at", { ascending: true });

    //   if (taskData && !taskError) {
    //     const userId = localStorage.getItem("user_id");

    //     // Filter tasks based on devops condition
    //     const filteredTasks = taskData.filter((task) => {
    //       return (
    //         (Array.isArray(task.devops) &&
    //           task.devops.some((dev) => dev.id === userId)) ||
    //         !task.devops ||
    //         task.devops.length === 0
    //       );
    //     });

    //     // Fetch comments
    //     const { data: commentsData, error: commentsError } = await supabase
    //       .from("comments")
    //       .select("*");

    //     if (commentsData && !commentsError) {
    //       // Fetch users for commentor names
    //       const { data: usersData, error: usersError } = await supabase
    //         .from("users")
    //         .select("id, full_name");

    //       if (usersData && !usersError) {
    //         // Create user map
    //         const userMap = {};
    //         usersData.forEach((user) => {
    //           userMap[user.id] = user.full_name;
    //         });

    //         // Add commentor_name to each comment
    //         const enrichedComments = commentsData.map((comment) => ({
    //           ...comment,
    //           commentor_name: userMap[comment.user_id] || "Unknown User",
    //         }));

    //         setComments(enrichedComments);

    //         // Map comments to each task
    //         const tasksWithComments = filteredTasks.map((task) => {
    //           const taskComments = enrichedComments.filter(
    //             (comment) => comment.task_id === task.id
    //           );
    //           return {
    //             ...task,
    //             comments: taskComments,
    //             commentCount: taskComments.length,
    //           };
    //         });

    //         setTasks(tasksWithComments);

    //         // Group comments by task_id
    //         const commentsByTask = enrichedComments.reduce((acc, comment) => {
    //           if (!acc[comment.task_id]) acc[comment.task_id] = [];
    //           acc[comment.task_id].push(comment);
    //           return acc;
    //         }, {});

    //         setCommentByTaskID(commentsByTask);
    //       }
    //     }
    //   }
    // };
    const fetchTasks = async () => {
      try {
        const userId = localStorage.getItem('user_id');

        // Step 1: Fetch all tasks in the selected project
        const { data: taskData, error: taskError } = await supabase
          .from('tasks_of_projects')
          .select('*')
          .eq('project_id', id || projectIdd[0])
          .order('created_at', { ascending: true });

        if (taskError) throw taskError;

        // Step 2: Filter tasks based on devops array (manually, not joined)
        const filteredTasks = taskData.filter((task) => {
          return (
            (Array.isArray(task.devops) &&
              task.devops.some((dev) => dev.id === userId)) ||
            !task.devops ||
            task.devops.length === 0
          );
        });

        // Step 3: Fetch all comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*');

        if (commentsError) throw commentsError;

        // Step 4: Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name');

        if (usersError) throw usersError;

        // Step 5: Create user map
        const userMap = usersData.reduce((acc, user) => {
          acc[user.id] = user.full_name;
          return acc;
        }, {});

        // Step 6: Enrich comments with user names
        const enrichedComments = commentsData.map((comment) => ({
          ...comment,
          commentor_name: userMap[comment.user_id] || 'Unknown User',
        }));

        setComments(enrichedComments); // For global comment list if needed

        // Step 7: Attach comments and images to tasks
        const processedTasks = filteredTasks.map((task) => {
          const taskComments = enrichedComments.filter(
            (comment) => comment.task_id === task.id
          );

          const imageData = task.imageurl
            ? {
                image_url: task.imageurl,
                thumbnail_url: task.imageurl, // Placeholder: customize for thumbnails
              }
            : {};

          return {
            ...task,
            comments: taskComments,
            commentCount: taskComments.length,
            ...imageData,
          };
        });

        processedTasks.sort((a, b) => {
          const priorityOrder = { High: 0, Medium: 1, Low: 2 };
          const aPriority = a.priority || 'Other';
          const bPriority = b.priority || 'Other';
          return (
            (priorityOrder[aPriority] ?? 3) - (priorityOrder[bPriority] ?? 3)
          );
        });
        console.log('the task is', processedTasks);

        setTasks(processedTasks);

        // Step 8: Group comments by task ID
        const commentsByTask = enrichedComments.reduce((acc, comment) => {
          if (!acc[comment.task_id]) acc[comment.task_id] = [];
          acc[comment.task_id].push(comment);
          return acc;
        }, {});

        setCommentByTaskID(commentsByTask);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Show toast, alert, etc. if needed
      }
    };

    fetchTasks();
  }, [id, projectIdd]);

  useEffect(() => {
    const fetchKPI = async () => {
      const { data, error } = await supabase
        .from('tasks_of_projects')
        .select('score, status, devops')
        .eq('project_id', id);

      if (data && !error) {
        const userId = localStorage.getItem('user_id');

        const earnedScores = data
          .filter(
            (task) =>
              task.status === 'done' &&
              task.devops?.some((devop) => devop.id === userId)
          )
          .map((task) => task.score || 0);
        const totalEarnedScore = earnedScores.reduce(
          (sum, score) => sum + score,
          0
        );
        setEarnedKPI(totalEarnedScore);

        const assignedScores = data
          .filter((task) => task.devops?.some((devop) => devop.id === userId))
          .map((task) => task.score || 0);
        const totalAssignedScore = assignedScores.reduce(
          (sum, score) => sum + score,
          0
        );
        setAssignedKPIs(totalAssignedScore);

        const totalScores = data.map((task) => task.score || 0);
        const total = totalScores.reduce((sum, score) => sum + score, 0);
        setTotalKPI(total);
      }
    };

    fetchKPI();
  }, [id]);

  const getTasksByStatus = (status: Task['status']) =>
    tasks.filter((task) => task.status === status);

  const getStatusCount = (status: Task['status']) =>
    tasks.filter((task) => task.status === status).length;

  const totalTasks = tasks.length;
  const completedTasks = getTasksByStatus('done').length;
  const pendingTasks = totalTasks - completedTasks;

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newTasks = Array.from(tasks);
    const draggedTask = newTasks.find((task) => task.id === draggableId);
    if (!draggedTask) return;

    newTasks.splice(newTasks.indexOf(draggedTask), 1);
    const tasksInDestination = newTasks.filter(
      (task) => task.status === destination.droppableId
    );
    const insertIndex =
      newTasks.findIndex((task) => task.status === destination.droppableId) +
      destination.index;

    draggedTask.status = destination.droppableId as Task['status'];
    newTasks.splice(insertIndex, 0, draggedTask);

    setTasks(newTasks);

    try {
      const { error } = await supabase
        .from('tasks_of_projects')
        .update({ status: destination.droppableId })
        .eq('id', draggedTask.id);

      if (error) {
        console.error('Error updating task status:', error.message);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: String(Date.now()),
      title: newTaskTitle,
      created_at: new Date().toISOString(),
      status: 'todo',
      score: 0,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  // Function to start editing a task
  const handleEditTask = (task: Task) => {
    setEditTaskData({
      title: task.title,
      description: task.description || '',
      score: task.score || 0
    });
    setIsEditingTask(true);
  };

  // Function to save edited task
  const handleSaveTask = async () => {
    if (!openedTask || !editTaskData.title.trim()) return;

    try {
      const { error } = await supabase
        .from('tasks_of_projects')
        .update({
          title: editTaskData.title.trim(),
          description: editTaskData.description.trim() || null,
          score: editTaskData.score
        })
        .eq('id', openedTask.id);

      if (error) throw error;

      // Update the task in local state
      const updatedTask = {
        ...openedTask,
        title: editTaskData.title.trim(),
        description: editTaskData.description.trim() || null,
        score: editTaskData.score
      };

      setTasks(tasks.map(task =>
        task.id === openedTask.id ? updatedTask : task
      ));
      setOpenedTask(updatedTask);
      setIsEditingTask(false);

      console.log('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setIsEditingTask(false);
    setEditTaskData({
      title: '',
      description: '',
      score: 0
    });
  };

  // Handle developer selection for task assignment
  const handleDeveloperChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value && !newTask.selectedDevs.includes(value)) {
      setNewTask({
        ...newTask,
        selectedDevs: [...newTask.selectedDevs, value],
      });
    }
  };

  // Remove developer from task assignment
  const removeDeveloper = (id: string) => {
    setNewTask({
      ...newTask,
      selectedDevs: newTask.selectedDevs.filter((devId) => devId !== id),
    });
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Supabase storage
  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `task-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('newtaskimage')
        .upload(filePath, imageFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('newtaskimage').getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      throw err;
    }
  };

  // Remove image preview
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle task creation with role-based assignment logic
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Upload image if exists
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Determine task assignment based on user role
      let assignedDevs: Developer[] = [];
      const currentUserId = localStorage.getItem('user_id');

      if (isProjectManager || userRole === 'admin') {
        // Managers and admins can assign to selected developers
        if (newTask.selectedDevs.length > 0) {
          // Fetch developer names from database
          const { data: developersData, error: devsError } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', newTask.selectedDevs);

          if (developersData && !devsError) {
            assignedDevs = developersData.map(
              (dev) =>
                ({
                  id: dev.id,
                  name: dev.full_name || 'Unknown',
                } as Developer)
            );
          } else {
            // Fallback to projectDevelopers data if database fetch fails
            assignedDevs = newTask.selectedDevs.map((devId) => {
              const dev =
                projectDevelopers.find((d: any) => d.id === devId) ||
                devopsss.find((d: any) => d.id === devId);
              return {
                id: devId,
                name:
                  (dev as any)?.name || (dev as any)?.full_name || 'Unknown',
              } as Developer;
            });
          }
        } else {
          // If no developers selected, assign to self - fetch from database
          const { data: currentUserData, error: userError } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', currentUserId)
            .single();

          if (currentUserData && !userError) {
            assignedDevs = [
              {
                id: currentUserId!,
                name: currentUserData.full_name || 'Unknown',
              } as Developer,
            ];
          }
        }
      } else {
        // Regular employees can only assign tasks to themselves - fetch from database
        const { data: currentUserData, error: userError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('id', currentUserId)
          .single();

        if (currentUserData && !userError) {
          assignedDevs = [
            {
              id: currentUserId!,
              name: currentUserData.full_name || 'Unknown',
            } as Developer,
          ];
        }
      }

      // Create task in database
      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert([
          {
            project_id: id || projectIdd[0],
            title: newTask.title,
            description: newTask.description,
            devops: assignedDevs,
            status: 'todo',
            score: newTask.score,
            priority: newTask.priority || 'Low',
            created_at: new Date().toISOString(),
            imageurl: imageUrl,
            deadline: newTask.deadline || null,
          },
        ])
        .select();

      if (error) throw error;

      // Reset form and close modal
      setNewTask({
        title: '',
        description: '',
        score: 0,
        priority: 'Low',
        deadline: '',
        selectedDevs: [],
      });
      setImageFile(null);
      setImagePreview(null);
      setIsCreateTaskModalOpen(false);

      // Refresh tasks
      await fetchTasks();

      alert('Task created successfully!');
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 p-3 rounded-2xl mb-4 bg-white shadow-sm border-b border-gray-100">
          {/* Arrow + Heading + New Task Button */}

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Link
                to={
                  localStorage.getItem('user_email')?.endsWith('@admin.com')
                    ? '/admin'
                    : '/'
                }
                className="text-gray-600 hover:text-gray-800"
                onClick={(e) => {
                  e.preventDefault();
                  const isAdmin = localStorage
                    .getItem('user_email')
                    ?.endsWith('@admin.com');
                  navigate(isAdmin ? '/admin' : '/tasks');
                }}
              >
                <ArrowLeft
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  size={35}
                  onClick={() => setSelectedTAB('Projects')}
                />
              </Link>
              <h1 className="text-md md:text-2xl font-bold text-gray-800">
                Work Planner
              </h1>
              {isProjectManager && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Project Manager
                </span>
              )}
              {userRole === 'admin' && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Admin
                </span>
              )}
            </div>
            <div>
              <button
                className="bg-[#9A00FF] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors duration-200 whitespace-nowrap"
                onClick={() => setIsCreateTaskModalOpen(true)}
              >
                <PlusCircle size={20} className="mr-2" /> New Task
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
            <div className="bg-white w-full lg:w-[60%] p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap justify-between gap-4 font-semibold text-sm">
              <span className="font-semibold text-[13px] text-red-500 mr-2">
                Total Tasks: <strong>{totalTasks}</strong>
              </span>
              <span className="font-semibold text-[13px] text-yellow-600">
                Pending Tasks:{' '}
                <strong>{String(pendingTasks).padStart(2, '0')}</strong>
              </span>
              <span className="mx-3 font-semibold text-[13px] text-green-500">
                Completed Tasks: <strong>{completedTasks}</strong>
              </span>
            </div>
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        {view === 'card' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-6">
              {/* Todo Column */}
              <div className="bg-white rounded-[20px] p-4 shadow-md h-[calc(100vh-300px)] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <h2 className="font-semibold text-xl leading-7 text-[#9A00FF]">
                    To doo
                  </h2>

                  <span className="text-gray-600">
                    {getStatusCount('todo')}
                  </span>
                </div>
                <div className="my-2">
                  <button
                    onClick={() => setisEmployeTodoInputOpen(true)}
                    className="w-full flex items-center gap-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-200"
                  >
                    <Plus size={16} />
                    <span className="text-sm">Add a task</span>
                  </button>
                  {isEmployeTodoInputOpen && (
                    <EmployeTodoInput fetchTasks={fetchTasks} projectId={id} />
                  )}
                </div>
                <div></div>
                <Droppable droppableId={COLUMN_IDS.todo}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-4 pr-2 task-scroll ${
                        snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg' : ''
                      }`}
                      style={{ minHeight: '100px' }}
                    >
                      {getTasksByStatus('todo').length > 0 ? (
                        getTasksByStatus('todo').map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            commentByTaskID={commentByTaskID}
                            descriptionOpen={descriptionOpen}
                            setDescriptionOpen={setDescriptionOpen}
                            fetchTasks={fetchTasks}
                            setOpenedTask={setOpenedTask}
                            isFullImageOpen={isFullImageOpen}
                            setIsFullImageOpen={setIsFullImageOpen}
                            fullImageUrl={fullImageUrl}
                            setFullImageUrl={setFullImageUrl}
                          />
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          {snapshot.isDraggingOver ? 'Drop here' : 'No tasks'}
                        </div>
                      )}
                      {provided.placeholder}

                      {/* Quick Add Task Button */}
                    </div>
                  )}
                </Droppable>
              </div>

              <div className="bg-white rounded-[20px] p-4 shadow-md h-[calc(100vh-300px)] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <h2 className="font-semibold text-xl leading-7 text-orange-600">
                    In Progress
                  </h2>
                  <span className="text-gray-600">
                    {getStatusCount('inProgress')}
                  </span>
                </div>
                <Droppable droppableId={COLUMN_IDS.inProgress}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-4 pr-2 task-scroll ${
                        snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg' : ''
                      }`}
                      style={{ minHeight: '100px' }}
                    >
                      {getTasksByStatus('inProgress').length > 0 ? (
                        getTasksByStatus('inProgress').map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            commentByTaskID={commentByTaskID}
                            descriptionOpen={descriptionOpen}
                            setDescriptionOpen={setDescriptionOpen}
                            fetchTasks={fetchTasks}
                            setOpenedTask={setOpenedTask}
                            isFullImageOpen={isFullImageOpen}
                            setIsFullImageOpen={setIsFullImageOpen}
                            fullImageUrl={fullImageUrl}
                            setFullImageUrl={setFullImageUrl}
                          />
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          {snapshot.isDraggingOver ? 'Drop here' : 'No tasks'}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Review Column */}
              <div className="bg-white rounded-[20px] p-4 shadow-md h-[calc(100vh-300px)] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <h2 className="font-semibold text-xl leading-7 text-yellow-600">
                    Review
                  </h2>
                  <span className="text-gray-600">
                    {String(getStatusCount('review')).padStart(2, '0')}
                  </span>
                </div>
                <Droppable droppableId={COLUMN_IDS.review}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto space-y-4 pr-2 task-scroll ${
                        snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg' : ''
                      }`}
                      style={{ minHeight: '100px' }}
                    >
                      {getTasksByStatus('review').length > 0 ? (
                        getTasksByStatus('review').map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            commentByTaskID={commentByTaskID}
                            descriptionOpen={descriptionOpen}
                            setDescriptionOpen={setDescriptionOpen}
                            fetchTasks={fetchTasks}
                            setOpenedTask={setOpenedTask}
                            isFullImageOpen={isFullImageOpen}
                            setIsFullImageOpen={setIsFullImageOpen}
                            fullImageUrl={fullImageUrl}
                            setFullImageUrl={setFullImageUrl}
                          />
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          {snapshot.isDraggingOver ? 'Drop here' : 'No tasks'}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Done Column */}
              <div className="bg-white rounded-[20px] p-4 shadow-md h-[calc(100vh-300px)] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <h2 className="font-semibold text-xl leading-7 text-[#05C815]">
                    Done
                  </h2>
                  <span className="text-gray-600">
                    {getStatusCount('done')}
                  </span>
                </div>

                <div
                  className="flex-1 overflow-y-auto space-y-4 pr-2 task-scroll"
                  style={{ minHeight: '100px' }}
                >
                  <p className="text-sm text-gray-400 font-semibold text-center">
                    Completed Tasks
                  </p>

                  {getTasksByStatus('done').length > 0 ? (
                    getTasksByStatus('done').map((task, index) => (
                      // Render a simplified version of TaskCard without Draggable
                      <div
                        key={task.id}
                        className="group bg-[#F5F5F9] rounded-[10px] shadow-lg px-4 pt-4 pb-3 space-y-2 mb-3"
                      >
                        {/* Title */}
                        <p className="text-[14px] leading-5 font-semibold text-[#404142]">
                          {task.title}
                        </p>

                        {/* Priority & Score */}
                        <div className="flex flex-row items-center gap-3">
                          {task.priority && (
                            <span
                              className={`text-[12px] text-white font-semibold rounded px-2 py-[2px] capitalize
                ${
                  task.priority === 'High'
                    ? 'bg-red-500'
                    : task.priority === 'Medium'
                    ? 'bg-yellow-600'
                    : task.priority === 'Low'
                    ? 'bg-green-400'
                    : ''
                }`}
                            >
                              {task.priority}
                            </span>
                          )}
                          <span className="text-[13px] text-[#404142] font-medium">
                            {task.score}
                          </span>
                        </div>

                        {/* Devops Info + Comments */}
                        {task.devops && task.devops.length > 0 && (
                          <div className="flex justify-between items-center mt-1">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-[#9A00FF] text-white font-semibold flex items-center justify-center">
                                {task.devops
                                  .map((dev) => {
                                    const displayName =
                                      dev.name || dev.full_name || 'U';
                                    return displayName[0].toUpperCase();
                                  })
                                  .join('')}
                              </div>
                              <span className="text-[13px] text-[#404142]">
                                {task.devops
                                  .map((dev) => {
                                    const displayName =
                                      dev.name || dev.full_name || 'Unknown';
                                    return (
                                      displayName.charAt(0).toUpperCase() +
                                      displayName.slice(1)
                                    );
                                  })
                                  .join(', ')}
                              </span>
                            </div>
                            {(task.commentCount || 0) > 0 && (
                              <span className="text-sm text-gray-600">
                                {task.commentCount}{' '}
                                {task.commentCount === 1
                                  ? 'comment'
                                  : 'comments'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Time */}
                        <div className="flex justify-between items-center">
                          <p className="text-[12px] text-[#949597]">
                            {formatDistanceToNow(new Date(task.created_at))} ago
                          </p>
                        </div>

                        {/* Comments Section */}
                        <div>
                          <Comments
                            taskid={task.id}
                            onCommentAdded={fetchTasks}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      No completed tasks
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-white rounded-xl p-4">
            <NotionTableView
              tasks={tasks}
              developers={devopsss}
              onAddTask={() => setIsCreateTaskModalOpen(true)}
              onTaskStatusChange={handleTaskStatusChange}
              onQuickAddTask={handleQuickAddTask}
            />
          </div>
        )}
      </div>
      <div
        className={` ${
          descriptionOpen ? 'hidden' : ''
        } fixed bottom-6 flex flex-row right-16 bg-[#ffffff] rounded-2xl shadow-lg p-4 mr-5 text-right gap-3 z-50`}
      >
        <p className="font-bold text-[13px] text-red-500">
          Total KPIs: {totalKPI}
        </p>
        <p className="font-bold text-[13px] text-yellow-600">
          Assigned KPIs: {assignedKPIs}
        </p>
        <p className="font-bold text-[13px] text-green-600">
          Earned KPIs: {earnedKPI}
        </p>
      </div>

      {/* Task Detail Modal - Moved to main component level */}
      {descriptionOpen && openedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in p-6 relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              {isEditingTask ? (
                <input
                  type="text"
                  value={editTaskData.title}
                  onChange={(e) => setEditTaskData({...editTaskData, title: e.target.value})}
                  className="text-xl font-semibold text-gray-800 border-2 border-blue-500 rounded px-2 py-1 flex-1 mr-4"
                  placeholder="Task title"
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-800">
                  {openedTask.title}
                </h2>
              )}
              <div className="flex items-center gap-2">
                {isEditingTask ? (
                  <>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      onClick={handleSaveTask}
                    >
                      Save
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1"
                      onClick={() => handleEditTask(openedTask)}
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const textToCopy = `${openedTask.title}\n\n${
                          openedTask.description || ''
                        }`;
                        navigator.clipboard.writeText(textToCopy);
                        alert('Title and description copied to clipboard!');
                      }}
                    >
                      Copy Text
                    </button>
                  </>
                )}
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDescriptionOpen(false);
                    setOpenedTask(null);
                    setIsEditingTask(false);
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image View */}
            {openedTask.imageurl && (
              <>
                <img
                  src={openedTask.imageurl}
                  alt="Task"
                  className="max-w-full p-2 border-2 border-gray-200 rounded-2xl mb-4 max-h-[60vh] object-contain cursor-pointer"
                  onClick={() => {
                    setFullImageUrl(openedTask.imageurl || '');
                    setIsFullImageOpen(true);
                  }}
                />
                {isFullImageOpen && (
                  <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                    onClick={() => setIsFullImageOpen(false)}
                  >
                    <button
                      className="absolute top-5 right-5 text-white hover:text-gray-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFullImageOpen(false);
                      }}
                    >
                      <X className="w-7 h-7" />
                    </button>
                    <img
                      src={fullImageUrl}
                      alt="Full"
                      className="max-w-[95vw] max-h-[90vh] object-contain"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </>
            )}

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              {isEditingTask ? (
                <textarea
                  value={editTaskData.description}
                  onChange={(e) => setEditTaskData({...editTaskData, description: e.target.value})}
                  className="w-full p-3 border-2 border-blue-500 rounded-lg text-sm text-gray-700 leading-relaxed resize-none"
                  rows={4}
                  placeholder="Task description (optional)"
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed p-3 bg-gray-50 rounded-lg min-h-[100px]">
                  {openedTask.description || 'No description provided'}
                </p>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
              <div>
                <span className="font-semibold">KPIs:</span>{' '}
                {isEditingTask ? (
                  <input
                    type="number"
                    value={editTaskData.score}
                    onChange={(e) => setEditTaskData({...editTaskData, score: parseInt(e.target.value) || 0})}
                    className="border border-gray-300 rounded px-2 py-1 w-20 ml-2"
                    min="0"
                  />
                ) : (
                  openedTask.score
                )}
              </div>
              <div>
                <span className="font-semibold">Developer:</span>{' '}
                {openedTask.devops
                  ?.map((dev) => (dev.name ? dev.name : 'Unknown'))
                  .join(', ')}
              </div>
              {openedTask.priority && (
                <div>
                  <span className="font-semibold">Priority:</span>{' '}
                  <span
                    className={`${
                      openedTask.priority === 'High'
                        ? 'bg-red-500'
                        : openedTask.priority === 'Medium'
                        ? 'bg-yellow-600'
                        : openedTask.priority === 'Low'
                        ? 'bg-green-400'
                        : ''
                    } text-[14px] text-white font-semibold rounded px-2 py-[2px] capitalize`}
                  >
                    {openedTask.priority}
                  </span>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="flex flex-col gap-4">
              <Comments taskid={openedTask.id} onCommentAdded={fetchTasks} />
              {commentByTaskID[openedTask.id]?.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {commentByTaskID[openedTask.id].map((comment) => (
                    <div
                      key={comment.comment_id}
                      className="flex items-start space-x-2 bg-gray-50 border rounded-lg p-2 shadow-sm"
                    >
                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold uppercase">
                        {comment.commentor_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-semibold">
                            {comment.commentor_name}
                          </p>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Create New Task
                </h2>
                <button
                  onClick={() => {
                    setIsCreateTaskModalOpen(false);
                    setError('');
                    setNewTask({
                      title: '',
                      description: '',
                      score: 0,
                      priority: 'Low',
                      deadline: '',
                      selectedDevs: [],
                    });
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleCreateTask}
                className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2"
              >
                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter task title"
                    required
                  />
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>

                {/* Score and Priority Row */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Score
                    </label>
                    <input
                      type="number"
                      value={newTask.score}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          score: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter task score"
                      min="0"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({ ...newTask, priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Deadline and Image Row */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) =>
                        setNewTask({ ...newTask, deadline: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Image (Optional)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Developer Assignment - Only show for project managers/admins */}
                {(isProjectManager || userRole === 'admin') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Developers{' '}
                      {isProjectManager ? '(Project Manager)' : '(Admin)'}{' '}
                      (Leave empty to assign to yourself)
                    </label>
                    <select
                      onChange={handleDeveloperChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value=""
                    >
                      <option value="">
                        {developersLoaded
                          ? 'Select Developer'
                          : 'Loading developers...'}
                      </option>
                      {!developersLoaded ? (
                        <option disabled>Loading...</option>
                      ) : (
                        projectDevelopers?.map((dev: any) => (
                          <option key={dev.id} value={dev.id}>
                            {dev.name || dev.full_name || 'Unknown Developer'}
                          </option>
                        ))
                      )}
                    </select>

                    {/* Selected Developers */}
                    {newTask.selectedDevs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {newTask.selectedDevs.map((devId) => {
                          const dev = projectDevelopers.find(
                            (d: any) => d.id === devId
                          );
                          return dev ? (
                            <div
                              key={devId}
                              className="flex items-center bg-blue-100 px-3 py-1 rounded-full"
                            >
                              <span className="mr-2 text-sm">
                                {dev.name || (dev as any).full_name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDeveloper(devId)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Role-based assignment info */}
                {!isProjectManager && userRole !== 'admin' && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> This task will be assigned to you
                      automatically. Only the project manager can assign tasks
                      to other developers.
                    </p>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateTaskModalOpen(false);
                      setError('');
                      setNewTask({
                        title: '',
                        description: '',
                        score: 0,
                        priority: 'Low',
                        deadline: '',
                        selectedDevs: [],
                      });
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#9A00FF] text-white rounded-md hover:bg-[#8500e6] disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  index: number;
  commentByTaskID: Record<string, any[]>;
  descriptionOpen: boolean;
  setDescriptionOpen: (open: boolean) => void;
  fetchTasks: () => Promise<void>;
  setOpenedTask: (task: Task | null) => void;
  isFullImageOpen: boolean;
  setIsFullImageOpen: (open: boolean) => void;
  fullImageUrl: string;
  setFullImageUrl: (url: string) => void;
}

const TaskCard = ({
  task,
  index,
  commentByTaskID,
  descriptionOpen,
  setDescriptionOpen,
  fetchTasks,
  setOpenedTask,
  isFullImageOpen,
  setIsFullImageOpen,
  fullImageUrl,
  setFullImageUrl,
}: TaskCardProps) => {
  // Function to handle task card click
  const handleTaskClick = (e: React.MouseEvent) => {
    // Only open the task details if the user clicked on the card itself, not on interactive elements
    const target = e.target as HTMLElement;

    // Check if the click was on a button or interactive element that should not trigger the modal
    const isInteractiveElement =
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea');

    // If it's an interactive element, don't open the task details
    if (isInteractiveElement) {
      return;
    }

    // Open the task details when clicking on the card
    setOpenedTask(task);
    setDescriptionOpen(true);
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className="group bg-[#F5F5F9] rounded-[10px] shadow-lg px-4 pt-4 pb-3 space-y-2 mb-3 hover:shadow-xl transition-shadow duration-300 cursor-pointer"
          onClick={handleTaskClick}
        >
          {/* Image Preview */}
          {task.imageurl && (
            <div className="relative aspect-video mb-2 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={task.imageurl}
                alt={`Preview for ${task.title}`}
                className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
          {/* Title */}
          <p className="text-[14px] leading-5 font-semibold text-[#404142]">
            {task.title}
          </p>

          {/* Priority & Score */}
          <div className="flex flex-row items-center gap-3">
            {task.priority && (
              <span
                className={`text-[12px] text-white font-semibold rounded px-2 py-[2px] capitalize
                  ${
                    task.priority === 'High'
                      ? 'bg-red-500'
                      : task.priority === 'Medium'
                      ? 'bg-yellow-600'
                      : task.priority === 'Low'
                      ? 'bg-green-400'
                      : ''
                  }`}
              >
                {task.priority}
              </span>
            )}
            <span className="text-[13px] text-[#404142] font-medium">
              {task.score}
            </span>
          </div>

          {/* Devops Info + Comments */}
          {task.devops && task.devops.length > 0 && (
            <div className="flex justify-between items-center mt-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-[#9A00FF] text-white font-semibold flex items-center justify-center">
                  {task.devops
                    .map((dev) => {
                      const displayName = dev.name || dev.full_name || 'U';
                      return displayName[0].toUpperCase();
                    })
                    .join('')}
                </div>
                <span className="text-[13px] text-[#404142]">
                  {task.devops
                    .map((dev) => {
                      const displayName =
                        dev.name || dev.full_name || 'Unknown';
                      return (
                        displayName.charAt(0).toUpperCase() +
                        displayName.slice(1)
                      );
                    })
                    .join(', ')}
                </span>
              </div>
              {(task.commentCount || 0) > 0 && (
                <span className="text-sm text-gray-600">
                  {task.commentCount}{' '}
                  {task.commentCount === 1 ? 'comment' : 'comments'}
                </span>
              )}
            </div>
          )}

          {/* Time */}
          <div className="flex justify-between items-center">
            <p className="text-[12px] text-[#949597]">
              {formatDistanceToNow(new Date(task.created_at))} ago
            </p>
          </div>

          {/* Comments Section */}
          <div>
            <Comments taskid={task.id} onCommentAdded={fetchTasks} />
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskBoard;
