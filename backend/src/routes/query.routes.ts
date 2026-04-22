import { Router } from 'express';
import { queryController } from '../controllers/query.controller';

const router = Router();

// Ask a question about a document
router.post('/documents/:documentId/queries', (req, res, next) => {
  queryController.askQuestion(req, res, next);
});

// Get all queries for a document
router.get('/documents/:documentId/queries', (req, res, next) => {
  queryController.getQueries(req, res, next);
});

// Get a single query by ID
router.get('/queries/:id', (req, res, next) => {
  queryController.getQuery(req, res, next);
});

export default router;
