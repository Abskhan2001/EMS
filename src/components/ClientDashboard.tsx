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
  <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 border-b border-gray-100 space-y-4 md:space-y-0">
    <div className="flex-1 md:flex-none">
      <h3 className="font-medium text-gray-900 text-sm md:text-base">{name}</h3>
    </div>
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 lg:gap-6 xl:gap-8">
      <div className="flex flex-col items-center min-w-[3rem]">
        <span className="text-xs text-gray-500 md:hidden">In Review</span>
        <span className="text-purple-600 font-medium text-sm md:text-base">{inReview}</span>
      </div>
      <div className="flex flex-col items-center min-w-[3rem]">
        <span className="text-xs text-gray-500 md:hidden">In Progress</span>
        <span className="text-yellow-600 font-medium text-sm md:text-base">{inProgress}</span>
      </div>
      <div className="flex flex-col items-center min-w-[3rem]">
        <span className="text-xs text-gray-500 md:hidden">High Priority</span>
        <span className="text-red-600 font-medium text-sm md:text-base">{highPriority.toString().padStart(2, '0')}</span>
      </div>
      <div className="flex flex-col items-center min-w-[3rem]">
        <span className="text-xs text-gray-500 md:hidden">Pending Task</span>
        <span className="text-red-500 font-medium text-sm md:text-2base">{pendingTask}</span>
      </div>
      <div className="flex flex-col items-center min-w-[4rem]">
        <span className="text-xs text-gray-500 md:hidden">Done</span>
        <span className="text-green-600 font-medium text-sm md:text-base">{done}</span>
      </div>
      <div className="flex flex-col items-center min-w-[3rem]">
        <span className="text-xs text-gray-500 md:hidden">Total Task</span>
        <span className="text-blue-600 font-medium text-sm md:text-base">{totalTask}</span>
      </div>
      <div className="flex flex-col items-center min-w-[4rem]">
        <span className="text-xs text-gray-500 md:hidden">Productivity</span>
        <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
          {productivity}%
        </span>
      </div>
      <div className="flex flex-col items-center min-w-[4rem]">
        <span className="text-xs text-gray-500 md:hidden">Status</span>
        <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
          {status}
        </span>
      </div>
      <div className="w-full md:w-auto mt-2 md:mt-0">
        <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors w-full md:w-auto">
          Open Project
        </button>
      </div>
    </div>
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
  <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 border-b border-gray-100 space-y-4 md:space-y-2">
    <div className="flex-1 md:flex-none">
      <span className="text-gray-900 font-medium text-sm md:text-base">{name}</span>
    </div>
    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-8">
      <div className="flex-1 md:text-center">
        <span className="text-xs text-gray-500 md:hidden">Project: </span>
        <span className="text-gray-600 text-sm md:text-base">{project}</span>
      </div>
      <div className="flex-1 md:text-center">
        <span className="text-xs text-gray-500 md:hidden">Completed Tasks: </span>
        <span className="text-green-600 font-medium text-sm md:text-base">{completedTasks}</span>
      </div>
      <div className="flex-1 md:text-center">
        <span className="text-xs text-gray-500 md:hidden">Tasks: </span>
        <span className="text-red-500 font-medium text-sm md:text-base">Assign ({assignTasks})</span>
        <span className="text-yellow-600 ml-2 text-sm md:text-base">in progress ({inProgress})</span>
      </div>
      <div className="flex-1 md:text-center">
        <span className="text-xs text-gray-500 md:hidden">Status: </span>
        <span className="bg-green-800 text-white text-xs px-2 py-1 rounded-full">
          {status}
        </span>
      </div>
    </div>
  </div>
);

const ClientDashboard: React.FC = () => {
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
              count={100}
              color="text-blue-600"
              bgColor="bg-white"
            />
            <TaskCard
              title="Pending Task"
              count={30}
              color="text-red-500"
              bgColor="bg-white"
            />
            <TaskCard
              title="in Progress"
              count={10}
              color="text-yellow-600"
              bgColor="bg-white"
            />
            <TaskCard
              title="In Review"
              count={20}
              color="text-purple-600"
              bgColor="bg-white"
            />
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <TaskCard
                title="Done Task"
                count={40}
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
                <span className="text-gray-700">One by One</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-3 md:space-y-0">
              <h3 className="text-base md:text-lg font-medium text-gray-900">Project 1 Name</h3>
              <button className="flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-6 md:px-8 py-2 hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">Today</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Project Headers - Hidden on mobile */}
            <div className="hidden md:flex items-center justify-between py-3 border-b-2 border-gray-200 mb-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-500">Project</span>
              </div>
              <div className="flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
                <span className="text-purple-600 font-medium w-12 text-center text-sm">In Review</span>
                <span className="text-yellow-600 font-medium w-12 text-center text-sm">In Progress</span>
                <span className="text-red-600 font-medium w-12 text-center text-sm">High Priority</span>
                <span className="text-red-500 font-medium w-12 text-center text-sm">Pending Task</span>
                <span className="text-green-600 font-medium w-16 text-center text-sm">Done</span>
                <span className="text-blue-600 font-medium w-12 text-center text-sm">Total Task</span>
                <span className="text-gray-600 font-medium w-16 text-center text-sm">Productivity</span>
                <span className="text-gray-600 font-medium w-16 text-center text-sm">Status</span>
                <div className="w-32"></div>
              </div>
            </div>

            <ProjectRow
              name="Project 1 Name"
              inReview={20}
              inProgress={10}
              highPriority={1}
              pendingTask={20}
              done="40/100"
              totalTask={100}
              productivity={80}
              status="Good"
            />

            {/* Navigation */}
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Team Members Section */}
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg md:text-xl font-semižold text-gray-900">Team Members</h2>
            </div>

            {/* Team Member Headers - Hidden on mobile */}
            <div className="hidden md:flex items-center justify-between py-3 border-b-2 border-gray-200 mb-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-500">Name</span>
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-gray-500">Project</span>
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-gray-500">Completed Tasks</span>
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-gray-500">Tasks</span>
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-gray-500">Status</span>
              </div>
            </div>

            <TeamMemberRow
              name="Asad khan"
              project="Assign Project Name"
              completedTasks={70}
              assignTasks={10}
              inProgress={3}
              status="Good"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;