import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';
import { dashboard, history, roadmap, skills } from './analyticsController.js';

const router = Router();
router.use(protect);
router.get('/dashboard', dashboard);
router.get('/history', history);
router.get('/skills', skills);
router.get('/roadmap', roadmap);
router.post('/roadmap', roadmap);

export default router;
