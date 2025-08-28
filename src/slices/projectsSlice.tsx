import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  getProjectById 
} from '../services/adminService';

// Define the Project interface based on the backend model
export interface Project {
  _id: string;
  id?: string; // For compatibility
  name: string;
  description?: string;
  organizationId: string;
  createdBy: {
    _id: string;
    fullName: string;
    email: string;
  };
  projectManager?: {
    _id: string;
    fullName: string;
    email: string;
  };
  projectClient?: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectType: 'frontend' | 'backend' | 'fullstack';
  startDate?: string;
  endDate?: string;
  deadline?: string;
  teamMembers: Array<{
    userId: {
      _id: string;
      fullName: string;
      email: string;
      profilePicture?: string;
    };
    role: 'developer' | 'designer' | 'tester' | 'analyst' | 'lead' | 'manager';
    joinedAt: string;
    permissions: {
      canEdit: boolean;
      canDelete: boolean;
      canManageTeam: boolean;
    };
  }>;
  progress: {
    percentage: number;
    lastUpdated: string;
  };
  category: 'web_development' | 'mobile_app' | 'desktop_app' | 'api' | 'maintenance' | 'research' | 'other';
  tags: string[];
  budget?: {
    estimated: number;
    actual: number;
    currency: string;
  };
  settings: {
    isPublic: boolean;
    allowComments: boolean;
    emailNotifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  projectManager?: string;
  projectClient?: string;
  projectType: 'frontend' | 'backend' | 'fullstack';
  teamMembers?: string[];
  startDate?: string;
  endDate?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'web_development' | 'mobile_app' | 'desktop_app' | 'api' | 'maintenance' | 'research' | 'other';
  tags?: string[];
  budget?: {
    estimated: number;
    currency: string;
  };
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  _id: string;
}

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    priority?: string;
    projectType?: string;
    search?: string;
  };
  view: 'card' | 'table';
  groupBy: 'all' | 'employees' | 'managers';
}

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  filters: {},
  view: 'card',
  groupBy: 'all',
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (params?: { status?: string; priority?: string; search?: string }) => {
    const projectsData = await getProjects(params);
    return projectsData;
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId: string) => {
    const projectData = await getProjectById(projectId);
    return projectData;
  }
);

export const createNewProject = createAsyncThunk(
  'projects/createProject',
  async (projectData: CreateProjectData) => {
    const newProject = await createProject(projectData);
    return newProject;
  }
);

export const updateExistingProject = createAsyncThunk(
  'projects/updateProject',
  async (projectData: UpdateProjectData) => {
    const updatedProject = await updateProject(projectData._id, projectData);
    return updatedProject;
  }
);

export const deleteExistingProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string) => {
    await deleteProject(projectId);
    return projectId;
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    setFilters: (state, action: PayloadAction<Partial<ProjectsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setView: (state, action: PayloadAction<'card' | 'table'>) => {
      state.view = action.payload;
    },
    setGroupBy: (state, action: PayloadAction<'all' | 'employees' | 'managers'>) => {
      state.groupBy = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.projects || action.payload;
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch projects';
      })
      // Fetch project by ID
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload;
        state.error = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch project';
      })
      // Create project
      .addCase(createNewProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload);
        state.error = null;
      })
      .addCase(createNewProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create project';
      })
      // Update project
      .addCase(updateExistingProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingProject.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.projects.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject && state.currentProject._id === action.payload._id) {
          state.currentProject = action.payload;
        }
        state.error = null;
      })
      .addCase(updateExistingProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update project';
      })
      // Delete project
      .addCase(deleteExistingProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExistingProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = state.projects.filter(p => p._id !== action.payload);
        if (state.currentProject && state.currentProject._id === action.payload) {
          state.currentProject = null;
        }
        state.error = null;
      })
      .addCase(deleteExistingProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete project';
      });
  },
});

export const {
  setCurrentProject,
  clearCurrentProject,
  setFilters,
  clearFilters,
  setView,
  setGroupBy,
  clearError,
} = projectsSlice.actions;

export default projectsSlice.reducer;
