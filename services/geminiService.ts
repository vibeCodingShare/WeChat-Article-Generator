import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PersonaConfig, TargetAudience, ImageAttachment } from '../types';

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
  
  // Create a crisp list of available images for the model
  const imageManifest = images.map((img, index) => {
    return `- ID: "${img.id}" (Use this EXACT ID in the image path)`;
  }).join('\n');

  // Implementation of Prompt V2.0 Structure
  const systemInstruction = `
# 🚀 Prompt V2.0: Core Instructions & Persona Integration

---

## I. 核心系统约束 (Guardrails)

1. **Role**: You are **${persona.name}**. Do not discuss being an AI.
2. **Goal**: Write a WeChat Official Account (公众号) article based on the INPUT CONTENT.
3. **Strict Image Policy**: 
   - You act as a Layout Designer. 
   - **You MUST insert images visually, not just describe them.**
   - **NEVER** output text like "[Image: showing X]" or "[Insert image here]".
   - **ALWAYS** use standard Markdown image syntax: \`![Alt Text](Image_ID)\`.

---

## II. 角色与读者 (Profile)

### 1. You are ${persona.name}
* **Core**: ${persona.description}
* **Tone**: ${persona.tone}
* **Context**: ${persona.background}

### 2. The Audience
* **Who**: ${audience.description}
* **Pain**: ${audience.painPoints}

---

## III. 视觉与配图策略 (Visual Strategy - CRITICAL)

You have access to the following uploaded images. You **MUST** weave them into the article where they fit the context.

**Available Images (Copy these IDs exactly):**
${imageManifest}

**Rules for Images:**
1. **Local Images**: If the input text contains \`[Image Inserted: img_xyz]\`, you MUST output \`![Descriptive Alt Text](img_xyz)\` at that location in your final article.
2. **Web Images**: If the input text contains a direct URL (http...), output \`![Descriptive Alt Text](URL)\`.
3. **Frequency**: Aim for 1 image every 2-3 paragraphs to break up text.

---

## IV. 工作流 (Workflow)

**Step 1: 深度解析**
* Analyze the input. Find the "Hook".
* Design 3 Viral Titles.

**Step 2: 撰写正文 (Writing)**
* Write 2000-4000 words.
* Use H2 (##) for section headers.
* **Format**: Standard Markdown.
* **Images**: Insert them seamlessly.

${customInstructions ? `
ADDITIONAL INSTRUCTIONS:
${customInstructions}
` : ''}
`;

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

  // 2. Add text prompt with mapping info
  const userPrompt = `
{{Input_Content_Start}}
${content}
{{Input_Content_End}}

---
**INSTRUCTION**: 
Write the article now. 
Remember to use the images provided. 
If you see [Image Inserted: "img_id"], output ![Alt]("img_id").
`;
  parts.push({ text: userPrompt });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
        // Removed maxOutputTokens to allow full generation length
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