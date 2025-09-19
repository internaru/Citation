import React, { useState, useEffect } from 'react';
import axios from 'axios';
import copy from 'clipboard-copy';

function App() {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [style, setStyle] = useState('APA');
  const [citation, setCitation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // fields.json 로드 (백엔드에서 공유하거나 프론트에서 fetch)
    // 초기에는 하드코딩 또는 별도 fetch API 추가
    // 예시: axios.get('/fields').then(res => setTypes(Object.keys(res.data.types)));
    // 여기서는 임시 하드코딩 (실제로는 백엔드 API로)
    const tempFields = { /* fields.json 내용 복사 */ };
    setTypes(Object.keys(tempFields.types));
  }, []);

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setFields(tempFields.types[e.target.value].fields);  // 동적 필드 로드
    setFormData({});  // 리셋
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateCitation = async () => {
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/generate', { type: selectedType, style, data: formData });
      setCitation(res.data.citation);
    } catch (err) {
      setError(err.response?.data?.error || 'Error generating citation');
    }
  };

  const copyCitation = () => {
    copy(citation);
    alert('Copied!');
  };

  return (
    <div>
      <h1>Citation Generator</h1>
      <select onChange={e => setStyle(e.target.value)}>
        <option>APA</option>
        <option>MLA</option>
        <option>CMOS</option>
      </select>
      <select onChange={handleTypeChange}>
        <option value="">Select Type</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {fields.map(f => (
        <div key={f.name}>
          <label>{f.label}{f.required ? '*' : ''}</label>
          <input name={f.name} onChange={handleInputChange} value={formData[f.name] || ''} />
        </div>
      ))}
      <button onClick={generateCitation}>Generate</button>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {citation && (
        <div>
          <h2>Result:</h2>
          <p>{citation}</p>
          <button onClick={copyCitation}>Copy</button>
        </div>
      )}
    </div>
  );
}

export default App;