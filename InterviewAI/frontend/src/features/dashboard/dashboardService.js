import api from '../../services/api';

export async function getUserProfile() {
  const { data } = await api.get('/users/profile');
  return data.user;
}

export async function getDashboardStatistics() {
  console.info('[dashboard-statistics-request]');
  const { data } = await api.get('/analytics/dashboard');
  const statistics = data?.analytics ?? {};
  console.info('[dashboard-statistics-response]', statistics);
  return statistics;
}
