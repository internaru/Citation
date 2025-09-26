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
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/types`, { timeout: 10000 });
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
        if (mounted) setError('Unable to load types: ' + err.message);
      }
    };

    const fetchFields = async (type, retries = 3) => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/fields/${type}`, { timeout: 10000 });
        console.log('Loaded fields for', type, ':', res.data);
        if (mounted) {
          setFields(res.data);
          // 초기 formData를 type만 세팅
          setFormData({ type: type });
        }
      } catch (err) {
        if (retries > 0) {
          console.warn(`Retrying fetchFields for ${type}, attempts left: ${retries}`);
          return fetchFields(type, retries - 1);
        }
        console.error('Field load error:', err.message);
        if (mounted) setError('Unable to load fields: ' + err.message);
      }
    };

    fetchTypes();

    return () => {
      mounted = false;
    };
  }, []);

  // Source Type 변경 핸들러
  const handleTypeChange = async (e) => {
    const type = e.target.value;
    console.log('Selected type:', type);
    setSelectedType(type);
    setFormData({ type });
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/fields/${type}`, { timeout: 10000 });
      console.log('Loaded fields for', type, ':', res.data);
      setFields(res.data);
    } catch (err) {
      console.error('Field load error:', err.message);
      setError('Unable to load types: ' + err.message);
    }
  };

  // 일반 텍스트 입력 핸들러
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInputClick = (e) => {
    console.log(`Input clicked: ${e.target.name}, type = ${e.target.type}`);
  };

  // 인용문 생성
  const generateCitation = async () => {
    setError('');
    setCitation('');
    try {
      // 날짜를 yyyy-MM-dd 문자열로 변환
      const formatDate = (date) => {
        if (!(date instanceof Date)) return undefined;
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const dataToSend = { ...formData };
      if (formData.issued) dataToSend.issued = formatDate(formData.issued);
      if (formData.accessed) dataToSend.accessed = formatDate(formData.accessed);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/generate`, {
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
      setError(err.response?.data?.error || 'Error generating quote: ' + err.message);
    }
  };

  // 인용문 복사
  const copyCitation = () => {
    copy(citation);
    alert('Copy completed!');
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

      <button onClick={generateCitation}>Cite Source</button>
      {error && <p className="error">{error}</p>}
      {citation && (
        <div>
          <h2>결과:</h2>
          <p>{citation}</p>
          <button onClick={copyCitation}>Copy to clipboard</button>
        </div>
      )}
    </div>
  );
}

export default App;
