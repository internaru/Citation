import React, { useState, useEffect } from 'react';
import axios from 'axios';
import copy from 'clipboard-copy';
import './App.css';

function App() {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [style, setStyle] = useState('apa');
  const [citation, setCitation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchTypes = async (retries = 3) => {
      try {
        const res = await axios.get('http://localhost:5000/types', { timeout: 10000 });
        console.log('Types loaded:', res.data);
        if (mounted) {
          setTypes(res.data);
          if (res.data.length > 0) {
            setSelectedType(res.data[0]);
            await fetchFields(res.data[0]);
          }
        }
      } catch (err) {
        if (retries > 0) {
          console.warn(`Retrying fetchTypes, attempts left: ${retries}`);
          return fetchTypes(retries - 1);
        }
        console.error('Type load error:', err.message);
        if (mounted) setError('타입 목록을 로드할 수 없습니다: ' + err.message);
      }
    };

    const fetchFields = async (type, retries = 3) => {
      try {
        const res = await axios.get(`http://localhost:5000/fields/${type}`, { timeout: 10000 });
        console.log('Loaded fields for', type, ':', res.data);
        if (mounted) {
          setFields(res.data);
          setFormData({ type });
        }
      } catch (err) {
        if (retries > 0) {
          console.warn(`Retrying fetchFields for ${type}, attempts left: ${retries}`);
          return fetchFields(type, retries - 1);
        }
        console.error('Field load error:', err.message);
        if (mounted) setError('필드를 로드할 수 없습니다: ' + err.message);
      }
    };

    fetchTypes();
    return () => {
      mounted = false;
    };
  }, []);

  const handleTypeChange = async (e) => {
    const type = e.target.value;
    console.log('Selected type:', type);
    setSelectedType(type);
    setFormData({ type });
    try {
      const res = await axios.get(`http://localhost:5000/fields/${type}`, { timeout: 10000 });
      console.log('Loaded fields for', type, ':', res.data);
      setFields(res.data);
    } catch (err) {
      console.error('Field load error:', err.message);
      setError('필드를 로드할 수 없습니다: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    console.log(`Input change: ${e.target.name} = ${e.target.value}, type = ${e.target.type}`);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInputClick = (e) => {
    console.log(`Input clicked: ${e.target.name}, type = ${e.target.type}`);
  };

  const generateCitation = async () => {
    setError('');
    setCitation('');
    try {
      const response = await axios.post('http://localhost:5000/generate', {
        type: selectedType,
        style: style.toLowerCase(),
        data: {
          ...formData,
          type: selectedType,
          issued: formData.issued
            ? { 'date-parts': [[parseInt(formData.issued.split('-')[0]), parseInt(formData.issued.split('-')[1] || 1), parseInt(formData.issued.split('-')[2] || 1)]] }
            : undefined,
          accessed: formData.accessed
            ? { 'date-parts': [[parseInt(formData.accessed.split('-')[0]), parseInt(formData.accessed.split('-')[1] || 1), parseInt(formData.accessed.split('-')[2] || 1)]] }
            : undefined,
        },
      }, { timeout: 10000 });
      setCitation(response.data.citation);
    } catch (err) {
      setError(err.response?.data?.error || '인용문 생성 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const copyCitation = () => {
    copy(citation);
    alert('인용문이 복사되었습니다!');
  };

  return (
    <div className="App">
      <h1>ICS Citation Generator (Ver1.0)</h1>
      <div className="field-row">
        <label className="field-label">Style*</label>
        <select className="field-input" onChange={(e) => setStyle(e.target.value)} value={style}>
          <option value="apa">APA</option>
          <option value="mla">MLA</option>
          <option value="chicago">CMOS</option>
        </select>
      </div>
      <div className="field-row">
        <label className="field-label">Source Type*</label>
        <select className="field-input" onChange={handleTypeChange} value={selectedType}>
          <option value="">유형 선택</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {fields.map((f) => (
        <div key={f.name} className="field-row">
          <label className="field-label">
            {f.label}
            {f.required ? '*' : ''}
          </label>
          <input
            className="field-input"
            name={f.name}
            type={['issued', 'accessed'].includes(f.name) ? 'date' : 'text'}
            onChange={handleInputChange}
            onClick={handleInputClick}
            value={formData[f.name] || ''}
            required={f.required}
          />
        </div>
      ))}
      <button onClick={generateCitation}>인용문 생성</button>
      {error && <p className="error">{error}</p>}
      {citation && (
        <div>
          <h2>결과:</h2>
          <p>{citation}</p>
          <button onClick={copyCitation}>복사</button>
        </div>
      )}
    </div>
  );
}

export default App;