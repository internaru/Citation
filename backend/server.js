const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Cite = require('citation-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// fields.json 로드 (루트에서 공유)
const fieldsPath = path.join(__dirname, 'fields.json');
const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));

app.get('/types', (req, res) => {
  const fieldsPath = path.join(__dirname, 'fields.json');
  const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
  res.json(Object.keys(fieldsData.types));
});

app.get('/fields/:type', (req, res) => {
  const fieldsPath = ppath.join(__dirname, 'fields.json');
  const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
  const type = req.params.type;
  if (fieldsData.types[type]) {
    res.json(fieldsData.types[type].fields);
  } else {
    res.status(404).json({ error: 'Type not found' });
  }
});

// API: 인용 생성
app.post('/generate', (req, res) => {
  const { type, style, data } = req.body;  // type: 자료유형, style: APA/MLa/CMOS, data: 입력 객체

  // 필수 필드 검사
  const typeFields = fieldsData.types[type].fields;
  const missing = typeFields.filter(f => f.required && !data[f.name]);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing fields: ${missing.map(f => f.name).join(', ')}` });
  }

  // Citation.js로 인용 생성
  const input = { ...data, type: typeFields.find(f => f.name === 'type').default || type };
  const cite = new Cite(input);
  const output = cite.format('bibliography', { format: 'text', template: style.toLowerCase() });  // style: apa, mla, chicago

  res.json({ citation: output });
});

// 필요시 citeproc-js 플러그인 추가
// const citeproc = require('citeproc-js');
// Cite.plugins.add('citeproc', citeproc);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));