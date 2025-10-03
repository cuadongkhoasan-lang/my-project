import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// From types.ts
const Answer = {
  UNSET: 'unset',
  YES: 'yes',
  NO: 'no',
};

const RecommendationLevel = {
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
  INFO: 'info',
};

// From services/geminiService.ts
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildPrompt = (
  criteriaState, 
  inclusionCriteria, 
  absoluteContraindications, 
  relativeContraindications
) => {
    let prompt = `Phân tích tình huống lâm sàng sau đây của một bệnh nhân bị thai ngoài tử cung để xác định khả năng phù hợp với phương pháp điều trị nội khoa bằng methotrexate. Cung cấp một bản tóm tắt súc tích cho chuyên gia y tế bằng tiếng Việt.

Tình trạng lâm sàng của bệnh nhân:
`;

    const getAnswerText = (answer) => {
        if (answer === 'yes') return 'Có';
        if (answer === 'no') return 'Không';
        return 'Chưa trả lời';
    };

    prompt += "\n--- TIÊU CHUẨN LỰA CHỌN ---\n";
    inclusionCriteria.forEach(c => {
        prompt += `- ${c.text}: ${getAnswerText(criteriaState[c.id])}\n`;
    });

    prompt += "\n--- CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI ---\n";
    absoluteContraindications.forEach(c => {
        prompt += `- ${c.text}: ${getAnswerText(criteriaState[c.id])}\n`;
    });

    prompt += "\n--- CHỐNG CHỈ ĐỊNH TƯƠNG ĐỐI ---\n";
    relativeContraindications.forEach(c => {
        prompt += `- ${c.text}: ${getAnswerText(criteriaState[c.id])}\n`;
    });

    prompt += `
---
Dựa trên những câu trả lời này, hãy cung cấp một bản tóm tắt về khả năng điều trị nội khoa bằng methotrexate của bệnh nhân. Giải thích lý do dựa trên các tiêu chí đã hoặc chưa được đáp ứng.
`;

    return prompt;
};

