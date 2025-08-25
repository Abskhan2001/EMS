import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const TodoTask = ({
  projectId,
  fetchTasks,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
  fetchTasks: () => void;
}) => {
  const [input, setInput] = useState('');
  const handleQuickAddTask = async (title: string) => {
    try {
      const currentUserId = localStorage.getItem('user_id');
      console.log('TodoTask - userId:', currentUserId);

      let assignedDevs = [];
      if (currentUserId) {
        // Try to get user data for proper name assignment
        const { data: currentUserData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, name, email')
          .eq('id', currentUserId)
          .single();

        if (currentUserData && !userError) {
          const userName = currentUserData.full_name || currentUserData.name || currentUserData.email?.split('@')[0] || 'Unknown User';
          assignedDevs = [
            {
              id: currentUserId,
              name: userName,
            },
          ];
        } else {
          // Fallback: assign with unknown name but valid ID
          assignedDevs = [
            {
              id: currentUserId,
              name: 'Unknown User',
            },
          ];
        }
      }

      console.log('TodoTask - assigned devs:', assignedDevs);

      // Create new task with current user assigned
      const newTask = {
        title: title,
        project_id: projectId,
        status: 'todo',
        score: 0,
        priority: 'Low',
        devops: assignedDevs, // Assign to current user instead of empty
        description: '',
        created_at: new Date().toISOString(),
      };

      console.log('TodoTask - new task:', newTask);

      // Save to database
      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      toast.success('Task created successfully!');
      // Refresh tasks to show the new one
      await fetchTasks();

      // Show success toast notification
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      // Show error toast notification
      toast.error('Failed to create task. Please try again.');
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (input.length >= 3) {
      handleQuickAddTask(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 mb-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter task"
        className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <button
        type="submit"
        disabled={input.length < 3}
        className={`px-4 py-2 rounded text-white ${
          input.length < 3
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700'
        } transition-colors duration-200`}
      >
        Submit
      </button>
    </form>
  );
};

export default TodoTask;
