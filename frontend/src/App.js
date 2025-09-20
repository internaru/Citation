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

  // 백엔드에서 타입 목록 로드
  useEffect(() => {
    axios
      .get('http://localhost:5000/types')
      .then((res) => {
        setTypes(res.data);
        if (res.data.length > 0) {
          setSelectedType(res.data[0]);
          axios
            .get(`http://localhost:5000/fields/${res.data[0]}`)
            .then((fieldRes) => {
              setFields(fieldRes.data);
              setFormData({ type: res.data[0] });
            })
            .catch((fieldErr) => {
              console.error('필드 로드 오류:', fieldErr);
              setError('필드를 로드할 수 없습니다.');
            });
        }
      })
      .catch((err) => {
        console.error('타입 목록 로드 오류:', err);
        setError('타입 목록을 로드할 수 없습니다.');
      });
  }, []);

  const handleTypeChange = async (e) => {
    const type = e.target.value;
    setSelectedType(type);
    setFormData({ type });
    try {
      const res = await axios.get(`http://localhost:5000/fields/${type}`);
      setFields(res.data);
    } catch (err) {
      console.error('필드 로드 오류:', err);
      setError('필드를 로드할 수 없습니다.');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      });
      setCitation(response.data.citation);
    } catch (err) {
      setError(err.response?.data?.error || '인용문 생성 중 오류가 발생했습니다.');
    }
  };

  const copyCitation = () => {
    copy(citation);
    alert('인용문이 복사되었습니다!');
  };

  return (
    <div className="App">
      <h1>인용문 생성기</h1>
      <select onChange={(e) => setStyle(e.target.value)} value={style}>
        <option value="apa">APA</option>
        <option value="mla">MLA</option>
        <option value="chicago">CMOS</option>
      </select>
      <select onChange={handleTypeChange} value={selectedType}>
        <option value="">유형 선택</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {fields.map((f) => (
        <div key={f.name}>
          <label>
            {f.label}
            {f.required ? '*' : ''}
          </label>
          <input
            name={f.name}
            type={f.name.includes('date') ? 'date' : 'text'}
            onChange={handleInputChange}
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