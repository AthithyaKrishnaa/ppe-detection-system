const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase (only if keys exist)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

app.use(cors());
app.use(express.json());

// Serve the outputs directory statically so the frontend can access the images
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.post('/api/predict', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const inputPath = req.file.path;
  const outputFilename = 'out_' + req.file.filename;
  const outputPath = path.join(__dirname, 'outputs', outputFilename);
  const threshold = req.body.threshold || '0.45';

  // Spawn Python script
  const pythonProcess = spawn('python', ['predict.py', inputPath, outputPath, threshold], { cwd: __dirname });

  let outData = '';
  let errData = '';

  pythonProcess.stdout.on('data', (data) => {
    outData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errData += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    console.log(`Python process exited with code ${code}`);
    
    if (code !== 0) {
      console.error('Python Output:', outData);
      console.error('Python Error:', errData);
      return res.status(500).json({ error: 'Inference failed', details: errData });
    }

    try {
      // Find the JSON part in the stdout (ignoring potential ultralytics console logs)
      const lines = outData.split('\n');
      let resultObj = null;
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            resultObj = JSON.parse(line.trim());
          } catch(e) {}
        }
      }

      if (fs.existsSync(outputPath)) {
         let resultUrl = `http://localhost:${PORT}/outputs/${outputFilename}`;

         // If we're in the cloud (Supabase initialized), upload the result!
         if (supabase) {
           const fileBuffer = fs.readFileSync(outputPath);
           const { data, error } = await supabase.storage
             .from('ppe-detections') // Make sure to create this bucket in Supabase!
             .upload(`results/${outputFilename}`, fileBuffer, {
               contentType: 'image/jpeg',
               upsert: true
             });
           
           if (!error) {
             const { data: { publicUrl } } = supabase.storage
               .from('ppe-detections')
               .getPublicUrl(`results/${outputFilename}`);
             resultUrl = publicUrl;
           } else {
             console.error('Supabase Upload Error:', error);
           }
         }

         return res.json({
           success: true,
           resultUrl: resultUrl,
           metadata: resultObj
         });
      } else {
         return res.status(500).json({ error: 'Annotated image not found after inference' });
      }

    } catch (parseError) {
       console.error('Parse Error:', parseError);
       return res.status(500).json({ error: 'Failed to process inference output' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
