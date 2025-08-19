import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskUpdate: string, selectedTaskId?: string) => Promise<void>;
  onSkip: () => void;
  userId: string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSubmit, onSkip, userId }) => {
  const [taskUpdate, setTaskUpdate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewTasks, setReviewTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to fetch tasks in progress status
  const fetchInProgressTasks = async () => {
    if (!userId) {
      console.error('❌ No userId provided to fetchInProgressTasks');
      return;
    }

    setIsLoadingTasks(true);
    try {
      console.log('🔍 Fetching in-progress tasks for user:', userId);

      // Try multiple approaches to find tasks

      // Approach 1: Try the contains method first
      const { data: containsTasks, error: containsError } = await supabase
        .from('tasks_of_projects')
        .select('id, title, description, status, devops')
        .eq('status', 'inProgress')
        .contains('devops', [{ id: userId }])
        .order('created_at', { ascending: false });

      if (!containsError && containsTasks && containsTasks.length > 0) {
        console.log('✅ Found tasks using contains method:', containsTasks);
        setReviewTasks(containsTasks);
        return;
      }

      console.log('⚠️ Contains method found no tasks, trying manual filtering...');

      // Approach 2: Get all inProgress tasks and filter manually
      const { data: allTasks, error } = await supabase
        .from('tasks_of_projects')
        .select('id, title, description, status, devops, project_id')
        .eq('status', 'inProgress')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching in-progress tasks:', error);
        return;
      }

      console.log('📋 All inProgress tasks:', allTasks?.length || 0, 'tasks found');
      console.log('📋 Sample task devops structure:', allTasks?.[0]?.devops);

      // Filter tasks manually to check devops array
      const userTasks = allTasks?.filter(task => {
        console.log(`🔍 Checking task "${task.title}" with devops:`, task.devops);

        if (!task.devops) {
          console.log(`❌ Task "${task.title}" has no devops`);
          return false;
        }

        // Handle devops whether it's already an array or needs parsing
        let devopsArray;
        if (typeof task.devops === 'string') {
          try {
            devopsArray = JSON.parse(task.devops);
          } catch (e) {
            console.error('❌ Error parsing devops JSON for task:', task.title, e);
            return false;
          }
        } else {
          devopsArray = task.devops;
        }

        // Check if current user is in the devops array
        const isAssigned = Array.isArray(devopsArray) &&
          devopsArray.some((dev: any) => {
            const match = dev && dev.id === userId;
            if (match) {
              console.log(`✅ Task "${task.title}" assigned to user:`, dev);
            }
            return match;
          });

        return isAssigned;
      }) || [];

      console.log('🎯 Final filtered tasks for user:', userTasks.length, 'tasks');
      userTasks.forEach(task => console.log(`  - ${task.title}`));

      // Temporary fallback: If no user-specific tasks found, show all inProgress tasks for debugging
      if (userTasks.length === 0 && allTasks && allTasks.length > 0) {
        console.log('⚠️ No user-specific tasks found, showing all inProgress tasks for debugging');
        setReviewTasks(allTasks.slice(0, 5)); // Show first 5 tasks for debugging
      } else {
        setReviewTasks(userTasks);
      }
    } catch (error) {
      console.error('❌ Error in fetchInProgressTasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTaskUpdate('');
      setIsSubmitting(false);
      setSelectedTask(null);
      setIsTaskDropdownOpen(false);
      fetchInProgressTasks();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!taskUpdate.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(taskUpdate, selectedTask?.id);
      setTaskUpdate('');
      setSelectedTask(null);
    } catch (error) {
      console.error('Error saving task update:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Handle enter key press with ctrl/cmd to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (taskUpdate.trim()) {
        handleSubmit();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10 relative animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Daily Update</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">Please summarize what you accomplished today:</p>

          <textarea
            ref={textareaRef}
            value={taskUpdate}
            onChange={(e) => setTaskUpdate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={5}
            placeholder="I completed..."
          />

          {/* Task Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Task to Submit for Review (Optional)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                className="w-full p-3 border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                disabled={isLoadingTasks}
              >
                <span className="text-gray-700">
                  {isLoadingTasks
                    ? 'Loading tasks...'
                    : selectedTask
                      ? selectedTask.title
                      : 'Select an in-progress task to submit for review'
                  }
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTaskDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {reviewTasks.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(null);
                          setIsTaskDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-500 italic"
                      >
                        No task selected
                      </button>
                      {reviewTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 border-t border-gray-100"
                        >
                          <div className="font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate">{task.description}</div>
                          )}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-gray-500 italic">
                      No in-progress tasks available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-2">
            <span>Pro tip: Press Ctrl+Enter to quickly submit</span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={handleSkip}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!taskUpdate.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;