const getAiSummary = async (
  criteriaState, 
  inclusionCriteria, 
  absoluteContraindications, 
  relativeContraindications
) => {
    if (!process.env.API_KEY) {
        return "Lỗi: API Key for Gemini is not configured. Please set the API_KEY environment variable.";
    }

    try {
        const prompt = buildPrompt(criteriaState, inclusionCriteria, absoluteContraindications, relativeContraindications);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        return `Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại. Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
};


// From components/EctopicPregnancyTool.tsx
const INCLUSION_CRITERIA = [
  { id: 'hemoStable', text: 'Huyết động của bệnh nhân ổn định?' },
  { id: 'noContraindications', text: 'Không có chống chỉ định tuyệt đối với Methotrexate?' },
  { id: 'canFollowUp', text: 'Bệnh nhân có khả năng và sẵn sàng tuân thủ theo dõi sau điều trị?' },
  { id: 'confirmedEctopic', text: 'Chẩn đoán thai ngoài tử cung đã được xác định chắc chắn?' },
];

const ABSOLUTE_CONTRAINDICATIONS = [
    { id: 'rupture', text: 'Có dấu hiệu hoặc bằng chứng vỡ thai ngoài tử cung?' },
    { id: 'hemoUnstable', text: 'Huyết động không ổn định?' },
    { id: 'breastfeeding', text: 'Bệnh nhân đang cho con bú?' },
    { id: 'immunodeficiency', text: 'Bệnh nhân có tình trạng suy giảm miễn dịch?' },
    { id: 'mtxSensitivity', text: 'Có tiền sử quá mẫn với Methotrexate?' },
    { id: 'activePUD', text: 'Bệnh nhân đang bị loét dạ dày tá tràng tiến triển?' },
    { id: 'activePulmonary', text: 'Bệnh nhân có bệnh phổi tiến triển?' },
    { id: 'hepaticDysfunction', text: 'Có rối loạn chức năng gan đáng kể?' },
    { id: 'renalDysfunction', text: 'Có rối loạn chức năng thận đáng kể?' },
    { id: 'hematologicDysfunction', text: 'Có rối loạn chức năng huyết học đáng kể?' },
    { id: 'coexistingIUP', text: 'Có thai trong tử cung cùng tồn tại?'},
];

const RELATIVE_CONTRAINDICATIONS = [
    { id: 'fetalHeartbeat', text: 'Siêu âm phát hiện có hoạt động tim thai?' },
    { id: 'hcgLevel', text: 'Nồng độ β-hCG ban đầu > 5000 mIU/mL?' },
    { id: 'massSize', text: 'Kích thước khối thai ngoài tử cung > 4 cm?' },
    { id: 'refusesBlood', text: 'Bệnh nhân từ chối truyền máu?' },
];

const ALL_CRITERIA = [...INCLUSION_CRITERIA, ...ABSOLUTE_CONTRAINDICATIONS, ...RELATIVE_CONTRAINDICATIONS];

const CriterionRow = ({ criterion, value, onChange }) => {
  const getButtonClass = (buttonValue) => {
    let base = "px-4 py-2 rounded-md font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (value === buttonValue) {
      return base + (buttonValue === Answer.YES ? "bg-red-500 text-white ring-red-500" : "bg-green-600 text-white ring-green-600");
    }
    return base + "bg-gray-200 text-gray-700 hover:bg-gray-300";
  };
  
  return (
    React.createElement('div', { className: "flex justify-between items-center py-3 border-b border-gray-200" },
      React.createElement('p', { className: "text-gray-700" }, criterion.text),
      React.createElement('div', { className: "flex space-x-2" },
        React.createElement('button', { onClick: () => onChange(criterion.id, Answer.YES), className: getButtonClass(Answer.YES) }, 'Có'),
        React.createElement('button', { onClick: () => onChange(criterion.id, Answer.NO), className: getButtonClass(Answer.NO) }, 'Không')
      )
    )
  );
};

const ResultDisplayEctopic = ({ recommendation }) => {
  const colorClasses = {
    [RecommendationLevel.SUCCESS]: "bg-green-100 border-green-500 text-green-800",
    [RecommendationLevel.WARNING]: "bg-yellow-100 border-yellow-500 text-yellow-800",
    [RecommendationLevel.DANGER]: "bg-red-100 border-red-500 text-red-800",
    [RecommendationLevel.INFO]: "bg-blue-100 border-blue-500 text-blue-800",
  };
  
  return (
    React.createElement('div', { className: `p-4 mt-6 border-l-4 rounded-r-lg ${colorClasses[recommendation.level]}` },
      React.createElement('h3', { className: "font-bold text-lg" }, recommendation.title),
      React.createElement('p', { className: "mt-1" }, recommendation.text)
    )
  );
};

const EctopicPregnancyTool = ({ onBack }) => {
  const [criteriaState, setCriteriaState] = useState(() =>
    ALL_CRITERIA.reduce((acc, c) => ({ ...acc, [c.id]: Answer.UNSET }), {})
  );
  const [recommendation, setRecommendation] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleCriteriaChange = useCallback((id, value) => {
    setCriteriaState(prev => ({ ...prev, [id]: value }));
  }, []);

  useEffect(() => {
    const answeredCount = Object.values(criteriaState).filter(v => v !== Answer.UNSET).length;
    if (answeredCount === 0) {
        setRecommendation(null);
        return;
    }

    for (const criterion of ABSOLUTE_CONTRAINDICATIONS) {
      if (criteriaState[criterion.id] === Answer.YES) {
        setRecommendation({
          level: RecommendationLevel.DANGER,
          title: "Chống chỉ định tuyệt đối: KHÔNG nên điều trị nội khoa",
          text: `Bệnh nhân có chống chỉ định tuyệt đối (${criterion.text}). Cần xem xét phẫu thuật ngay lập tức.`,
        });
        return;
      }
    }
    
    for (const criterion of INCLUSION_CRITERIA) {
        if (criteriaState[criterion.id] === Answer.NO) {
            setRecommendation({
                level: RecommendationLevel.DANGER,
                title: "Không đáp ứng tiêu chuẩn lựa chọn",
                text: `Bệnh nhân không đáp ứng tiêu chuẩn lựa chọn cơ bản (${criterion.text}). Điều trị nội khoa không được khuyến cáo.`,
            });
            return;
        }
    }

    const relativeIssues = RELATIVE_CONTRAINDICATIONS.filter(c => criteriaState[c.id] === Answer.YES);
    if (relativeIssues.length > 0) {
      setRecommendation({
        level: RecommendationLevel.WARNING,
        title: "Thận trọng: Có chống chỉ định tương đối",
        text: `Bệnh nhân có thể được điều trị nội khoa, nhưng có các yếu tố làm giảm tỷ lệ thành công (${relativeIssues.map(c => c.text).join(', ')}). Cần tư vấn kỹ cho bệnh nhân.`,
      });
      return;
    }

    const allAnswered = answeredCount === ALL_CRITERIA.length;
    if (allAnswered) {
        setRecommendation({
            level: RecommendationLevel.SUCCESS,
            title: "Phù hợp điều trị nội khoa",
            text: "Bệnh nhân đáp ứng tất cả các tiêu chuẩn và không có chống chỉ định. Đây là một ứng cử viên tốt cho điều trị nội khoa bằng Methotrexate.",
        });
    } else {
         setRecommendation({
            level: RecommendationLevel.INFO,
            title: "Đang đánh giá...",
            text: "Vui lòng trả lời tất cả các câu hỏi để có kết luận cuối cùng. Hiện tại, chưa phát hiện chống chỉ định nào.",
        });
    }

  }, [criteriaState]);

  const handleGetAiSummary = async () => {
    setIsLoadingAi(true);
    setAiSummary(null);
    const summary = await getAiSummary(criteriaState, INCLUSION_CRITERIA, ABSOLUTE_CONTRAINDICATIONS, RELATIVE_CONTRAINDICATIONS);
    setAiSummary(summary);
    setIsLoadingAi(false);
  };
  
  const allQuestionsAnswered = useMemo(() => {
    return Object.values(criteriaState).every(v => v !== Answer.UNSET);
  }, [criteriaState]);

  const CriteriaSection = ({title, criteria}) => (
      React.createElement('div', { className: "mb-8" },
          React.createElement('h3', { className: "text-xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2 mb-4" }, title),
          criteria.map(c => React.createElement(CriterionRow, { key: c.id, criterion: c, value: criteriaState[c.id], onChange: handleCriteriaChange }))
      )
  );

  return (
    React.createElement('div', { className: "bg-white p-6 sm:p-8 rounded-lg shadow-xl" },
      React.createElement('button', { onClick: onBack, className: "mb-6 text-indigo-600 hover:text-indigo-800 font-semibold flex items-center" },
        React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 mr-2", viewBox: "0 0 20 20", fill: "currentColor" },
          React.createElement('path', { fillRule: "evenodd", d: "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z", clipRule: "evenodd" })
        ),
        'Quay lại'
      ),
      React.createElement('h2', { className: "text-2xl font-bold text-gray-900 mb-2" }, 'Đánh giá Điều trị Nội khoa Thai ngoài tử cung (Methotrexate)'),
      React.createElement('p', { className: "text-gray-600 mb-8" }, 'Trả lời các câu hỏi sau để đánh giá sự phù hợp của bệnh nhân với phác đồ điều trị nội khoa.'),
      
      React.createElement(CriteriaSection, { title: "Tiêu chuẩn Lựa chọn", criteria: INCLUSION_CRITERIA }),
      React.createElement(CriteriaSection, { title: "Chống chỉ định Tuyệt đối", criteria: ABSOLUTE_CONTRAINDICATIONS }),
      React.createElement(CriteriaSection, { title: "Chống chỉ định Tương đối", criteria: RELATIVE_CONTRAINDICATIONS }),
      
      recommendation && React.createElement(ResultDisplayEctopic, { recommendation: recommendation }),
      
      React.createElement('div', { className: "mt-8 pt-6 border-t border-gray-200" },
        React.createElement('h3', { className: "text-xl font-semibold text-gray-800 mb-4" }, 'Tóm tắt bằng AI'),
        React.createElement('p', { className: "text-gray-600 mb-4" }, 'Sau khi trả lời tất cả các câu hỏi, bạn có thể yêu cầu AI của Gemini cung cấp một bản tóm tắt và phân tích tình huống.'),
        React.createElement('button', { 
          onClick: handleGetAiSummary,
          disabled: !allQuestionsAnswered || isLoadingAi,
          className: "px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        },
          isLoadingAi && React.createElement('svg', { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" },
              React.createElement('circle', { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
              React.createElement('path', { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
          ),
          isLoadingAi ? 'Đang phân tích...' : 'Nhận tóm tắt từ AI'
        ),
        aiSummary && React.createElement('div', { className: "mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200" },
             React.createElement('p', { className: "text-gray-800 whitespace-pre-wrap" }, aiSummary)
        )
      )
    )
  );
};


// From components/BishopScoreTool.tsx
const BISHOP_CRITERIA = [
  { id: 'dilation', label: 'Độ mở cổ tử cung (cm)', options: [{ label: '0', score: 0 }, { label: '1 - 2', score: 1 }, { label: '3 - 4', score: 2 }, { label: '5 - 6', score: 3 }] },
  { id: 'effacement', label: 'Độ xóa cổ tử cung (%)', options: [{ label: '0 - 30', score: 0 }, { label: '40 - 50', score: 1 }, { label: '60 - 70', score: 2 }, { label: '≥ 80', score: 3 }] },
  { id: 'station', label: 'Độ lọt của thai', options: [{ label: '-3', score: 0 }, { label: '-2', score: 1 }, { label: '-1 đến 0', score: 2 }, { label: '+1 đến +2', score: 3 }] },
  { id: 'consistency', label: 'Mật độ cổ tử cung', options: [{ label: 'Chắc', score: 0 }, { label: 'Vừa', score: 1 }, { label: 'Mềm', score: 2 }] },
  { id: 'position', label: 'Hướng cổ tử cung', options: [{ label: 'Sau', score: 0 }, { label: 'Trung gian', score: 1 }, { label: 'Trước', score: 2 }] },
];

const ResultDisplayBishop = ({ recommendation }) => {
  const colorClasses = {
    [RecommendationLevel.SUCCESS]: "bg-green-100 border-green-500 text-green-800",
    [RecommendationLevel.WARNING]: "bg-yellow-100 border-yellow-500 text-yellow-800",
    [RecommendationLevel.DANGER]: "bg-red-100 border-red-500 text-red-800",
    [RecommendationLevel.INFO]: "bg-blue-100 border-blue-500 text-blue-800",
  };
  
  return (
    React.createElement('div', { className: `p-4 mt-6 border-l-4 rounded-r-lg ${colorClasses[recommendation.level]}` },
      React.createElement('h3', { className: "font-bold text-lg" }, recommendation.title),
      React.createElement('p', { className: "mt-1 whitespace-pre-line" }, recommendation.text)
    )
  );
};

const BishopScoreTool = ({ onBack }) => {
  const [scores, setScores] = useState({ dilation: null, effacement: null, station: null, consistency: null, position: null });
  const [recommendation, setRecommendation] = useState(null);

  const handleScoreChange = (criterionId, score) => {
    setScores(prev => ({ ...prev, [criterionId]: score }));
  };

  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, score) => {
      if (score !== null) return sum + score;
      return sum;
    }, 0);
  }, [scores]);
  
  const allAnswered = useMemo(() => {
    return Object.values(scores).every(score => score !== null);
  }, [scores]);

  useEffect(() => {
    if (!allAnswered) {
      setRecommendation({
        level: RecommendationLevel.INFO,
        title: 'Chưa đủ thông tin',
        text: 'Vui lòng chọn tất cả các chỉ số để tính điểm Bishop và xem kết quả.',
      });
      return;
    }

    if (totalScore < 5) {
      setRecommendation({
        level: RecommendationLevel.WARNING,
        title: 'Cổ tử cung không thuận lợi (Bishop < 5)',
        text: 'Cần làm chín muồi cổ tử cung trước khi khởi phát chuyển dạ.\nCác phương pháp gợi ý: Prostaglandin, Foley, CRB (cervical ripening balloon), lóc ối, laminaria.',
      });
    } else {
      setRecommendation({
        level: RecommendationLevel.SUCCESS,
        title: 'Cổ tử cung thuận lợi (Bishop ≥ 5)',
        text: 'Tiên lượng khởi phát chuyển dạ thành công cao.\nCác phương pháp gợi ý: Oxytocin hoặc Oxytocin kết hợp bấm ối.',
      });
    }
  }, [totalScore, allAnswered]);

  return (
    React.createElement('div', { className: "bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-4xl mx-auto" },
      React.createElement('button', { onClick: onBack, className: "mb-6 text-teal-600 hover:text-teal-800 font-semibold flex items-center" },
        React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 mr-2", viewBox: "0 0 20 20", fill: "currentColor" },
          React.createElement('path', { fillRule: "evenodd", d: "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z", clipRule: "evenodd" })
        ),
        'Quay lại'
      ),
      React.createElement('h2', { className: "text-2xl font-bold text-gray-900 mb-2" }, 'Đánh giá chỉ số Bishop trước khởi phát chuyển dạ'),
      React.createElement('p', { className: "text-gray-600 mb-8" }, 'Chọn các giá trị tương ứng để tính điểm Bishop và đánh giá độ chín muồi của cổ tử cung.'),
      React.createElement('div', { className: "space-y-6" },
        BISHOP_CRITERIA.map(criterion => (
          React.createElement('div', { key: criterion.id, className: "py-4 border-b border-gray-200" },
            React.createElement('h3', { className: "font-semibold text-lg text-gray-700 mb-3" }, criterion.label),
            React.createElement('div', { className: "flex flex-wrap gap-2" },
              criterion.options.map(option => (
                React.createElement('button', {
                  key: option.score,
                  onClick: () => handleScoreChange(criterion.id, option.score),
                  className: `px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                    scores[criterion.id] === option.score
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`
                }, option.label)
              ))
            )
          )
        ))
      ),
      React.createElement('div', { className: "mt-8 pt-6 border-t border-gray-200" },
        React.createElement('h3', { className: "text-xl font-semibold text-gray-800" }, 'Kết quả đánh giá'),
        React.createElement('div', { className: "mt-4 bg-gray-50 p-4 rounded-lg flex justify-between items-center" },
            React.createElement('span', { className: "font-bold text-gray-600" }, 'Tổng điểm Bishop:'),
            React.createElement('span', { className: `text-3xl font-bold ${allAnswered ? 'text-teal-600' : 'text-gray-400'}` },
                allAnswered ? totalScore : '?'
            )
        ),
        recommendation && React.createElement(ResultDisplayBishop, { recommendation: recommendation })
      )
    )
  );
};


// From App.tsx
const App = () => {
  const [activeTool, setActiveTool] = useState('none');

  const renderToolSelection = () => (
    React.createElement('div', { className: "text-center max-w-2xl mx-auto" },
      React.createElement('h2', { className: "text-2xl font-bold text-gray-700 mb-6" }, 'Chọn Công Cụ Hỗ Trợ'),
      React.createElement('div', { className: "flex flex-col items-center space-y-4" },
        React.createElement('button', {
          onClick: () => setActiveTool('ectopic'),
          className: "w-full bg-white p-6 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
        },
          React.createElement('div', { className: "flex items-center space-x-4" },
            React.createElement('div', { className: "flex-shrink-0 bg-indigo-100 p-3 rounded-full" },
               React.createElement('svg', { className: "h-6 w-6 text-indigo-600", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", 'aria-hidden': "true" },
                  React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" })
               )
            ),
            React.createElement('div', { className: "text-left" },
              React.createElement('h3', { className: "text-xl font-semibold text-indigo-700" }, 'Điều trị Thai ngoài tử cung'),
              React.createElement('p', { className: "text-gray-500 mt-1" }, 'Đánh giá tiêu chuẩn điều trị nội khoa cho bệnh nhân thai ngoài tử cung.')
            )
          )
        ),
        React.createElement('button', {
          onClick: () => setActiveTool('bishop'),
          className: "w-full bg-white p-6 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
        },
          React.createElement('div', { className: "flex items-center space-x-4" },
            React.createElement('div', { className: "flex-shrink-0 bg-teal-100 p-3 rounded-full" },
              React.createElement('svg', { className: "h-6 w-6 text-teal-600", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", 'aria-hidden': "true" },
                 React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M12 8h.01M15 8h.01M15 5h-6a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2z" })
              )
            ),
            React.createElement('div', { className: "text-left" },
              React.createElement('h3', { className: "text-xl font-semibold text-teal-700" }, 'Đánh giá chỉ số Bishop'),
              React.createElement('p', { className: "text-gray-500 mt-1" }, 'Tính điểm Bishop để tiên lượng khả năng thành công của khởi phát chuyển dạ.')
            )
          )
        ),
        React.createElement('div', { className: "w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center mt-4" },
          React.createElement('p', { className: "text-gray-500" }, 'Các bệnh lý khác sẽ được thêm vào đây trong tương lai.')
        )
      )
    )
  );

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'ectopic':
        return React.createElement(EctopicPregnancyTool, { onBack: () => setActiveTool('none') });
      case 'bishop':
        return React.createElement(BishopScoreTool, { onBack: () => setActiveTool('none') });
      default:
        return renderToolSelection();
    }
  };

  return (
    React.createElement('div', { className: "min-h-screen bg-gray-100 text-gray-800" },
      React.createElement('header', { className: "bg-white shadow-sm sticky top-0 z-10" },
        React.createElement('div', { className: "container mx-auto px-4 sm:px-6 lg:px-8 py-4" },
          React.createElement('h1', { className: "text-3xl font-bold text-gray-900 tracking-tight" }, 'Hệ Thống Hỗ Trợ Quyết Định Lâm Sàng'),
          React.createElement('p', { className: "text-gray-600 mt-1" }, 'Công cụ hỗ trợ dựa trên bằng chứng cho các chuyên gia y tế')
        )
      ),
      React.createElement('main', { className: "container mx-auto px-4 sm:px-6 lg:px-8 py-8" },
        renderActiveTool()
      ),
      React.createElement('footer', { className: "text-center py-6 text-sm text-gray-500" },
        React.createElement('p', null, 'Lưu ý: Công cụ này chỉ mang tính chất tham khảo và không thay thế cho chẩn đoán của bác sĩ chuyên khoa.')
      )
    )
  );
};


// From index.tsx
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  React.createElement(React.StrictMode, null, React.createElement(App, null))
);
