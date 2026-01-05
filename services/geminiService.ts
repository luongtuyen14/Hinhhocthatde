
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeometryData } from "../types";

// Define the response schema for Gemini
const geometrySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          x: { type: Type.NUMBER, description: "X coordinate." },
          y: { type: Type.NUMBER, description: "Y coordinate" },
          z: { type: Type.NUMBER, description: "Z coordinate (0 for 2D)" },
          label: { type: Type.STRING, description: "Point label (A, B, C)" },
          color: { type: Type.STRING, description: "Hex color." }
        },
        required: ["id", "x", "y", "z"]
      }
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          from: { type: Type.STRING, description: "ID of start point" },
          to: { type: Type.STRING, description: "ID of end point" },
          color: { type: Type.STRING, description: "Hex color" },
          label: { type: Type.STRING, description: "Length label" },
          marker: { type: Type.STRING, enum: ["tick", "double-tick", "arrow", "double-arrow"], description: "Symbol for equality or parallel" }
        },
        required: ["id", "from", "to"]
      }
    },
    faces: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          pointIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          color: { type: Type.STRING, description: "Hex color" },
          opacity: { type: Type.NUMBER }
        },
        required: ["id", "pointIds"]
      }
    },
    angles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          centerId: { type: Type.STRING, description: "ID of the vertex point" },
          arm1Id: { type: Type.STRING, description: "ID of point on first arm" },
          arm2Id: { type: Type.STRING, description: "ID of point on second arm" },
          type: { type: Type.STRING, enum: ["right", "arc", "double-arc"] },
          label: { type: Type.STRING, description: "Label like '60°' or 'x'" }
        },
        required: ["id", "centerId", "arm1Id", "arm2Id", "type"]
      }
    },
    circles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          centerId: { type: Type.STRING, description: "ID of the center point" },
          radius: { type: Type.NUMBER, description: "Radius length in geometry units" },
          color: { type: Type.STRING, description: "Hex color" },
          label: { type: Type.STRING, description: "Label for the circle (e.g., '(O)')" },
          isDashed: { type: Type.BOOLEAN, description: "True if part of the circle is hidden/3D dashed line" }
        },
        required: ["id", "centerId", "radius"]
      }
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          description: { type: Type.STRING, description: "Vietnamese explanation" },
          activeElementIds: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["stepNumber", "description", "activeElementIds"]
      }
    },
    reasoning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING, description: "Câu hỏi định hướng/Gợi ý suy luận." },
          answer: { type: Type.STRING, description: "Giải thích ngắn gọn." }
        },
        required: ["id", "question", "answer"]
      },
      description: "Step-by-step backward reasoning logic (Text only)"
    },
    type: { type: Type.STRING, enum: ["2D", "3D"] },
    message: { type: Type.STRING, description: "Friendly message from the AI tutor" },
    mathSolution: { type: Type.STRING, description: "Detailed solution (Markdown)" }
  },
  required: ["points", "edges", "steps", "type"]
};

const SYSTEM_INSTRUCTION = `
Bạn là "Gia Sư Toán THCS" chuyên nghiệp, am hiểu chương trình Toán lớp 6, 7, 8, 9 của Việt Nam.
Phong cách: Ngắn gọn, dễ hiểu, trực quan, hỗ trợ tối đa cho học sinh vùng cao.

**NHIỆM VỤ:**
1.  **Vẽ hình (Geometry):** 
    *   Tạo hình vẽ chính xác, tỷ lệ chuẩn theo yêu cầu bài toán (tam giác, hình tròn, đường tròn nội tiếp/ngoại tiếp, v.v.).
    *   Sử dụng "circles" cho các đường tròn (tâm và bán kính).
    *   Tọa độ trung tâm khoảng (0,0).

2.  **Tư duy & Phân tích (Reasoning):**
    *   Cung cấp các bước suy luận logic phù hợp với trình độ THCS (lớp 6-9).
    *   Chỉ tập trung vào nội dung văn bản để giải thích cho học sinh hiểu.
    *   KHÔNG cần gắn ID của hình vẽ vào các bước suy luận.

**HƯỚNG DẪN VẼ HÌNH TRÒN:**
- Khi bài toán yêu cầu vẽ đường tròn (O; R) hoặc đường tròn đi qua các điểm, hãy xác định tâm và tính toán bán kính phù hợp trong hệ tọa độ.
- Luôn đảm bảo hình vẽ trực quan, sạch sẽ.

**OUTPUT:** Trả về JSON theo schema.
`;

export const generateGeometry = async (prompt: string, history: string = "", imageBase64?: string): Promise<GeometryData> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const parts: any[] = [{ text: `Lịch sử chat:\n${history}\n\nYêu cầu mới của học sinh: ${prompt}` }];
    
    if (imageBase64) {
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;
        
      parts.push({
        inlineData: {
          mimeType: "image/jpeg", 
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        { role: "user", parts: parts }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: geometrySchema,
        temperature: 0.1, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text) as GeometryData;
    
    return {
      points: parsed.points || [],
      edges: parsed.edges || [],
      faces: parsed.faces || [],
      angles: parsed.angles || [],
      circles: parsed.circles || [],
      steps: parsed.steps || [],
      reasoning: parsed.reasoning || [],
      type: parsed.type || '2D',
      message: parsed.message,
      mathSolution: parsed.mathSolution
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
