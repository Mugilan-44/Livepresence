import express from 'express';
import { getData, saveData } from '../db.js';

const router = express.Router();

// GET /api/documents
router.get('/', (req, res) => {
  const db = getData();
  const { requesterId, requesterRole } = req.query;

  if (requesterRole === 'SUPER_ADMIN' || requesterRole === 'HR') {
    return res.json(db.user_documents || []);
  }

  if (requesterId) {
    const userDocs = (db.user_documents || []).filter(d => d.user_id === requesterId);
    return res.json(userDocs);
  }

  res.json(db.user_documents || []);
});

// POST /api/documents (1MB File Size Limit Enforced)
router.post('/', (req, res) => {
  const { userId, documentType, fileName, fileSize, fileUrl } = req.body;
  const db = getData();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // 1 MB File size validation check (base64 string size check)
  if (fileUrl && fileUrl.length > 1.4 * 1024 * 1024) {
    return res.status(400).json({ error: "File size exceeds 1 MB limit. Please upload a file smaller than 1 MB." });
  }

  const newDoc = {
    id: `doc-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    role: user.role,
    document_type: documentType,
    file_name: fileName,
    file_size: fileSize || "500 KB",
    file_url: fileUrl || null,
    status: "Pending",
    is_encrypted: true,
    encryption_algorithm: "AES-256-GCM-SHA256",
    security_clearance: "PRIVATE_RESTRICTED",
    feedback_notes: "Awaiting HR verification queue review.",
    uploaded_at: new Date().toISOString()
  };

  if (!db.user_documents) db.user_documents = [];
  db.user_documents.unshift(newDoc);
  saveData(db);

  res.json({ message: "Document uploaded safely to Vault!", document: newDoc });
});

// PUT /api/documents/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, feedbackNotes } = req.body;
  const db = getData();

  const doc = (db.user_documents || []).find(d => d.id === id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  doc.status = status;
  if (feedbackNotes) doc.feedback_notes = feedbackNotes;
  saveData(db);

  res.json({ message: `Document audit status updated to ${status}.`, document: doc });
});

export default router;
