import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface EmployeeTodoProps {
  projectId: string | undefined;
  fetchTasks: () => void;
}
const EmployeTodoInput = ({ projectId, fetchTasks }: EmployeeTodoProps) => {
  const [input, setInput] = useState('');

  const handleQuickAddTask = async (title: string) => {
    try {
      const currentUserId = localStorage.getItem('user_id');
      console.log('EmployeTodoInput - userId:', currentUserId);

      if (!currentUserId) {
        console.error('No user ID found in localStorage');
        alert('User session not found. Please refresh the page and try again.');
        return;
      }

      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, name, email')
        .eq('id', currentUserId)
        .single();

      console.log('EmployeTodoInput - user data:', currentUserData, 'error:', userError);

      let assignedDevs = [];
      if (currentUserData && !userError) {
        const userName = currentUserData.full_name || currentUserData.name || currentUserData.email?.split('@')[0] || 'Unknown User';
        assignedDevs = [
          {
            id: currentUserId,
            name: userName,
          },
        ];
      } else {
        console.error('Failed to fetch user data, using fallback');
        // Fallback: use a default name but ensure user ID is still set
        assignedDevs = [
          {
            id: currentUserId,
            name: 'Unknown User',
          },
        ];
      }

      console.log('EmployeTodoInput - assigned devs:', assignedDevs);

      const newTask = {
        title,
        project_id: projectId,
        status: 'todo',
        score: 0,
        priority: 'Low',
        devops: assignedDevs,
        description: '',
        created_at: new Date().toISOString(),
      };
      console.log('EmployeTodoInput - new task:', newTask);

      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      toast.success('Task successfully added');
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
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
    <form className="my-2" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <input
          value={input} // ✅ controlled input
          onChange={(e) => setInput(e.target.value)}
          type="text"
          className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={input.length < 3}
          className={`p-2 rounded text-white ${
            input.length < 3
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default EmployeTodoInput;
