import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, Users } from 'lucide-react';

interface TaskCardProps {
  title: string;
  count: number;
  color: string;
  bgColor: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ title, count, color, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-4 md:p-6 flex flex-col items-center justify-center min-h-[120px] shadow-sm`}>
    <h3 className={`text-xs md:text-sm font-medium mb-2 md:mb-3 ${color} text-center`}>{title}</h3>
    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 ${color.replace('text-', 'border-')} flex items-center justify-center`}>
      <span className={`text-xl md:text-2xl font-bold ${color}`}>{count}</span>
    </div>
  </div>
);

interface ProjectRowProps {
  name: string;
  inReview: number;
  inProgress: number;
  highPriority: number;
  pendingTask: number;
  done: string;
  totalTask: number;
  productivity: number;
  status: string;
}

const ProjectRow: React.FC<ProjectRowProps> = ({
  name,
  inReview,
  inProgress,
  highPriority,
  pendingTask,
  done,
  totalTask,
  productivity,
  status
}) => (
  <tr className="border-b border-gray-100 hover:bg-gray-50">
    <td className="py-4 px-2 text-left">
      <h3 className="font-medium text-gray-900 text-sm md:text-base">{name}</h3>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-purple-600 font-medium text-sm md:text-base">{inReview}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-yellow-600 font-medium text-sm md:text-base">{inProgress}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-red-600 font-medium text-sm md:text-base">{highPriority.toString().padStart(2, '0')}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-red-500 font-medium text-sm md:text-base">{pendingTask}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-green-600 font-medium text-sm md:text-base">{done}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-blue-600 font-medium text-sm md:text-base">{totalTask}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
        {productivity}%
      </span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
        {status}
      </span>
    </td>
    <td className="py-4 px-2 text-center">
      <button className="bg-black text-white px-8 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
        Open Project
      </button>
    </td>
  </tr>
);

// Mobile version of ProjectRow
const ProjectRowMobile: React.FC<ProjectRowProps> = ({
  name,
  inReview,
  inProgress,
  highPriority,
  pendingTask,
  done,
  totalTask,
  productivity,
  status
}) => (
  <div className="border-b border-gray-100 py-4">
    <div className="mb-3">
      <h3 className="font-medium text-gray-900 text-base">{name}</h3>
    </div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">In Review:</span>
        <span className="text-purple-600 font-medium text-sm">{inReview}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">In Progress:</span>
        <span className="text-yellow-600 font-medium text-sm">{inProgress}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">High Priority:</span>
        <span className="text-red-600 font-medium text-sm">{highPriority.toString().padStart(2, '0')}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Pending Task:</span>
        <span className="text-red-500 font-medium text-sm">{pendingTask}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Done:</span>
        <span className="text-green-600 font-medium text-sm">{done}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Total Task:</span>
        <span className="text-blue-600 font-medium text-sm">{totalTask}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Productivity:</span>
        <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
          {productivity}%
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Status:</span>
        <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
          {status}
        </span>
      </div>
    </div>
    <button className="w-full bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
      Open Project
    </button>
  </div>
);

interface TeamMemberProps {
  name: string;
  project: string;
  completedTasks: number;
  assignTasks: number;
  inProgress: number;
  status: string;
}

const TeamMemberRow: React.FC<TeamMemberProps> = ({
  name,
  project,
  completedTasks,
  assignTasks,
  inProgress,
  status
}) => (
  <tr className="border-b border-gray-100 hover:bg-gray-50">
    <td className="py-4 px-2 text-left">
      <span className="text-gray-900 font-medium text-sm md:text-base">{name}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-gray-600 text-sm md:text-base">{project}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="text-green-600 font-medium text-sm md:text-base">{completedTasks}</span>
    </td>
    <td className="py-4 px-2 text-center">
      <div className="flex flex-col items-center space-y-1">
        <span className="text-red-500 font-medium text-sm">Assign ({assignTasks})</span>
        <span className="text-yellow-600 font-medium text-sm">In Progress ({inProgress})</span>
      </div>
    </td>
    <td className="py-4 px-2 text-center">
      <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
        {status}
      </span>
    </td>
  </tr>
);

