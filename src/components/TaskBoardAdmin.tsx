import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PlusCircle,
  User,
  X,
  ArrowLeft,
  DotIcon,
  Plus,
  Pencil,
  Trash2,
  Minus,
} from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { useAuthStore } from '../lib/store';
import { formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Table2 } from 'lucide-react';
import NotionTableView from './NotionTableView';
import { supabase } from '../lib/supabase';
import AddNewTask from '../AddNewTask';
import { AttendanceContext } from '../pages/AttendanceContext';
import { useContext } from 'react';
import Comments from '../pages/Comments';
import { title } from 'process';
import TodoTask from './TodoTask';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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
  devops?: Developer[];
  description?: string;
  priority?: string;
  deadline?: string; // Changed from Date to string
  imageurl?: string;
  image_url?: string;
  thumbnail_url?: string;
  commentCount?: number;
  comments?: any[];
}

const COLUMN_IDS = {
  todo: 'todo',
  inProgress: 'inProgress',
  review: 'review',
  done: 'done',
};

function TaskBoardAdmin({ setSelectedTAB, selectedTAB, ProjectId, devopss }) {
  const user = useAuthStore();
  const { id } = useParams();
  const [selectedTab, setSelectedTab] = useState('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [devopsScores, setDevopsScores] = useState<
    { id: string; name: string; score: number; completed: number }[]
  >([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deadline, setDeadline] = useState<string>('');
  const selectedTABB = useContext(AttendanceContext).selectedTAB;
  const devopsss = useContext(AttendanceContext).devopss;
  const ProjectIdd = useContext(AttendanceContext).projectId;
  const [comments, setcomments] = useState([]);
  const [commentsByTaskId, setCommentByTaskID] = useState({});
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>('all');
  const [projectName, setProjectName] = useState<string>('');
  const [view, setView] = useState<'card' | 'table'>('card');
  // const [tasks, setTasks] = useState<task[]>([]);
  // Add this function inside TaskBoardAdmin component
  const handleQuickAddTask = async (title: string) => {
    try {
      // Create new task with default values
      const newTask = {
        title: title,
        project_id: ProjectId,
        status: 'todo',
        score: 0,
        priority: 'Low',
        devops: [], // Empty by default, user can assign later
        description: '',
        created_at: new Date().toISOString(),
      };

      // Save to database
      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      // Refresh tasks to show the new one
      await fetchTasks();

      // Show success toast notification
      toast.success('Task created from clipboard!');
    } catch (error) {
      console.error('Error creating task:', error);
      // Show error toast notification
      toast.error('Failed to create task. Please try again.');
    }
  };
  // Filter tasks by selected developer
  const filteredTasks = useMemo(() => {
    if (selectedDeveloper === 'all') {
      return tasks;
    }

    return tasks.filter((task) =>
      task.devops?.some((dev) => dev.id === selectedDeveloper)
    );
  }, [tasks, selectedDeveloper]);

  const getTasksByStatus = (status: Task['status']) =>
    filteredTasks.filter((task) => task.status === status);

  const getStatusCount = (status: Task['status']) =>
    filteredTasks.filter((task) => task.status === status).length;

  const getScoreByStatus = (status: Task['status']) =>
    filteredTasks
      .filter((task) => task.status === status)
      .reduce((sum, task) => sum + task.score, 0);

  const totalTasks = filteredTasks.length;
  const completedTasks = getTasksByStatus('done').length;
  const pendingTasks = totalTasks - completedTasks;

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks_of_projects')
      .select('*')
      .eq('project_id', ProjectId);

    {
      console.log('the all task is', data);
      // No need for image URL processing since URLs are already in the table
      const tasksWithImages = data.map((task) => ({
        ...task,
        // Keep the existing imageurl as is
        image_url: task.imageurl,
        // You can add thumbnail_url here if you want to implement thumbnails later
        thumbnail_url: task.imageurl,
      }));

      // Rest of your existing code for comments and scores
      const { data: comments, error: commentserror } = await supabase
        .from('comments')
        .select('*');

      if (!commentserror) {
        // Fetch users for commentor names
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, full_name');

        if (!userError) {
          // Create map of user_id => full_name
          const userMap = {};
          users.forEach((user) => {
            userMap[user.id] = user.full_name;
          });

          // Add commentor_name to each comment
          const enrichedComments = comments.map((comment) => ({
            ...comment,
            commentor_name: userMap[comment.user_id] || 'Unknown User',
          }));

          setcomments(enrichedComments);

          // Map comments to each task
          const tasksWithComments = tasksWithImages.map((task) => {
            const taskComments = enrichedComments.filter(
              (comment) => comment.task_id === task.id
            );
            return {
              ...task,
              comments: taskComments,
              commentCount: taskComments.length,
            };
          });
          const sortedTasks = [...tasksWithComments].sort((a, b) => {
            // Define the priority order
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            // Get priority values (convert to lowercase for consistency)
            const aPriority = priorityOrder[a.priority?.toLowerCase()] || 0;
            const bPriority = priorityOrder[b.priority?.toLowerCase()] || 0;
            // Sort in descending order
            return bPriority - aPriority;
          });

          setTasks(sortedTasks);

          // Calculate scores for all developers
          const devopsScores = devopss.map((developer) => {
            const totalScore = tasksWithComments
              .filter((task) =>
                task.devops?.some((devop) => devop.id === developer.id)
              )
              .reduce((sum, task) => sum + (task.score || 0), 0);

            const completed = tasksWithComments
              .filter((task) =>
                task.devops?.some(
                  (devop) => devop.id === developer.id && task.status === 'done'
                )
              )
              .reduce((sum, task) => sum + (task.score || 0), 0);

            // Get the developer name from either full_name or name property
            const developerName = developer.full_name || developer.name;

            return {
              id: developer.id,
              name: developerName,
              score: totalScore,
              completed: completed,
              tasksWithComments: tasksWithComments,
            };
          });

          setDevopsScores(devopsScores);

          var commentsByTask = enrichedComments.reduce((acc, comment) => {
            if (!acc[comment.task_id]) acc[comment.task_id] = [];
            acc[comment.task_id].push(comment);
            return acc;
          }, {});

          setCommentByTaskID(commentsByTask);
        }
      }
    }
  };

  // Fetch project name
  useEffect(() => {
    const fetchProjectName = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('title')
        .eq('id', ProjectId)
        .single();

      if (!error && data) {
        setProjectName(data.title);
      }
    };

    if (ProjectId) {
      fetchProjectName();
    }
  }, [ProjectId]);

  // Current useEffect
  useEffect(() => {
    fetchTasks();
  }, [ProjectIdd, ProjectId]); // Only watches prop ProjectId, not context value

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Update all tasks, not just filtered ones
    const newTasks = Array.from(tasks);
    const draggedTask = newTasks.find((task) => task.id === draggableId);
    if (!draggedTask) return;

    newTasks.splice(newTasks.indexOf(draggedTask), 1);
    draggedTask.status = destination.droppableId as Task['status'];

    // For insertion position, use filtered tasks if we're in filtered mode
    const destTasks = newTasks.filter(
      (task) => task.status === destination.droppableId
    );
    const insertAt =
      destination.index > destTasks.length
        ? destTasks.length
        : destination.index;
    newTasks.splice(insertAt, 0, draggedTask);

    setTasks(newTasks);

    // Update in database
    const { error } = await supabase
      .from('tasks_of_projects')
      .update({ status: draggedTask.status })
      .eq('id', draggableId);

    if (error) {
      console.error('Error updating task status:', error);
      fetchTasks(); // Revert on error
    }
  };

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

  const handleEditClick = (task: Task) => {
    setCurrentTask(task);
    console.log('Current Task:', task);

    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Upload new image if selected
      let imageUrl = updatedTask.imageurl;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `task-images/${fileName}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('newtaskimage')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('newtaskimage').getPublicUrl(filePath);

        imageUrl = publicUrl;
      }
      const { error } = await supabase
        .from('tasks_of_projects')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          score: updatedTask.score,
          status: updatedTask.status,
          priority: updatedTask.priority,
          devops: updatedTask.devops,
          deadline: updatedTask.deadline,
          imageurl: imageUrl,
        })

        .eq('id', updatedTask.id);

      if (error) throw error;

      setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async (DeletedTask: Task) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this Task?'
    );
    if (!confirmed) return;
    try {
      await supabase.from('comments').delete().eq('task_id', DeletedTask.id);

      const { error } = await supabase
        .from('tasks_of_projects')
        .delete()
        .eq('id', DeletedTask.id);

      if (error) {
        throw error;
      }

      setTasks(tasks.filter((t) => t.id !== DeletedTask.id)); // Remove deleted task
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error deleting task:', err);
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
  console.log('Developer Scores:', devopsScores);

  const TaskCard = ({ task, index }: { task: Task; index: number }) => {
    const [descriptionOpen, setDescriptionOpen] = useState(false);
    const [openedTask, setOpenedTask] = useState<Task | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullImageOpen, setIsFullImageOpen] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState('');

    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            className="group bg-[#F5F5F9]  rounded-[10px] shadow-lg px-4 pt-4 pb-3 space-y-2 mb-3 hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            onClick={() => {
              setOpenedTask(task);
              setDescriptionOpen(true);
            }}
          >
            {/* Image Preview - Only show if image_url exists */}
            {task.image_url && (
              <div className="mb-2 overflow-hidden rounded-lg h-24 relative">
                <img
                  src={task.image_url}
                  alt="Task preview"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none'; // Hide if image fails to load
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
              <span className="text-[13px] text-[#404142] font-medium">
                {task.score}
              </span>
            </div>

            {/* Devops Info + Comments */}
            {task.devops && (
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-[#9A00FF] text-white font-medium font-semibold flex items-center justify-center">
                    {Array.isArray(task.devops)
                      ? task.devops
                          .filter((dev) => dev?.name || dev?.full_name) // Filter out items without name or full_name
                          .map((dev) =>
                            (dev.name || dev.full_name)[0].toUpperCase()
                          )
                          .join('')
                      : (task.devops?.name ||
                          task.devops?.full_name)?.[0]?.toUpperCase() || ''}
                  </div>
                  <span className="text-[13px] text-[#404142]">
                    {Array.isArray(task.devops)
                      ? task.devops
                          .filter((dev) => dev?.name || dev?.full_name) // Filter out items without name or full_name
                          .map((dev) => {
                            const displayName = dev.name || dev.full_name;
                            return (
                              displayName.charAt(0).toUpperCase() +
                              displayName.slice(1)
                            );
                          })
                          .join(', ')
                      : task.devops?.name || task.devops?.full_name
                      ? (task.devops.name || task.devops.full_name)
                          .charAt(0)
                          .toUpperCase() +
                        (task.devops.name || task.devops.full_name).slice(1)
                      : ''}
                  </span>
                </div>
                {task.commentCount > 0 && (
                  <span className="text-sm text-gray-600">
                    {task.commentCount}{' '}
                    {task.commentCount === 1 ? 'comment' : 'comments'}
                  </span>
                )}
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[12px] text-[#404142]">
                  <strong>Deadline:</strong>{' '}
                  {new Date(task.deadline).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Time & Actions */}
            <div className="flex justify-between items-center">
              <p className="text-[12px] text-[#949597]">
                {formatDistanceToNow(new Date(task.created_at))} ago
              </p>
              <div className="hidden group-hover:flex space-x-2">
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(task);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="text-gray-400 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(task);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <Comments taskid={task.id} onCommentAdded={fetchTasks} />
            </div>

            {/* Modal Description View */}
            {descriptionOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in p-6 relative">
                  {/* Modal Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {openedTask?.title}
                    </h2>
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDescriptionOpen(false);
                      }}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Image View */}
                  {openedTask?.imageurl && (
                    <>
                      <img
                        src={openedTask.imageurl}
                        alt="Task"
                        style={{ transform: `scale(${zoomLevel})` }}
                        className="max-w-full p-2 border-2 border-gray-200 rounded-2xl mb-4 max-h-[60vh] object-contain rounded cursor-pointer"
                        onClick={() => {
                          setFullImageUrl(openedTask.imageurl);
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
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    {openedTask?.description}
                  </p>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
                    <div>
                      <span className="font-semibold">KPIs : </span>{' '}
                      {openedTask?.score}
                    </div>
                    <div>
                      <span className="font-semibold">Developer : </span>{' '}
                      {openedTask?.devops
                        ?.map((dev) => dev.name || dev.full_name)
                        .join(', ')}
                    </div>
                    <div>
                      <span className="font-semibold">Priority : </span>
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
                        {openedTask?.priority}
                      </span>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="flex flex-col gap-4">
                    <Comments taskid={task.id} onCommentAdded={fetchTasks} />
                    {commentsByTaskId[openedTask?.id]?.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {commentsByTaskId[openedTask?.id].map((comment) => (
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
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleDateString()}
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

                  {/* Edit Button */}
                  <div className="flex justify-end mt-6">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-[#9A00FF] text-white rounded-lg hover:bg-[#8500e6] transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(openedTask!);
                      }}
                    >
                      <Pencil size={18} />
                      Edit Task
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const renderColumn = (
    status: keyof typeof COLUMN_IDS,
    title: string,
    color: string
  ) => {
    // Use filteredTasks instead of tasks
    const tasksInColumn = filteredTasks.filter(
      (task) => task.status === COLUMN_IDS[status]
    );

    return (
      <div className="bg-white  lg:col-span-1 md:col-span-2 sm:col-span-2 col-span-4 rounded-[20px] p-4 shadow-md h-[calc(100vh-300px)] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className={`font-semibold text-xl leading-7 text-${color}`}>
            {title}
          </h2>
          <span className="text-gray-600">{tasksInColumn.length}</span>
        </div>
        {status === 'todo' && (
          <>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="mt-2 w-full flex mb-2 items-center justify-center gap-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-200"
            >
              <Plus size={16} />
              <span className="text-sm">New</span>
            </button>
            {isCreateTaskModalOpen && (
              <TodoTask projectId={ProjectId} fetchTasks={fetchTasks} />
            )}
          </>
        )}
        <Droppable droppableId={COLUMN_IDS[status]}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto space-y-4 pr-2 task-scroll"
              style={{ minHeight: '100px' }}
            >
              {tasksInColumn.map((task, index) => (
                <TaskCard key={task.id} task={task} index={index} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  const adminProjectName = useSelector(
    (state: RootState) => state.projectName.projectName
  );
  return (
    <div className="min-h-screen px-0  ">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {selectedTab === 'addtask' && (
          <AddNewTask
            setselectedtab={setSelectedTab}
            ProjectId={ProjectId}
            devopss={devopss}
            refreshTasks={fetchTasks}
            projectName={projectName}
          />
        )}

        {(selectedTab === 'tasks' || selectedTABB === 'tasks') && (
          <>
            <div className="flex flex-col gap-4 p-3 rounded-2xl mb-4  bg-white shadow-sm border-b border-gray-100">
              {/* Arrow + Heading Grouped */}
              <div className="flex items-center justify-between w-full">
                {/* <div></div> */}
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
                      onClick={() => navigate(-1)}
                    />
                  </Link>
                  <h1 className="text-md md:text-2xl font-bold text-gray-800">
                    {adminProjectName}
                  </h1>
                </div>
                <div>
                  <button
                    className=" bg-[#9A00FF] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors duration-200 whitespace-nowrap"
                    onClick={() => setSelectedTab('addtask')}
                  >
                    <PlusCircle size={20} className="mr-2" /> New Task
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                {/* Status Box */}
                <div className="bg-white w-full lg:w-[60%] p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap justify-between gap-4 font-semibold text-sm">
                  <h1 className="text-[#9A00FF]">
                    TO DO: {getScoreByStatus('todo')}
                  </h1>
                  <h1 className="text-orange-600">
                    In Progress: {getScoreByStatus('inProgress')}
                  </h1>
                  <h1 className="text-yellow-600">
                    Review: {getScoreByStatus('review')}
                  </h1>
                  <h1 className="text-[#05C815]">
                    Done: this {getScoreByStatus('done')}
                  </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Developer Filter Dropdown */}
                  <div className="relative w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <label className="mr-2 text-sm font-medium text-gray-700">
                        Filter by Developer:
                      </label>
                      <div className="relative flex-1">
                        <select
                          value={selectedDeveloper}
                          onChange={(e) => setSelectedDeveloper(e.target.value)}
                          className={`w-full sm:w-48 bg-white border ${
                            selectedDeveloper !== 'all'
                              ? 'border-purple-500 ring-2 ring-purple-300'
                              : 'border-gray-300'
                          } text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none`}
                        >
                          <option value="all">All Developers</option>
                          {devopss?.map((dev) => (
                            <option key={dev.id} value={dev.id}>
                              {dev.name || dev.full_name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center px-2 text-gray-700">
                          <svg
                            className="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                      <ViewToggle view={view} setView={setView} />
                    </div>
                    {selectedDeveloper !== 'all' && (
                      <>
                        {/* <button
                          onClick={() => setSelectedDeveloper('all')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          <X size={16} />
                        </button> */}
                        <div className="mt-1 text-xs font-medium text-purple-700">
                          {(() => {
                            const selectedDevName =
                              devopss?.find(
                                (dev) => dev.id === selectedDeveloper
                              )?.name ||
                              devopss?.find(
                                (dev) => dev.id === selectedDeveloper
                              )?.full_name ||
                              'Selected developer';
                            return `Showing ${filteredTasks.length} of ${tasks.length} tasks for ${selectedDevName}`;
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* New Task Button */}
                  {/* <button
                    className="hidden lg:flex bg-[#9A00FF] text-white px-4 py-2 rounded-lg items-center gap-2 hover:bg-purple-700 transition-colors duration-200 whitespace-nowrap"
                    onClick={() => setSelectedTab("addtask")}
                  >
                    <PlusCircle size={20} className="mr-2" />
                    <span>New Task</span>
                  </button> */}
                </div>
              </div>
            </div>

            {/* View Toggle */}

            {view === 'card' ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-4 gap-6">
                  {renderColumn('todo', 'To do', '[#9A00FF]')}
                  {renderColumn('inProgress', 'In Progress', 'orange-600')}
                  {renderColumn('review', 'Review', 'yellow-600')}
                  {renderColumn('done', 'Done', '[#05C815]')}
                </div>
              </DragDropContext>
            ) : (
              <NotionTableView
                tasks={filteredTasks}
                developers={devopss}
                onAddTask={() => setSelectedTab('addtask')}
                onTaskStatusChange={handleTaskStatusChange}
                onQuickAddTask={handleQuickAddTask} // Add this line
              />
            )}
          </>
        )}
        <div className="w-[95%] mx-auto mt-3 p-2 rounded-2xl bg-white shadow-md flex flex-wrap justify-end gap-2">
          {devopsScores.map((score) => (
            <div
              key={score.id}
              className="px-3 py-1 rounded-full flex items-center bg-gray-100"
            >
              <span className="mr-2 truncate max-w-[100px] font-medium text-gray-700">
                {score.name}
              </span>
              <span className="text-green-600 font-semibold">
                : {score.completed}
              </span>
              <span className="text-gray-600 font-semibold"> / </span>
              <span className="text-red-500 font-semibold">{score.score}</span>
            </div>
          ))}
        </div>

        {/* Edit Task Modal */}
        {isEditModalOpen && currentTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8"
              onClick={(e) => e.stopPropagation()} // Prevent click-through to backdrop
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Edit Task
                  </h2>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    handleUpdateTask(currentTask);
                  }}
                  className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2"
                >
                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={currentTask.title}
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={currentTask.description || ''}
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>

                  {/* Score Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score
                    </label>
                    <input
                      type="number"
                      value={currentTask.score}
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          score: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Image
                    </label>

                    {/* Current image preview */}
                    {currentTask.imageurl && !imagePreview && (
                      <div className="relative mb-2">
                        <img
                          src={currentTask.imageurl}
                          alt="Current task"
                          className="h-32 object-contain rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTask({ ...currentTask, imageurl: '' });
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* New image preview */}
                    {imagePreview && (
                      <div className="relative mb-2">
                        <img
                          src={imagePreview}
                          alt="New task image"
                          className="h-32 object-contain rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setImageFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* File input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Priority Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={currentTask.priority || ''}
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          priority: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Status Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={currentTask.status}
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          status: e.target.value as Task['status'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="todo">To Do</option>
                      <option value="inProgress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={
                        currentTask.deadline
                          ? new Date(currentTask.deadline)
                              .toISOString()
                              .split('T')[0]
                          : ''
                      }
                      onChange={(e) => {
                        setCurrentTask({
                          ...currentTask,
                          deadline: e.target.value,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Developers Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Developers
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentTask.devops?.map((dev) => (
                        <div
                          key={dev.id}
                          className="bg-blue-100 px-3 py-1 rounded-full flex items-center"
                        >
                          <span className="mr-2">{dev.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTask({
                                ...currentTask,
                                devops: currentTask.devops?.filter(
                                  (d) => d.id !== dev.id
                                ),
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <select
                      onChange={(e) => {
                        const devId = e.target.value;
                        if (
                          devId &&
                          currentTask.devops?.every((d) => d.id !== devId)
                        ) {
                          const dev = devopss.find(
                            (d: Developer) => d.id === devId
                          );
                          if (dev) {
                            setCurrentTask({
                              ...currentTask,
                              devops: [...(currentTask.devops || []), dev],
                            });
                          }
                        }
                      }}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
                      value=""
                    >
                      <option value="">Add Developer</option>
                      {devopss?.map((dev: Developer) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#9A00FF] text-white rounded-md hover:bg-[#9900ffe3]"
                    >
                      Update Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskBoardAdmin;
