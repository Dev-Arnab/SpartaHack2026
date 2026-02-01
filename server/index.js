import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import cors from 'cors';
import { RealityDefender } from '@realitydefender/realitydefender';

// Load .env from project root
dotenv.config();

const RD_API_KEY = process.env.RD_API_KEY;
if (!RD_API_KEY) {
  console.error('Missing RD_API_KEY in environment. Create a .env file with RD_API_KEY=...');
  process.exit(1);
}

const rd = new RealityDefender({ apiKey: RD_API_KEY });

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// POST /detect accepts multipart/form-data with `file` field
app.post('/detect', upload.single('file'), async (req, res) => {
  try {
    console.log('Incoming /detect request', { origin: req.headers.origin, ip: req.ip, ua: req.headers['user-agent'] });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log('Uploaded file:', { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });

    // Write to a temp file because the SDK usage example expects a filePath
    const tmpDir = os.tmpdir();
    const filename = `rd-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(req.file.originalname) || '';
    const tmpPath = path.join(tmpDir, filename + ext);

    await fs.promises.writeFile(tmpPath, req.file.buffer);

    // Call RealityDefender detect (using filePath as in the provided example)
    const result = await rd.detect({ filePath: tmpPath });

    // Remove temp file
    fs.unlink(tmpPath, () => {});

    // Return the SDK response directly to the client
    res.json(result);
  } catch (err) {
    console.error('Detect error:', err);
    res.status(500).json({ error: 'Detection failed', message: err instanceof Error ? err.message : String(err) });
  }
});

// Simple healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`RealityDefender local server listening on http://localhost:${port}`);
});
