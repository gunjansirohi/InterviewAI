import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Loader from '../components/Loader';
import ProtectedRoute from '../components/ProtectedRoute';
import Dashboard from '../features/dashboard/Dashboard';
import EvaluationDashboard from '../features/evaluation/EvaluationDashboard';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import InterviewRoom from '../features/interview/InterviewRoom';
import InterviewSetup from '../features/interview/InterviewSetup';
import VideoInterviewRoom from '../features/videoInterview/VideoInterviewRoom';
import VoiceInterviewRoom from '../features/voiceInterview/VoiceInterviewRoom';
import MainLayout from '../layouts/MainLayout';
import Home from '../pages/Home';

const AnalyticsDashboard = lazy(() => import('../features/analytics/AnalyticsDashboard'));
const ResumeBuilder = lazy(() => import('../features/resumeStudio/ResumeBuilder'));
const CodingDashboard = lazy(() => import('../features/coding/CodingDashboard'));
const CodingSetup = lazy(() => import('../features/coding/CodingSetup'));
const CodingInterview = lazy(() => import('../features/coding/CodingInterview'));

export default function AppRoutes() {
  return <Routes><Route element={<MainLayout />}><Route index element={<Home />} /><Route path="login" element={<Login />} /><Route path="register" element={<Register />} /><Route element={<ProtectedRoute />}><Route path="dashboard" element={<Dashboard />} /><Route path="analytics" element={<Suspense fallback={<Loader />}><AnalyticsDashboard /></Suspense>} /><Route path="resume-studio" element={<Suspense fallback={<Loader />}><ResumeBuilder /></Suspense>} /><Route path="coding" element={<Suspense fallback={<Loader />}><CodingDashboard /></Suspense>} /><Route path="coding/setup" element={<Suspense fallback={<Loader />}><CodingSetup /></Suspense>} /><Route path="coding/interview/:id" element={<Suspense fallback={<Loader />}><CodingInterview /></Suspense>} /><Route path="interview/setup" element={<InterviewSetup />} /><Route path="interview/:id" element={<InterviewRoom />} /><Route path="voice-interview/:id" element={<VoiceInterviewRoom />} /><Route path="video-interview/:id" element={<VideoInterviewRoom />} /><Route path="evaluation/:interviewId" element={<EvaluationDashboard />} /><Route path="report/:reportId" element={<EvaluationDashboard />} /><Route path="evaluations" element={<EvaluationDashboard />} /></Route></Route></Routes>;
}
