const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Cite = require('citation-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: 'http://localhost:3000' }));

app.get('/types', (req, res) => {
  try {
    const fieldsPath = path.join(__dirname, 'fields.json');
    console.log('Attempting to read fields.json from:', fieldsPath);
    if (!fs.existsSync(fieldsPath)) {
      throw new Error(`fields.json not found at ${fieldsPath}`);
    }
    const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
    res.json(Object.keys(fieldsData.types));
  } catch (err) {
    console.error('Error in /types:', err.message);
    res.status(500).json({ error: 'Failed to load types', details: err.message });
  }
});

app.get('/fields/:type', (req, res) => {
  try {
    const fieldsPath = path.join(__dirname, 'fields.json');
    console.log('Attempting to read fields.json from:', fieldsPath);
    if (!fs.existsSync(fieldsPath)) {
      throw new Error(`fields.json not found at ${fieldsPath}`);
    }
    const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
    const type = req.params.type;
    if (fieldsData.types[type]) {
      res.json(fieldsData.types[type].fields);
    } else {
      res.status(404).json({ error: `Type ${type} not found` });
    }
  } catch (err) {
    console.error('Error in /fields/:type:', err.message);
    res.status(500).json({ error: 'Failed to load fields', details: err.message });
  }
});

app.post('/generate', (req, res) => {
  try {
    const { type, style, data } = req.body;
    const fieldsPath = path.join(__dirname, 'fields.json');
    const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
    const typeFields = fieldsData.types[type]?.fields || [];
    const missing = typeFields.filter(f => f.required && !data[f.name]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing fields: ${missing.map(f => f.name).join(', ')}` });
    }
    const input = { ...data, type }; // id 생략, type은 요청에서
    const cite = new Cite(input);
    console.log('Cite data:', cite.data); // id 자동 생성 확인
    const output = cite.format('bibliography', { format: 'text', template: style.toLowerCase() });
    res.json({ citation: output });
  } catch (err) {
    console.error('Error in /generate:', err.message);
    res.status(500).json({ error: 'Failed to generate citation', details: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));