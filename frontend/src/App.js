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
          setSelectedType(res.data[0]); // 첫 번째 타입을 기본 선택
          // 필드 데이터를 가져오려면 추가 API 호출 필요
          // 임시로 하드코딩된 fieldsData 사용
          const fieldsData = {
            types: {
              webpage: {
                fields: [
                  { name: 'id', label: 'ID', required: true },
                  { name: 'type', label: 'Type', required: true, default: 'webpage' },
                  { name: 'title', label: '제목', required: true },
                  { name: 'author', label: '저자', required: false },
                  { name: 'container-title', label: '웹사이트 이름', required: false },
                  { name: 'issued', label: '발행 날짜', required: true },
                  { name: 'accessed', label: '접근 날짜', required: true },
                  { name: 'URL', label: 'URL', required: true },
                ],
              },
              // 다른 타입 추가 가능
            },
          };
          setFields(fieldsData.types[res.data[0]]?.fields || []);
          setFormData({ type: res.data[0] });
        }
      })
      .catch((err) => {
        console.error('타입 목록 로드 오류:', err);
        setError('타입 목록을 로드할 수 없습니다.');
      });
  }, []);

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setSelectedType(type);
    // 임시로 하드코딩된 fieldsData 사용
    const fieldsData = {
      types: {
        webpage: {
          fields: [
            { name: 'id', label: 'ID', required: true },
            { name: 'type', label: 'Type', required: true, default: 'webpage' },
            { name: 'title', label: '제목', required: true },
            { name: 'author', label: '저자', required: false },
            { name: 'container-title', label: '웹사이트 이름', required: false },
            { name: 'issued', label: '발행 날짜', required: true },
            { name: 'accessed', label: '접근 날짜', required: true },
            { name: 'URL', label: 'URL', required: true },
          ],
        },
      },
    };
    setFields(fieldsData.types[type]?.fields || []);
    setFormData({ type }); // type 필드 초기화
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
            ? { 'date-parts': [[parseInt(formData.issued.split('-')[0]), parseInt(formData.issued.split('-')[1]), parseInt(formData.issued.split('-')[2])]] }
            : undefined,
          accessed: formData.accessed
            ? { 'date-parts': [[parseInt(formData.accessed.split('-')[0]), parseInt(formData.accessed.split('-')[1]), parseInt(formData.accessed.split('-')[2])]] }
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
            onChange={handleInputChange}
            value={formData[f.name] || ''}
            required={f.required}
          />
        </div>
      ))}
      <button onClick={generateCitation}>인용문 생성</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
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