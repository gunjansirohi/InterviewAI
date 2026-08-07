import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';
import { evaluate, getHistory, getReport } from './evaluationController.js';

const router = Router();
router.use(protect);
router.post('/evaluate', evaluate);
router.get('/history', getHistory);
router.get('/report/:id', getReport);

export default router;
