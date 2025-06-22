import axios from 'axios';
import config from './config';

const api = axios.create({
  baseURL: config.auth.serviceUrl,
  withCredentials: true,
});

export interface UserProfile {
  uuid: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  photo_url: string;
  provider: string;
  roles: Array<{
    name: string;
    permissions: {
      [key: string]: {
        read: boolean;
        write: boolean;
      };
    };
  }>;
}

export const authApi = {
  createUser: async (provider: string, payload: any) => {
    const response = await api.post('/user/create', {
      provider,
      payload,
    });
    return response.data;
  },

  getUser: async (uuid: string) => {
    const response = await api.get(`/user/${uuid}`);
    return response.data;
  },

  updateUser: async (uuid: string, payload: any) => {
    const response = await api.patch('/user/update', {
      uuid,
      payload,
    });
    return response.data;
  },

  checkSession: async () => {
    const response = await api.get('/session/check');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/session/logout');
    return response.data;
  },
};

export default api; 