import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  devops: any[];
}

interface Project {
  id: string;
  title: string;
  devops: any[];
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (tasks: string, selectedTaskIds: string[], projectId: string) => void;
  onSkip: () => void;
  userId?: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onApply, onSkip, userId }) => {
  const [tasks, setTasks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskScore, setNewTaskScore] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isEditingTaskSummary, setIsEditingTaskSummary] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Function to handle task summary edit mode
  const handleTaskSummaryClick = () => {
    setIsEditingTaskSummary(true);
    // Focus the textarea after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }, 0);
  };

  // Function to handle task summary blur (exit edit mode)
  const handleTaskSummaryBlur = () => {
    setIsEditingTaskSummary(false);
  };

  // Function to handle Enter key in task summary
  const handleTaskSummaryKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditingTaskSummary(false);
      inputRef.current?.blur();
    }
    // Call the original handleKeyDown for Ctrl+Enter functionality
    handleKeyDown(e);
  };

  // Fetch user's projects
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProjects();
    }
  }, [isOpen, userId]);

  const fetchUserProjects = async () => {
    if (!userId) {
      console.log('No userId provided');
      return;
    }

    console.log('Fetching projects for userId:', userId);
    setIsLoadingProjects(true);
    try {
      // Fetch all projects and filter client-side to handle invalid JSON
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, devops');

      if (error) throw error;

      console.log('All projects from database:', data);

      const userProjects = data?.filter(project => {
        try {
          if (!project.devops) {
            console.log('Project has no devops:', project.title);
            return false;
          }

          console.log('Checking project:', project.title, 'devops:', project.devops);

          // devops is already an array, no need to parse
          const devops = project.devops;
          console.log('Devops array:', devops);

          const hasUser = Array.isArray(devops) && devops.some((dev: any) => {
            console.log('Comparing dev.id:', dev.id, 'with userId:', userId);
            return dev.id === userId;
          });

          console.log('Project', project.title, 'has user:', hasUser);
          return hasUser;
        } catch (e) {
          console.log('Error checking devops for project:', project.title, e);
          return false;
        }
      }) || [];

      console.log('Filtered user projects:', userProjects);
      setProjects(userProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch tasks for selected project
  useEffect(() => {
    if (selectedProject && userId) {
      setSelectedTasks([]); // Clear selected tasks when project changes
      fetchProjectTasks();
    }
  }, [selectedProject, userId]);

  const fetchProjectTasks = async () => {
    if (!selectedProject || !userId) return;

    console.log('Fetching tasks for project:', selectedProject.title, 'and userId:', userId);
    setIsLoadingTasks(true);
    try {
      // Fetch tasks for the selected project only
      const { data, error } = await supabase
        .from('tasks_of_projects')
        .select('id, title, description, status, devops')
        .eq('project_id', selectedProject.id)
        .in('status', ['todo', 'inProgress']);

      if (error) throw error;

      console.log('Tasks for project:', data);

      const userTasks = data?.filter(task => {
        try {
          if (!task.devops) {
            console.log('Task has no devops:', task.title);
            return false;
          }

          console.log('Checking task:', task.title, 'devops:', task.devops);

          // devops is already an array
          const devops = task.devops;
          console.log('Devops array:', devops);

          const hasUser = Array.isArray(devops) && devops.some((dev: any) => {
            console.log('Comparing dev.id:', dev.id, 'with userId:', userId);
            return dev.id === userId;
          });

          console.log('Task', task.title, 'has user:', hasUser);
          return hasUser;
        } catch (e) {
          console.log('Error checking devops for task:', task.title, e);
          return false;
        }
      }) || [];

      console.log('Filtered user tasks for project:', userTasks);
      setProjectTasks(userTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setTasks('');
      setIsSaving(false);
      setSelectedProject(null);
      setProjectTasks([]);
      setSelectedTasks([]);
      setShowCreateTask(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskScore('');
      setIsEditingTaskSummary(false); // Reset edit mode when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Generate task content based on selections
  useEffect(() => {
    if (selectedProject && selectedTasks.length > 0) {
      const selectedTaskObjects = projectTasks.filter(task =>
        selectedTasks.includes(task.id)
      );

      const taskList = selectedTaskObjects.map(task => `- ${task.title}`).join('\n');
      const content = `I am working on ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} of ${selectedProject.title}.`;
      if (tasks.trim() === '') {
       setTasks(content);
      }
    }
  }, [selectedTasks, selectedProject, projectTasks]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const handleApply = () => {
    if (!tasks.trim()) return;
    setIsSaving(true);
    onApply(tasks, selectedTasks, selectedProject?.id || '');
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleCreateTask = async () => {
    if (!selectedProject || !newTaskTitle.trim() || !userId) return;

    setIsCreatingTask(true);
    try {
      // First, get the user's name from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, name')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      const userName = userData?.full_name || userData?.name || 'Unknown User';

      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          status: 'todo',
          project_id: selectedProject.id,
          devops: [{ id: userId, name: userName }],
          score: newTaskScore ? parseInt(newTaskScore) : 0
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new task to the list and select it
      setProjectTasks(prev => [...prev, data]);
      setSelectedTasks(prev => [...prev, data.id]);

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskScore('');
      setShowCreateTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Handle enter key press with ctrl/cmd to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (tasks.trim()) {
        handleApply();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] z-10 relative animate-fadeIn overflow-hidden flex flex-col"
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Today's Tasks</h2>
            <p className="text-sm text-gray-500 mt-1">Plan your day and stay focused</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Project
            </label>
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className={`w-full p-4 border-2 ${selectedProject ? 'border-gray-200' : 'border-gray-200'} rounded-xl text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all`}
                disabled={isLoadingProjects}
              >
                <span className={selectedProject ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {selectedProject ? selectedProject.title : 'Choose a project...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-auto z-10 py-1">
                  {isLoadingProjects ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading projects...
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No projects found</div>
                  ) : (
                    projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project);
                          setIsProjectDropdownOpen(false);
                          setSelectedTasks([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <span className="font-medium text-gray-700 group-hover:text-blue-600">{project.title}</span>
                        {selectedProject?.id === project.id && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Task Selection */}
          {selectedProject && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Tasks
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                  className={`w-full p-4 border-2 ${selectedTasks.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'} rounded-xl text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all`}
                  disabled={isLoadingTasks}
                >
                  <span className={selectedTasks.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {selectedTasks.length > 0
                      ? `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} selected`
                      : 'Choose tasks...'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTaskDropdownOpen && (
                  <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-auto z-10 py-1">
                    {isLoadingTasks ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading tasks...
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-gray-100 mb-1">
                          <button
                            onClick={() => {
                              setShowCreateTask(true);
                              setIsTaskDropdownOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-blue-600 hover:bg-blue-50 transition-colors flex items-center group"
                          >
                            <div className="p-1 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="font-medium">Create New Task</span>
                          </button>
                        </div>
                        {projectTasks.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">No pending tasks found</div>
                        ) : (
                          projectTasks.map(task => (
                            <button
                              key={task.id}
                              onClick={() => toggleTaskSelection(task.id)}
                              className={`w-full px-4 py-3 text-left transition-all flex items-center justify-between group ${selectedTasks.includes(task.id)
                                ? 'bg-blue-50 hover:bg-blue-100'
                                : 'hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium ${selectedTasks.includes(task.id) ? 'text-blue-900' : 'text-gray-700'}`}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-sm text-gray-500 truncate mt-0.5">{task.description}</div>
                                )}
                              </div>
                              <div className={`ml-3 p-1 rounded-full transition-all ${selectedTasks.includes(task.id)
                                ? 'bg-blue-600'
                                : 'bg-gray-200 group-hover:bg-gray-300'
                                }`}>
                                <Check className={`w-3.5 h-3.5 ${selectedTasks.includes(task.id)
                                  ? 'text-white'
                                  : 'text-transparent'
                                  }`} />
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create New Task Form */}
          {showCreateTask && (
            <div className="animate-fadeIn">
              <div className="p-5 border-2 border-blue-200 rounded-xl bg-gradient-to-br from-blue-50 to-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                    </div>
                    Create New Task
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateTask(false);
                      setNewTaskTitle('');
                      setNewTaskDescription('');
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Task description (optional)"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                  rows={2}
                />
                <input
                  type="number"
                  value={newTaskScore}
                  onChange={(e) => setNewTaskScore(e.target.value)}
                  placeholder="Task KPI/Score (optional)"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  min="0"
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateTask(false);
                      setNewTaskTitle('');
                      setNewTaskDescription('');
                    }}
                    className="px-4 py-2 text-sm font-medium border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                    disabled={isCreatingTask}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim() || isCreatingTask}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                  >
                    {isCreatingTask ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </div>
                    ) : (
                      'Create Task'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Task Summary */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Task Summary
              {!isEditingTaskSummary && (
                <span className="text-xs text-gray-500 ml-2">(Click to edit)</span>
              )}
            </label>
            <div className="relative">
              {!isEditingTaskSummary ? (
                // Display mode - clickable text
                <div
                  onClick={handleTaskSummaryClick}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all min-h-[120px] flex items-start"
                  style={{ lineHeight: '1.6' }}
                >
                  <div className="flex-1">
                    {tasks ? (
                      <div className="text-gray-700 whitespace-pre-wrap">{tasks}</div>
                    ) : (
                      <div className="text-gray-400">Your task summary will appear here...</div>
                    )}
                  </div>
                  <div className="ml-2 text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded opacity-70">
                    Click to edit
                  </div>
                </div>
              ) : (
                // Edit mode - textarea
                <textarea
                  ref={inputRef}
                  value={tasks}
                  onChange={(e) => setTasks(e.target.value)}
                  onKeyDown={handleTaskSummaryKeyDown}
                  onBlur={handleTaskSummaryBlur}
                  className="w-full p-4 border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all resize-none bg-white"
                  rows={5}
                  placeholder="Enter your task summary here..."
                  style={{ lineHeight: '1.6' }}
                />
              )}
              {isEditingTaskSummary && (
                <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                  Press Enter to save, Shift+Enter for new line
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Enter</kbd>
            <span>to submit</span>
          </div>
        </div>

        {/* Footer Section*/}
        <div className="px-6 py-4 bg-gradient-to-t from-gray-50 to-white border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onSkip}
            disabled={isSaving}
            className="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleApply}
            disabled={!tasks.trim() || isSaving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Start Working'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TaskModal;