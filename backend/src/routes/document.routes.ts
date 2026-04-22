import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { upload } from '../middleware/upload';

const router = Router();

// Upload a document
router.post('/upload', upload.single('document'), (req, res, next) => {
  documentController.uploadDocument(req, res, next);
});

// Get all documents for the current user
router.get('/', (req, res, next) => {
  documentController.getDocuments(req, res, next);
});

// Get a single document by ID
router.get('/:id', (req, res, next) => {
  documentController.getDocument(req, res, next);
});

// Delete a document
router.delete('/:id', (req, res, next) => {
  documentController.deleteDocument(req, res, next);
});

export default router;
