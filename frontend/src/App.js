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
          const initialFormData = { type };
          res.data.forEach(field => {
            if (['author', 'editor', 'translator'].includes(field.name)) {
              initialFormData[field.name] = [{ name: '' }]; // 배열로 초기화
            } else {
              initialFormData[field.name] = '';
            }
          });
          setFormData(initialFormData);
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

  const handleTypeChange = async (e) => {
    const type = e.target.value;
    console.log('Selected type:', type);
    setSelectedType(type);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/fields/${type}`, { timeout: 10000 });
      console.log('Loaded fields for', type, ':', res.data);
      setFields(res.data);
      const initialFormData = { type };
      res.data.forEach(field => {
        if (['author', 'editor', 'translator'].includes(field.name)) {
          initialFormData[field.name] = [{ name: '' }]; // 배열로 초기화
        } else {
          initialFormData[field.name] = '';
        }
      });
      setFormData(initialFormData);
    } catch (err) {
      console.error('Field load error:', err.message);
      setError('Unable to load fields: ' + err.message);
    }
  };

  const handleInputChange = (fieldName, index) => (e) => {
    if (['author', 'editor', 'translator'].includes(fieldName)) {
      const newArray = [...formData[fieldName]];
      newArray[index] = { name: e.target.value };
      setFormData({ ...formData, [fieldName]: newArray });
    } else {
      setFormData({ ...formData, [fieldName]: e.target.value });
    }
  };

  const addFieldEntry = (fieldName) => {
    if (['author', 'editor', 'translator'].includes(fieldName)) {
      setFormData({
        ...formData,
        [fieldName]: [...formData[fieldName], { name: '' }],
      });
    }
  };

  const removeFieldEntry = (fieldName, index) => {
    if (['author', 'editor', 'translator'].includes(fieldName) && formData[fieldName].length > 1) {
      const newArray = formData[fieldName].filter((_, i) => i !== index);
      setFormData({ ...formData, [fieldName]: newArray });
    }
  };

  const generateCitation = async () => {
    setError('');
    setCitation('');
    try {
      const formatDate = (date) => {
        if (!date) return undefined;
        const [yyyy, mm, dd] = date.split('-').map(Number);
        return { 'date-parts': [[yyyy, mm || 1, dd || 1]] };
      };

      const dataToSend = {
        ...formData,
        issued: formData.issued ? formatDate(formData.issued) : undefined,
        accessed: formData.accessed ? formatDate(formData.accessed) : undefined,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/generate`,
        {
          type: selectedType,
          style: style.toLowerCase(),
          data: dataToSend,
        },
        { timeout: 10000 }
      );
      setCitation(response.data.citation);
    } catch (err) {
      setError(err.response?.data?.error || 'Error generating citation: ' + err.message);
    }
  };

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
        <div key={f.name} className="field-group">
          <label className="field-label">
            {f.label}
            {f.required ? '*' : ''}
          </label>
          {['author', 'editor', 'translator'].includes(f.name) ? (
            <div className="multi-field">
              {formData[f.name]?.map((entry, index) => (
                <div key={`${f.name}-${index}`} className="field-row multi-field-row">
                  <input
                    className="field-input"
                    name={`${f.name}-${index}`}
                    type="text"
                    onChange={handleInputChange(f.name, index)}
                    value={entry.name || ''}
                    required={f.required && index === 0}
                  />
                  {formData[f.name].length > 1 && (
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeFieldEntry(f.name, index)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="add-button"
                onClick={() => addFieldEntry(f.name)}
              >
                {f.label} 추가
              </button>
            </div>
          ) : (
            <input
              className="field-input"
              name={f.name}
              type={['issued', 'accessed'].includes(f.name) ? 'date' : 'text'}
              onChange={handleInputChange(f.name)}
              value={formData[f.name] || ''}
              required={f.required}
            />
          )}
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