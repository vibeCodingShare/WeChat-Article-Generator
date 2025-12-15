import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PersonaConfig, TargetAudience, ImageAttachment } from '../types';
import { constructSystemInstruction, constructUserPrompt, DEFAULT_SYSTEM_PROMPT_TEMPLATE } from './promptService';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateArticle = async (
  content: string,
  images: ImageAttachment[],
  persona: PersonaConfig,
  audience: TargetAudience,
  customInstructions: string
): Promise<string> => {
  const ai = getClient();
  
  // Use centralized Prompt V2.1 Logic
  const systemInstruction = constructSystemInstruction(
    DEFAULT_SYSTEM_PROMPT_TEMPLATE, 
    persona, 
    audience, 
    images, 
    customInstructions
  );

  // Prepare input parts
  const parts: any[] = [];

  // 1. Add images first (multimodal input)
  images.forEach(img => {
    // Remove header from base64 string
    const base64Data = img.base64.split(',')[1]; 
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: base64Data
      }
    });
  });

  // 2. Add text prompt using centralized logic
  const userPrompt = constructUserPrompt(content);
  parts.push({ text: userPrompt });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
      },
    });

    return response.text || "No content generated.";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};