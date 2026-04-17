const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function uploadModel() {
  const modelPath = path.join(__dirname, '..', 'weight', 'best.pt');
  
  if (!fs.existsSync(modelPath)) {
    console.error('Error: weight/best.pt not found!');
    return;
  }

  console.log('Uploading 129MB Model to Supabase (models/best.pt)... this may take a minute...');
  
  const fileBuffer = fs.readFileSync(modelPath);
  const { data, error } = await supabase.storage
    .from('models')
    .upload('best.pt', fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: true
    });

  if (error) {
    console.error('Upload failed:', error.message);
  } else {
    console.log('✅ Success! Model is now hosted in the cloud.');
    console.log('URL:', `${process.env.SUPABASE_URL}/storage/v1/object/public/models/best.pt`);
  }
}

uploadModel();
