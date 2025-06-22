import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000', // Updated to backend port
  withCredentials: true,
});

// Workspaces
export const getWorkspaces = async () => {
  const res = await api.get('/workspaces');
  return res.data;
};
export const createWorkspace = async (name: string) => {
  const res = await api.post('/workspaces', { name });
  return res.data;
};
export const switchWorkspace = async (id: string) => {
  const res = await api.post(`/workspaces/${id}/switch`);
  return res.data;
};
export const inviteToWorkspace = async (id: string, email: string) => {
  const res = await api.post(`/workspaces/${id}/invite`, { email });
  return res.data;
};

// Projects
export const getProjects = async (workspaceId: string) => {
  const res = await api.get(`/workspaces/${workspaceId}/projects`);
  return res.data;
};
export const createProject = async (workspaceId: string, name: string, template?: string) => {
  const res = await api.post(`/workspaces/${workspaceId}/projects`, { name, template });
  return res.data;
};
export const renameProject = async (projectId: string, newName: string) => {
  const res = await api.patch(`/projects/${projectId}`, { name: newName });
  return res.data;
};
export const deleteProject = async (projectId: string) => {
  const res = await api.delete(`/projects/${projectId}`);
  return res.data;
};

// Templates
export const getTemplates = async (projectId: string) => {
  const res = await api.get(`/templates/${projectId}`);
  return res.data;
};
export const createTemplate = async (name: string, projectId: string, data: any) => {
  const res = await api.post('/templates', { name, projectId, data });
  return res.data;
};
export const updateTemplate = async (id: string, name: string, data: any) => {
  const res = await api.patch(`/templates/${id}`, { name, data });
  return res.data;
};
export const deleteTemplate = async (id: string) => {
  const res = await api.delete(`/templates/${id}`);
  return res.data;
}; 