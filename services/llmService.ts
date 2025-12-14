
import { GoogleGenAI } from "@google/genai";
import { PersonaConfig, TargetAudience, ImageAttachment, LLMSettings, LLMProvider } from '../types';
import { constructSystemInstruction, constructUserPrompt } from './promptService';

// --- Helper: File to Base64 (Exported for UI use) ---
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- Main Generation Function ---
export const generateArticle = async (
  content: string,
  images: ImageAttachment[],
  persona: PersonaConfig,
  audience: TargetAudience,
  customInstructions: string,
  settings: LLMSettings
): Promise<string> => {
  
  const provider = settings.activeProvider;
  const config = settings.configs[provider];

  // Logic: Use the API Key from the config object.
  // The App state initializes this from process.env.API_KEY, or the user enters it manually.
  // This supports both "Env Var" and "Bring Your Own Key" patterns.
  const effectiveApiKey = config.apiKey;

  if (!effectiveApiKey) {
    throw new Error(`API Key for ${provider} is missing. Please check Settings.`);
  }

  // Use the systemPromptTemplate from settings, or fall back to default if somehow missing
  const template = settings.systemPromptTemplate || '';
  const systemInstruction = constructSystemInstruction(template, persona, audience, images, customInstructions);
  const userPrompt = constructUserPrompt(content);

  switch (provider) {
    case 'gemini':
      return callGemini(effectiveApiKey, config.modelName, systemInstruction, userPrompt, images);
    
    case 'deepseek':
    case 'qianwen':
    case 'openai':
      return callOpenAICompatible(
        config.baseUrl, 
        effectiveApiKey, 
        config.modelName, 
        systemInstruction, 
        userPrompt, 
        images,
        provider
      );
      
    default:
      throw new Error(`Provider ${provider} not implemented.`);
  }
};

// --- Gemini Implementation ---
const callGemini = async (
  apiKey: string,
  model: string, 
  systemInstruction: string, 
  userPrompt: string, 
  images: ImageAttachment[]
) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];
  
  // Gemini expects inline data for images in the 'contents'
  images.forEach(img => {
    const base64Data = img.base64.split(',')[1]; 
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: base64Data
      }
    });
  });

  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text || "No content generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Gemini Error: ${error.message}`);
  }
};

// --- OpenAI Compatible Implementation (DeepSeek, Qianwen, etc.) ---
const callOpenAICompatible = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  systemInstruction: string,
  userPrompt: string,
  images: ImageAttachment[],
  provider: LLMProvider
) => {
  
  // Prepare messages
  const messages: any[] = [
    { role: "system", content: systemInstruction }
  ];

  const userContent: any[] = [
    { type: "text", text: userPrompt }
  ];

  // OpenAI format supports image_url
  // Note: DeepSeek V3 (Chat) is often text-only. DeepSeek VL or Qianwen VL supports images.
  // We send them if present; if model rejects, error will guide user.
  if (images.length > 0) {
      // Check if provider likely supports images (simplistic check)
      // DeepSeek standard chat endpoint might fail with images, but let's try standard format.
      images.forEach(img => {
          userContent.push({
              type: "image_url",
              image_url: {
                  url: img.base64 // OpenAI compatible APIs usually accept Data URI
              }
          });
      });
  }

  messages.push({ role: "user", content: userContent });

  try {
    // Normalize Base URL (remove trailing slash)
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const url = `${cleanBaseUrl}/chat/completions`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            stream: false 
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No content generated.";

  } catch (error: any) {
      console.error(`${provider} API Error:`, error);
      throw new Error(`${provider} API Error: ${error.message}`);
  }
};
