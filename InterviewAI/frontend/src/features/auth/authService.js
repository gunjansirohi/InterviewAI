import api from '../../services/api';

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/auth/profile');
  return data.user;
}
