import React, { useState, useMemo, useEffect } from 'react';
import { RecommendationLevel, type Recommendation } from '../types';

interface BishopOption {
  label: string;
  score: number;
}

interface BishopCriterion {
  id: keyof BishopScores;
  label: string;
  options: BishopOption[];
}

type BishopScores = {
  dilation: number | null;
  effacement: number | null;
  station: number | null;
  consistency: number | null;
  position: number | null;
};

const BISHOP_CRITERIA: BishopCriterion[] = [
  {
    id: 'dilation',
    label: 'Độ mở cổ tử cung (cm)',
    options: [
      { label: '0', score: 0 },
      { label: '1 - 2', score: 1 },
      { label: '3 - 4', score: 2 },
      { label: '5 - 6', score: 3 },
    ],
  },
  {
    id: 'effacement',
    label: 'Độ xóa cổ tử cung (%)',
    options: [
      { label: '0 - 30', score: 0 },
      { label: '40 - 50', score: 1 },
      { label: '60 - 70', score: 2 },
      { label: '≥ 80', score: 3 },
    ],
  },
  {
    id: 'station',
    label: 'Độ lọt của thai',
    options: [
      { label: '-3', score: 0 },
      { label: '-2', score: 1 },
      { label: '-1 đến 0', score: 2 },
      { label: '+1 đến +2', score: 3 },
    ],
  },
  {
    id: 'consistency',
    label: 'Mật độ cổ tử cung',
    options: [
      { label: 'Chắc', score: 0 },
      { label: 'Vừa', score: 1 },
      { label: 'Mềm', score: 2 },
    ],
  },
  {
    id: 'position',
    label: 'Hướng cổ tử cung',
    options: [
      { label: 'Sau', score: 0 },
      { label: 'Trung gian', score: 1 },
      { label: 'Trước', score: 2 },
    ],
  },
];

const ResultDisplay: React.FC<{ recommendation: Recommendation }> = ({ recommendation }) => {
  const colorClasses = {
    [RecommendationLevel.SUCCESS]: "bg-green-100 border-green-500 text-green-800",
    [RecommendationLevel.WARNING]: "bg-yellow-100 border-yellow-500 text-yellow-800",
    [RecommendationLevel.DANGER]: "bg-red-100 border-red-500 text-red-800",
    [RecommendationLevel.INFO]: "bg-blue-100 border-blue-500 text-blue-800",
  };
  
  return (
    <div className={`p-4 mt-6 border-l-4 rounded-r-lg ${colorClasses[recommendation.level]}`}>
      <h3 className="font-bold text-lg">{recommendation.title}</h3>
      <p className="mt-1 whitespace-pre-line">{recommendation.text}</p>
    </div>
  );
};


export const BishopScoreTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [scores, setScores] = useState<BishopScores>({
    dilation: null,
    effacement: null,
    station: null,
    consistency: null,
    position: null,
  });
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const handleScoreChange = (criterionId: keyof BishopScores, score: number) => {
    setScores(prev => ({ ...prev, [criterionId]: score }));
  };

  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((sum, score) => {
      if (score !== null) {
        return sum + score;
      }
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
    } else { // totalScore >= 5
      setRecommendation({
        level: RecommendationLevel.SUCCESS,
        title: 'Cổ tử cung thuận lợi (Bishop ≥ 5)',
        text: 'Tiên lượng khởi phát chuyển dạ thành công cao.\nCác phương pháp gợi ý: Oxytocin hoặc Oxytocin kết hợp bấm ối.',
      });
    }

  }, [totalScore, allAnswered]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-6 text-teal-600 hover:text-teal-800 font-semibold flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Quay lại
      </button>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Đánh giá chỉ số Bishop trước khởi phát chuyển dạ</h2>
      <p className="text-gray-600 mb-8">Chọn các giá trị tương ứng để tính điểm Bishop và đánh giá độ chín muồi của cổ tử cung.</p>

      <div className="space-y-6">
        {BISHOP_CRITERIA.map(criterion => (
          <div key={criterion.id} className="py-4 border-b border-gray-200">
            <h3 className="font-semibold text-lg text-gray-700 mb-3">{criterion.label}</h3>
            <div className="flex flex-wrap gap-2">
              {criterion.options.map(option => (
                <button
                  key={option.score}
                  onClick={() => handleScoreChange(criterion.id, option.score)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                    scores[criterion.id] === option.score
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800">Kết quả đánh giá</h3>
        <div className="mt-4 bg-gray-50 p-4 rounded-lg flex justify-between items-center">
            <span className="font-bold text-gray-600">Tổng điểm Bishop:</span>
            <span className={`text-3xl font-bold ${allAnswered ? 'text-teal-600' : 'text-gray-400'}`}>
                {allAnswered ? totalScore : '?'}
            </span>
        </div>
        {recommendation && <ResultDisplay recommendation={recommendation} />}
      </div>
    </div>
  );
};
