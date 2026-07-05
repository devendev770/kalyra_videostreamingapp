import { Router } from 'express';
import { search, getSuggestions } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validate.js';
import { searchSchema } from '../validators/index.js';

const router = Router();
router.get('/', validate(searchSchema), search);
router.get('/suggestions', getSuggestions);

export default router;
