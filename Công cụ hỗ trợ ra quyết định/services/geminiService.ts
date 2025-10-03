
import { GoogleGenAI } from "@google/genai";
import { type CriteriaState, type Criterion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildPrompt = (
  criteriaState: CriteriaState, 
  inclusionCriteria: Criterion[], 
  absoluteContraindications: Criterion[], 
  relativeContraindications: Criterion[]
): string => {
    let prompt = `Phân tích tình huống lâm sàng sau đây của một bệnh nhân bị thai ngoài tử cung để xác định khả năng phù hợp với phương pháp điều trị nội khoa bằng methotrexate. Cung cấp một bản tóm tắt súc tích cho chuyên gia y tế bằng tiếng Việt.

Tình trạng lâm sàng của bệnh nhân:
`;

    const getAnswerText = (answer: string) => {
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

export const getAiSummary = async (
  criteriaState: CriteriaState, 
  inclusionCriteria: Criterion[], 
  absoluteContraindications: Criterion[], 
  relativeContraindications: Criterion[]
): Promise<string> => {
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
