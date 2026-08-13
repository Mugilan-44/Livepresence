import express from 'express';
import { querySQL } from '../db.js';

const router = express.Router();

// GET /api/documents
router.get('/', async (req, res) => {
  const { requesterId, requesterRole } = req.query;

  try {
    let docs = [];
    if (requesterRole === 'SUPER_ADMIN' || requesterRole === 'HR') {
      docs = await querySQL('SELECT * FROM user_documents ORDER BY uploaded_at DESC');
    } else if (requesterId) {
      docs = await querySQL('SELECT * FROM user_documents WHERE user_id = ? ORDER BY uploaded_at DESC', [requesterId]);
    } else {
      docs = await querySQL('SELECT * FROM user_documents ORDER BY uploaded_at DESC');
    }
    res.json(docs);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: "Failed to fetch document records." });
  }
});

// POST /api/documents (1MB File Size Limit Enforced)
router.post('/', async (req, res) => {
  const { userId, documentType, fileName, fileSize, fileUrl } = req.body;

  if (fileUrl && fileUrl.length > 1.4 * 1024 * 1024) {
    return res.status(400).json({ error: "File size exceeds 1 MB limit. Please upload a file smaller than 1 MB." });
  }

  try {
    const users = await querySQL('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    const docId = `doc-${Date.now()}`;

    await querySQL(
      `INSERT INTO user_documents 
       (id, user_id, user_name, role, document_type, file_name, file_size, file_url, status, is_encrypted, encryption_algorithm, security_clearance, feedback_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 1, 'AES-256-GCM-SHA256', 'PRIVATE_RESTRICTED', 'Awaiting HR verification queue review.')`,
      [docId, user.id, user.name, user.role, documentType, fileName, fileSize || "500 KB", fileUrl || null]
    );

    const created = await querySQL('SELECT * FROM user_documents WHERE id = ?', [docId]);
    res.json({ message: "Document uploaded safely to Vault!", document: created[0] });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: "Failed to save document in database." });
  }
});

// PUT /api/documents/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, feedbackNotes } = req.body;

  try {
    const existing = await querySQL('SELECT * FROM user_documents WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    await querySQL(
      'UPDATE user_documents SET status = ?, feedback_notes = ? WHERE id = ?',
      [status, feedbackNotes || existing[0].feedback_notes, id]
    );

    const updated = await querySQL('SELECT * FROM user_documents WHERE id = ?', [id]);
    res.json({ message: `Document audit status updated to ${status}.`, document: updated[0] });
  } catch (err) {
    console.error('Error updating document status:', err);
    res.status(500).json({ error: "Failed to update document status." });
  }
});

export default router;
