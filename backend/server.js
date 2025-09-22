const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Cite = require('citation-js');
const fs = require('fs');
const path = require('path');

// CSL 플러그인 로드
require('@citation-js/plugin-csl');

// CSL 스타일 불러오기
const mlaXML = fs.readFileSync(
  path.join(__dirname, 'style/modern-language-association.csl'),
  'utf8'
);
const chicagoXML = fs.readFileSync(
  path.join(__dirname, 'style/chicago-author-date.csl'),
  'utf8'
);

// citation-js에 스타일 등록
Cite.plugins.config.get('@csl').templates.add('mla', mlaXML);
Cite.plugins.config.get('@csl').templates.add('chicago', chicagoXML);

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: 'http://localhost:3000' }));

// 자료 유형 목록 제공
app.get('/types', (req, res) => {
  try {
    const fieldsPath = path.join(__dirname, 'fields.json');
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

// 특정 자료 유형 필드 제공
app.get('/fields/:type', (req, res) => {
  try {
    const fieldsPath = path.join(__dirname, 'fields.json');
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

// 인용문 생성
app.post('/generate', (req, res) => {
  try {
    const { type, style, data } = req.body;

    // 스타일 매핑
    let template;
    if (style.toLowerCase() === 'mla') {
      template = 'mla';
    } else if (style.toLowerCase() === 'chicago') {
      template = 'chicago';
    } else {
      template = 'apa'; // 기본
    }

    const fieldsPath = path.join(__dirname, 'fields.json');
    const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
    const typeFields = fieldsData.types[type]?.fields || [];
    const missing = typeFields.filter(f => f.required && !data[f.name]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing fields: ${missing.map(f => f.name).join(', ')}`
      });
    }

    const input = { ...data, type };
    console.log('Input to Cite:', input);

    const cite = new Cite(input);
    const output = cite.format('bibliography', {
      format: 'text',
      template
    });

    console.log('Generated citation:', output);
    res.json({ citation: output });
  } catch (err) {
    console.error('Error in /generate:', err.message);
    res.status(500).json({ error: 'Failed to generate citation', details: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
