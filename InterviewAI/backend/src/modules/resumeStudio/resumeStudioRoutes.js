import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';
import { analyze, create, downloadPdf, getOne, history, improve, list, update } from './resumeStudioController.js';

const router = Router();
router.use(protect);
router.post('/create', create);
router.put('/update/:id', update);
router.post('/improve', improve);
router.post('/analyze', analyze);
router.get('/pdf/:resumeId', downloadPdf);
router.get('/history/:resumeId', history);
router.get('/', list);
router.get('/:id', getOne);

export default router;
