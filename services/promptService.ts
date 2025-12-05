import { PersonaConfig, TargetAudience, ImageAttachment } from '../types';

export const constructSystemInstruction = (
  persona: PersonaConfig,
  audience: TargetAudience,
  images: ImageAttachment[],
  customInstructions: string
): string => {
  
  // Create a crisp list of available images for the model
  const imageManifest = images.map((img) => {
    return `- ID: "${img.id}" (Use this EXACT ID in the image path)`;
  }).join('\n');

  return `
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
${imageManifest || "(No images provided for this session)"}

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
};

export const constructUserPrompt = (content: string) => {
  return `
{{Input_Content_Start}}
${content}
{{Input_Content_End}}

---
**INSTRUCTION**: 
Write the article now. 
Remember to use the images provided. 
If you see [Image Inserted: "img_id"], output ![Alt]("img_id").
`;
};
