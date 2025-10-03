import React, { useState } from 'react';
import { EctopicPregnancyTool } from './components/EctopicPregnancyTool';
import { BishopScoreTool } from './components/BishopScoreTool';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'none' | 'ectopic' | 'bishop'>('none');

  const renderToolSelection = () => (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-700 mb-6">Chọn Công Cụ Hỗ Trợ</h2>
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => setActiveTool('ectopic')}
          className="w-full bg-white p-6 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-full">
               <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-indigo-700">Điều trị Thai ngoài tử cung</h3>
              <p className="text-gray-500 mt-1">Đánh giá tiêu chuẩn điều trị nội khoa cho bệnh nhân thai ngoài tử cung.</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTool('bishop')}
          className="w-full bg-white p-6 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 bg-teal-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-teal-600" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M12 8h.01M15 8h.01M15 5h-6a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-teal-700">Đánh giá chỉ số Bishop</h3>
              <p className="text-gray-500 mt-1">Tính điểm Bishop để tiên lượng khả năng thành công của khởi phát chuyển dạ.</p>
            </div>
          </div>
        </button>

        <div className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center mt-4">
          <p className="text-gray-500">Các bệnh lý khác sẽ được thêm vào đây trong tương lai.</p>
        </div>
      </div>
    </div>
  );

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'ectopic':
        return <EctopicPregnancyTool onBack={() => setActiveTool('none')} />;
      case 'bishop':
        return <BishopScoreTool onBack={() => setActiveTool('none')} />;
      default:
        return renderToolSelection();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hệ Thống Hỗ Trợ Quyết Định Lâm Sàng</h1>
          <p className="text-gray-600 mt-1">Công cụ hỗ trợ dựa trên bằng chứng cho các chuyên gia y tế</p>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTool()}
      </main>
      <footer className="text-center py-6 text-sm text-gray-500">
        <p>Lưu ý: Công cụ này chỉ mang tính chất tham khảo và không thay thế cho chẩn đoán của bác sĩ chuyên khoa.</p>
      </footer>
    </div>
  );
};

export default App;