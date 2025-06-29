import axios from 'axios';

// Determine the base URL based on the current hostname
const getBaseUrl = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL || 'https://youmeyou.ai';
  
  const hostname = window.location.hostname;
  if (hostname.includes('staging')) {
    return 'https://staging.youmeyou.ai';
  }
  if (hostname.includes('localhost')) {
    return 'http://localhost:4000'; // Direct design service for local dev
  }
  return 'https://youmeyou.ai';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

// Helper function to get the correct endpoint path
const getEndpoint = (path: string) => {
  if (typeof window === 'undefined') return path;
  
  const hostname = window.location.hostname;
  if (hostname.includes('localhost')) {
    return path; // Direct service access in local dev
  }
  return `/api/design${path}`; // Through nginx proxy in production/staging
};

// Workspaces
export const getWorkspaces = async () => {
  const res = await api.get(getEndpoint('/workspaces'));
  return res.data;
};
export const createWorkspace = async (name: string) => {
  const res = await api.post(getEndpoint('/workspaces'), { name });
  return res.data;
};
export const switchWorkspace = async (id: string) => {
  const res = await api.post(getEndpoint(`/workspaces/${id}/switch`));
  return res.data;
};
export const inviteToWorkspace = async (id: string, email: string) => {
  const res = await api.post(getEndpoint(`/workspaces/${id}/invite`), { email });
  return res.data;
};

// Projects
export const getProjects = async (workspaceId: string) => {
  const res = await api.get(getEndpoint(`/workspaces/${workspaceId}/projects`));
  return res.data;
};
export const createProject = async (workspaceId: string, name: string, template?: string) => {
  const res = await api.post(getEndpoint(`/workspaces/${workspaceId}/projects`), { name, template });
  return res.data;
};
export const renameProject = async (projectId: string, newName: string) => {
  const res = await api.patch(getEndpoint(`/projects/${projectId}`), { name: newName });
  return res.data;
};
export const deleteProject = async (projectId: string) => {
  const res = await api.delete(getEndpoint(`/projects/${projectId}`));
  return res.data;
};

// Templates
export const getTemplates = async (projectId: string) => {
  const res = await api.get(getEndpoint(`/templates/${projectId}`));
  return res.data;
};
export const createTemplate = async (name: string, projectId: string, data: any) => {
  const res = await api.post(getEndpoint('/templates'), { name, projectId, data });
  return res.data;
};
export const updateTemplate = async (id: string, name: string, data: any) => {
  const res = await api.patch(getEndpoint(`/templates/${id}`), { name, data });
  return res.data;
};
export const deleteTemplate = async (id: string) => {
  const res = await api.delete(getEndpoint(`/templates/${id}`));
  return res.data;
}; 