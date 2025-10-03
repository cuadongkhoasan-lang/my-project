
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { type Criterion, Answer, type CriteriaState, RecommendationLevel, type Recommendation } from '../types';
import { getAiSummary } from '../services/geminiService';

const INCLUSION_CRITERIA: Criterion[] = [
  { id: 'hemoStable', text: 'Huyết động của bệnh nhân ổn định?' },
  { id: 'noContraindications', text: 'Không có chống chỉ định tuyệt đối với Methotrexate?' },
  { id: 'canFollowUp', text: 'Bệnh nhân có khả năng và sẵn sàng tuân thủ theo dõi sau điều trị?' },
  { id: 'confirmedEctopic', text: 'Chẩn đoán thai ngoài tử cung đã được xác định chắc chắn?' },
];

const ABSOLUTE_CONTRAINDICATIONS: Criterion[] = [
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

const RELATIVE_CONTRAINDICATIONS: Criterion[] = [
    { id: 'fetalHeartbeat', text: 'Siêu âm phát hiện có hoạt động tim thai?' },
    { id: 'hcgLevel', text: 'Nồng độ β-hCG ban đầu > 5000 mIU/mL?' },
    { id: 'massSize', text: 'Kích thước khối thai ngoài tử cung > 4 cm?' },
    { id: 'refusesBlood', text: 'Bệnh nhân từ chối truyền máu?' },
];

const ALL_CRITERIA = [...INCLUSION_CRITERIA, ...ABSOLUTE_CONTRAINDICATIONS, ...RELATIVE_CONTRAINDICATIONS];

// Helper Component: CriterionRow
interface CriterionRowProps {
  criterion: Criterion;
  value: Answer;
  onChange: (id: string, value: Answer) => void;
}

const CriterionRow: React.FC<CriterionRowProps> = ({ criterion, value, onChange }) => {
  const getButtonClass = (buttonValue: Answer) => {
    let base = "px-4 py-2 rounded-md font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (value === buttonValue) {
      return base + (buttonValue === Answer.YES ? "bg-red-500 text-white ring-red-500" : "bg-green-600 text-white ring-green-600");
    }
    return base + "bg-gray-200 text-gray-700 hover:bg-gray-300";
  };
  
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-200">
      <p className="text-gray-700">{criterion.text}</p>
      <div className="flex space-x-2">
        <button onClick={() => onChange(criterion.id, Answer.YES)} className={getButtonClass(Answer.YES)}>Có</button>
        <button onClick={() => onChange(criterion.id, Answer.NO)} className={getButtonClass(Answer.NO)}>Không</button>
      </div>
    </div>
  );
};

// Helper Component: ResultDisplay
interface ResultDisplayProps {
  recommendation: Recommendation;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ recommendation }) => {
  const colorClasses = {
    [RecommendationLevel.SUCCESS]: "bg-green-100 border-green-500 text-green-800",
    [RecommendationLevel.WARNING]: "bg-yellow-100 border-yellow-500 text-yellow-800",
    [RecommendationLevel.DANGER]: "bg-red-100 border-red-500 text-red-800",
    [RecommendationLevel.INFO]: "bg-blue-100 border-blue-500 text-blue-800",
  };
  
  return (
    <div className={`p-4 mt-6 border-l-4 rounded-r-lg ${colorClasses[recommendation.level]}`}>
      <h3 className="font-bold text-lg">{recommendation.title}</h3>
      <p className="mt-1">{recommendation.text}</p>
    </div>
  );
};

// Main Tool Component
export const EctopicPregnancyTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [criteriaState, setCriteriaState] = useState<CriteriaState>(() =>
    ALL_CRITERIA.reduce((acc, c) => ({ ...acc, [c.id]: Answer.UNSET }), {})
  );
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleCriteriaChange = useCallback((id: string, value: Answer) => {
    setCriteriaState(prev => ({ ...prev, [id]: value }));
  }, []);

  useEffect(() => {
    const answeredCount = Object.values(criteriaState).filter(v => v !== Answer.UNSET).length;
    if (answeredCount === 0) {
        setRecommendation(null);
        return;
    }

    // Check for absolute contraindications
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
    
    // Check inclusion criteria
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

    // Check for relative contraindications
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

  const CriteriaSection: React.FC<{title: string; criteria: Criterion[]}> = ({title, criteria}) => (
      <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2 mb-4">{title}</h3>
          {criteria.map(c => (
              <CriterionRow key={c.id} criterion={c} value={criteriaState[c.id]} onChange={handleCriteriaChange} />
          ))}
      </div>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl">
      <button onClick={onBack} className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Quay lại
      </button>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Đánh giá Điều trị Nội khoa Thai ngoài tử cung (Methotrexate)</h2>
      <p className="text-gray-600 mb-8">Trả lời các câu hỏi sau để đánh giá sự phù hợp của bệnh nhân với phác đồ điều trị nội khoa.</p>
      
      <CriteriaSection title="Tiêu chuẩn Lựa chọn" criteria={INCLUSION_CRITERIA} />
      <CriteriaSection title="Chống chỉ định Tuyệt đối" criteria={ABSOLUTE_CONTRAINDICATIONS} />
      <CriteriaSection title="Chống chỉ định Tương đối" criteria={RELATIVE_CONTRAINDICATIONS} />
      
      {recommendation && <ResultDisplay recommendation={recommendation} />}
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Tóm tắt bằng AI</h3>
        <p className="text-gray-600 mb-4">Sau khi trả lời tất cả các câu hỏi, bạn có thể yêu cầu AI của Gemini cung cấp một bản tóm tắt và phân tích tình huống.</p>
        <button 
          onClick={handleGetAiSummary}
          disabled={!allQuestionsAnswered || isLoadingAi}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isLoadingAi && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoadingAi ? 'Đang phân tích...' : 'Nhận tóm tắt từ AI'}
        </button>
        {aiSummary && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
             <p className="text-gray-800 whitespace-pre-wrap">{aiSummary}</p>
          </div>
        )}
      </div>

    </div>
  );
};
