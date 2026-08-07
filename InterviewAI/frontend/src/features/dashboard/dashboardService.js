import api from '../../services/api';

export async function getUserProfile() {
  const { data } = await api.get('/users/profile');
  return data.user;
}
