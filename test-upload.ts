import fs from 'fs';

async function upload() {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync('package.json');
  const blob = new Blob([fileBuffer], { type: 'application/json' });
  formData.append('images', blob, 'package.json');

  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error(err);
  }
}

upload();
