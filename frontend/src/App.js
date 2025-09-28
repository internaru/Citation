import React, { useState, useEffect } from 'react';
import axios from 'axios';
import copy from 'clipboard-copy';
import { FaTrash } from 'react-icons/fa';
import './App.css';
import logo from './resource/citation_block.png';

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
              initialFormData[field.name] = [{ given: '', family: '', middle: '', suffix: '' }];
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
          initialFormData[field.name] = [{ given: '', family: '', middle: '', suffix: '' }];
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

  const handleInputChange = (fieldName, index, subField) => (e) => {
    if (['author', 'editor', 'translator'].includes(fieldName)) {
      const newArray = [...formData[fieldName]];
      newArray[index] = { ...newArray[index], [subField]: e.target.value };
      setFormData({ ...formData, [fieldName]: newArray });
    } else {
      setFormData({ ...formData, [fieldName]: e.target.value });
    }
  };

  const addFieldEntry = (fieldName) => {
    if (['author', 'editor', 'translator'].includes(fieldName)) {
      setFormData({
        ...formData,
        [fieldName]: [...formData[fieldName], { given: '', family: '', middle: '', suffix: '' }],
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
    <div className="app-container">
      <header className="header">
        <img src={logo} alt="Logo" className="header-logo" />
        <h1>ICS Citation Generator</h1>
      </header>
      <div className="main-content">
        <aside className="sidebar">
          <h2>Options</h2>
          <div className="sidebar-section">
            <label className="sidebar-label">Style*</label>
            <select className="sidebar-input" onChange={(e) => setStyle(e.target.value)} value={style}>
              <option value="apa">APA</option>
              <option value="mla">MLA</option>
              <option value="chicago">CMOS</option>
            </select>
          </div>
          <div className="sidebar-section">
            <label className="sidebar-label">Source Type*</label>
            <select className="sidebar-input" onChange={handleTypeChange} value={selectedType}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sidebar-section">
            <h3>Reference Link</h3>
            <ul className="sidebar-links">
              <li><a href="https://owl.purdue.edu/owl/research_and_citation/apa_style/apa_formatting_and_style_guide/general_format.html" target="_blank">APA Guide</a></li>
              <li><a href="https://owl.purdue.edu/owl/research_and_citation/mla_style/mla_formatting_and_style_guide/mla_general_format.html" target="_blank">MLA Guide</a></li>
              <li><a href="https://owl.purdue.edu/owl/research_and_citation/chicago_manual_18th_edition/cmos_formatting_and_style_guide/general_format.html" target="_blank">CMOS Guide</a></li>
            </ul>
          </div>
        </aside>
        <main className="content">
          {fields.map((f) => (
            <div key={f.name} className="field-group">
              <label className="field-label">
                {f.label}
                {f.required ? '*' : ''}
              </label>
              {['author', 'editor', 'translator'].includes(f.name) ? (
                <div className="multi-field">
                  {formData[f.name]?.map((entry, index) => (
                    <div key={`${f.name}-${index}`} className="multi-field-row">
                      <div className="name-field">
                        <span className="name-label">First Name</span>
                        <input
                          className="field-input"
                          name={`${f.name}-${index}-given`}
                          type="text"
                          onChange={handleInputChange(f.name, index, 'given')}
                          value={entry.given || ''}
                          required={f.required && index === 0}
                        />
                      </div>
                      <div className="name-field">
                        <span className="name-label">Middle Name</span>
                        <input
                          className="field-input"
                          name={`${f.name}-${index}-middle`}
                          type="text"
                          onChange={handleInputChange(f.name, index, 'middle')}
                          value={entry.middle || ''}
                        />
                      </div>
                      <div className="name-field">
                        <span className="name-label">Last Name</span>
                        <input
                          className="field-input"
                          name={`${f.name}-${index}-family`}
                          type="text"
                          onChange={handleInputChange(f.name, index, 'family')}
                          value={entry.family || ''}
                          required={f.required && index === 0}
                        />
                      </div>
                      <div className="name-field">
                        <span className="name-label">Suffix</span>
                        <input
                          className="field-input"
                          name={`${f.name}-${index}-suffix`}
                          type="text"
                          onChange={handleInputChange(f.name, index, 'suffix')}
                          value={entry.suffix || ''}
                        />
                      </div>
                      {formData[f.name].length > 1 && (
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeFieldEntry(f.name, index)}
                          title="Delete"
                        >
                          <FaTrash size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-button"
                    onClick={() => addFieldEntry(f.name)}
                  >
                    Add {f.label}
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
          <div className="action-buttons">
            <button onClick={generateCitation}>Cite Source</button>
            {citation && <button onClick={copyCitation}>Copy to Clipboard</button>}
          </div>
          {error && <p className="error">{error}</p>}
          {citation && (
            <div className="result-box">
              <h2>Result:</h2>
              <p>{citation}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;