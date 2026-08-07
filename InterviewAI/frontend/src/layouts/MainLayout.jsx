import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export default function MainLayout() {
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="flex flex-1 flex-col"><Outlet /></main><Footer /></div>;
}
