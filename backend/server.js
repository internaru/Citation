const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Cite = require('citation-js');
const fs = require('fs');
const path = require('path');

require('@citation-js/plugin-csl');

const styleFolder = path.join(__dirname, 'style');
const apaXML = fs.readFileSync(path.join(styleFolder, 'apa.csl'), 'utf8');
const mlaXML = fs.readFileSync(path.join(styleFolder, 'modern-language-association.csl'), 'utf8');
const chicagoXML = fs.readFileSync(path.join(styleFolder, 'chicago-author-date.csl'), 'utf8');

Cite.plugins.config.get('@csl').templates.add('apa', apaXML);
Cite.plugins.config.get('@csl').templates.add('mla', mlaXML);
Cite.plugins.config.get('@csl').templates.add('chicago', chicagoXML);

const app = express();
const PORT = 5000;

app.use(bodyParser.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

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

app.get('/fields/:type', (req, res) => {
  try {
    const fieldsPath = path.join(__dirname, 'fields.json');
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

    let template;
    if (style.toLowerCase() === 'apa') {
      template = 'apa';
    } else if (style.toLowerCase() === 'mla') {
      template = 'mla';
    } else if (style.toLowerCase() === 'chicago') {
      template = 'chicago';
    } else {
      return res.status(400).json({ error: `Unsupported style: ${style}` });
    }

    const fieldsPath = path.join(__dirname, 'fields.json');
    const fieldsData = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
    const typeFields = fieldsData.types[type]?.fields || [];
    const missing = typeFields.filter(f => f.required && (!data[f.name] || (Array.isArray(data[f.name]) && data[f.name].every(entry => !entry.given && !entry.family))));
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing fields: ${missing.map(f => f.name).join(', ')}`
      });
    }

    const input = { ...data, type };
    ['author', 'editor', 'translator'].forEach(field => {
      if (Array.isArray(data[field])) {
        input[field] = data[field].filter(entry => entry.given || entry.family).map(entry => ({
          given: entry.given || undefined,
          family: entry.family || undefined,
          middle: entry.middle || undefined,
          suffix: entry.suffix || undefined,
        }));
      }
    });

    const cite = new Cite(input);
    const output = cite.format('bibliography', {
      format: 'text',
      template,
    });

    res.json({ citation: output });
  } catch (err) {
    console.error('Error in /generate:', err.message);
    res.status(500).json({ error: 'Failed to generate citation', details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));