// Mobile version of TeamMemberRow
const TeamMemberRowMobile: React.FC<TeamMemberProps> = ({
  name,
  project,
  completedTasks,
  assignTasks,
  inProgress,
  status
}) => (
  <div className="border-b border-gray-100 py-4">
    <div className="mb-3">
      <span className="text-gray-900 font-medium text-base">{name}</span>
    </div>
    <div className="grid grid-cols-1 gap-2 mb-4">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Project:</span>
        <span className="text-gray-600 text-sm">{project}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Completed Tasks:</span>
        <span className="text-green-600 font-medium text-sm">{completedTasks}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Assigned Tasks:</span>
        <span className="text-red-500 font-medium text-sm">{assignTasks}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">In Progress:</span>
        <span className="text-yellow-600 font-medium text-sm">{inProgress}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Status:</span>
        <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
          {status}
        </span>
      </div>
    </div>
  </div>
);

const ClientDashboard: React.FC = () => {
  const projects = [
    {
      name: "E-Commerce Platform",
      inReview: 8,
      inProgress: 12,
      highPriority: 3,
      pendingTask: 15,
      done: "45/80",
      totalTask: 80,
      productivity: 75,
      status: "Good"
    },
    {
      name: "Mobile App Development",
      inReview: 5,
      inProgress: 8,
      highPriority: 2,
      pendingTask: 10,
      done: "30/60",
      totalTask: 60,
      productivity: 65,
      status: "Average"
    },
    {
      name: "CRM System",
      inReview: 3,
      inProgress: 6,
      highPriority: 1,
      pendingTask: 8,
      done: "25/45",
      totalTask: 45,
      productivity: 85,
      status: "Excellent"
    }
  ];

  const teamMembers = [
    {
      name: "Asad Khan",
      project: "E-Commerce Platform",
      completedTasks: 25,
      assignTasks: 8,
      inProgress: 3,
      status: "Active"
    },
    {
      name: "Ahmed Ali",
      project: "Mobile App Development",
      completedTasks: 18,
      assignTasks: 5,
      inProgress: 2,
      status: "Active"
    },
    {
      name: "Muhammad Ali",
      project: "CRM System",
      completedTasks: 22,
      assignTasks: 6,
      inProgress: 4,
      status: "Active"
    },
    {
      name: "Ali Nawaz",
      project: "E-Commerce Platform",
      completedTasks: 15,
      assignTasks: 4,
      inProgress: 1,
      status: "Busy"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="relative mb-6">
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full px-4 py-2 shadow-sm">
            <div className="relative">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-sm font-medium text-blue-700">Under Development</span>
            <div className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
              Beta
            </div>
          </div>
        </div>
        
        <div className="max-w-full lg:max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome John!</h1>
            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              <button className="flex items-center justify-center md:justify-start space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">Table View</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-gray-600 text-sm md:text-base text-center md:text-left">Tuesday, February 25, 2025</span>
            </div>
          </div>

          {/* Task Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
            <TaskCard
              title="Total Task"
              count={185}
              color="text-blue-600"
              bgColor="bg-white"
            />
            <TaskCard
              title="Pending Task"
              count={33}
              color="text-red-500"
              bgColor="bg-white"
            />
            <TaskCard
              title="In Progress"
              count={26}
              color="text-yellow-600"
              bgColor="bg-white"
            />
            <TaskCard
              title="In Review"
              count={16}
              color="text-purple-600"
              bgColor="bg-white"
            />
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <TaskCard
                title="Done Task"
                count={100}
                color="text-green-600"
                bgColor="bg-white"
              />
            </div>
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-lg p-4 md:p-6 mb-6 md:mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 space-y-3 md:space-y-0">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Projects</h2>
              </div>
              <button className="flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">All Projects</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
              <h3 className="text-base md:text-lg font-medium text-gray-900">Active Projects</h3>
              <button className="flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-6 md:px-8 py-2 hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">Today</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Project</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-purple-600">In Review</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-yellow-600">In Progress</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-red-600">High Priority</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-red-500">Pending Task</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-green-600">Done</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-blue-600">Total Task</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Productivity</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, index) => (
                    <ProjectRow key={index} {...project} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {projects.map((project, index) => (
                <ProjectRowMobile key={index} {...project} />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600">Page 1 of 1</span>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Team Members Section */}
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Team Members</h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Project</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Completed Tasks</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Tasks</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member, index) => (
                    <TeamMemberRow key={index} {...member} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {teamMembers.map((member, index) => (
                <TeamMemberRowMobile key={index} {...member} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;