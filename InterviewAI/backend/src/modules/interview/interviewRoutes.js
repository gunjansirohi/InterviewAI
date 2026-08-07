import { Router } from 'express';
import protect from '../../middleware/authMiddleware.js';
import { createFollowUp, endInterview, interviewDetails, interviewHistory, interviewStatus, skipCurrentQuestion, startInterview, submitAnswer } from './interviewController.js';
import { saveVoiceAnswer } from '../voice/voiceController.js';
import { saveProctorWarning, saveVideoAnswer } from '../video/videoController.js';

const router = Router();
router.use(protect);
router.post('/start', startInterview);
router.post('/answer', submitAnswer);
router.post('/voice-answer', saveVoiceAnswer);
router.post('/video-answer', saveVideoAnswer);
router.post('/proctor-warning', saveProctorWarning);
router.post('/follow-up', createFollowUp);
router.post('/skip-question', skipCurrentQuestion);
router.post('/end', endInterview);
router.get('/history', interviewHistory);
router.get('/status/:id', interviewStatus);
router.get('/:id', interviewDetails);

export default router;
