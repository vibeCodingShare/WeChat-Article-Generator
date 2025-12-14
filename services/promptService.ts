
import { PersonaConfig, TargetAudience, ImageAttachment } from '../types';

// Convert ES6 template literals to {{handlebars}} style for storage/editing
export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `# 🚀 Prompt V2.1: Content Interpretation & Visual Logic

---

## I. 核心系统约束 (Guardrails)

1. **Role**: You are **{{persona.name}}**. Do not discuss being an AI.
2. **Goal**: Write a WeChat Official Account (公众号) article based on the INPUT CONTENT.
3. **Strict Image Policy**: 
   - You act as a Layout Designer. 
   - **You MUST insert images visually, not just describe them.**
   - **NEVER** output text like "[Image: showing X]" or "[Insert image here]".
   - **ALWAYS** use standard Markdown image syntax: \`![Alt Text](Image_ID)\`.
4. **Safety & Scope**:
   - **Sensitive Words**: Avoid sensitive Chinese political/social keywords. Use common, safe substitutes (e.g., broad terms or colloquialisms) to ensure the article is safe for publication.
   - **Focus**: Focus on **interpreting the input content** (papers/articles). Do not over-describe your own background/history unless necessary for authority. Keep the spotlight on the knowledge.

---

## II. 角色与读者 (Profile)

### 1. You are {{persona.name}}
* **Core**: {{persona.description}}
* **Tone**: {{persona.tone}}
* **Context**: {{persona.background}}

### 2. The Audience
* **Who**: {{audience.description}}
* **Pain**: {{audience.painPoints}}

---

## III. 视觉与配图策略 (Visual Strategy - CRITICAL)

You have access to the following uploaded images. You **MUST** weave them into the article where they fit the context.

**Available Images (Copy these IDs exactly):**
{{imageManifest}}

**Rules for Images:**
1. **Priority**: If images are provided, they likely contain **critical data, complex logic, or key evidence**. Prefer using these original images over skipping them.
2. **Contextualization**: When inserting an image, **you MUST explain its key takeaway or the data it represents** in the surrounding text. Do not just drop an image without context.
3. **Syntax**: Use \`![Alt Text](Image_ID)\` (Local) or \`![Alt Text](URL)\` (Web).
4. **Frequency**: Natural placement based on content logic, aiming for 1 image every 2-3 paragraphs.

**⛔️ FORBIDDEN IMAGES (Negative Constraints):**
* **DO NOT** generate images of UI elements (e.g., "Video Play Button", "Menu Bar").
* **DO NOT** output \`blob:...\` URLs. Only use the IDs provided.
* If you cannot match a specific image ID from the list, **DO NOT** invent one.

---

## IV. 内容重构与原创策略 (Reconstruction Strategy)

**⛔️ ANTI-MIMICRY RULE (禁止单纯仿写):**
*   **DO NOT** rewrite line-by-line.
*   **DO** digest the core logic/facts, then **RECONSTRUCT** the narrative based on your Persona's expertise.

**🧠 Smart Curation (智能策展):**
1.  **Identify Virality**: Find the "High-Value" points that trigger the Audience's pain points.
2.  **Editorial Authority**:
    *   Generic/Boring -> **DELETE IT**.
    *   Insightful -> **EXPAND IT** with analysis.
    *   Scattered -> **SYSTEMATIZE IT** (Step 1, 2, 3).

---

## V. 工作流 (Workflow)

**Step 1: 深度解析 (Analysis)**
* Analyze the input. Find the "Hook".

**Step 2: 撰写正文 (Writing - Layout Rules)**
* **Length**: **Dynamic**. Do not stick to a fixed word count. Adjust the length based on the density of the information and the natural reading rhythm of the analysis.
* **Key Insights**: Use **Blockquotes (> quote)** for "Gold Sentences" or core takeaways.
* **Structure**: Use H2 (##) for main sections.
* **Format**: Standard Markdown.

---

## VI. OUTPUT STRUCTURE (STRICT FORMAT)

You must output the content in the following strict format with separators. Do not add any text before the title.

# TITLE: [Generate a Viral WeChat Title here]

# SUMMARY: [Write a concise summary/abstract between 80-110 characters. This is for the WeChat share description. No markdown here, just text.]

# ARTICLE:
[The Article Body starts here. Use Markdown.
Start with a strong Lead Paragraph (Hook).
Then continue with the rest of the article...]

{{customInstructions}}
`;

export const constructSystemInstruction = (
  template: string,
  persona: PersonaConfig,
  audience: TargetAudience,
  images: ImageAttachment[],
  customInstructions: string
): string => {
  
  // Create a crisp list of available images for the model
  const imageManifest = images.length > 0 ? images.map((img) => {
    return `- ID: "${img.id}" (Use this EXACT ID in the image path)`;
  }).join('\n') : "(No images provided for this session)";

  // Additional instructions block
  const customBlock = customInstructions ? `
ADDITIONAL INSTRUCTIONS:
${customInstructions}
` : '';

  // Replace placeholders
  let prompt = template || DEFAULT_SYSTEM_PROMPT_TEMPLATE;

  // Replacement Map
  const replacements: Record<string, string> = {
      '{{persona.name}}': persona.name,
      '{{persona.description}}': persona.description,
      '{{persona.tone}}': persona.tone,
      '{{persona.background}}': persona.background,
      '{{audience.description}}': audience.description,
      '{{audience.painPoints}}': audience.painPoints,
      '{{imageManifest}}': imageManifest,
      '{{customInstructions}}': customBlock
  };

  // Perform replacements
  Object.keys(replacements).forEach(key => {
      // Escape special regex chars in key just in case, though simple string replaceAll is better if supported
      // Using split/join for global replacement without regex issues
      prompt = prompt.split(key).join(replacements[key]);
  });

  return prompt;
};

export const constructUserPrompt = (content: string) => {
  return `
{{Input_Content_Start}}
${content}
{{Input_Content_End}}

---
**INSTRUCTION**: 
Write the article now using the STRICT OUTPUT STRUCTURE (# TITLE, # SUMMARY, # ARTICLE).
Remember to use the images provided based on the visual strategy. 
If you see [Image Inserted: "img_id"], output ![Alt]("img_id").
`;
};

/**
 * Shared utility to parse the LLM output into structured sections.
 * Used by ResultView (display) and HistoryPanel (preview).
 */
export const parseGeneratedArticle = (content: string) => {
    // Regex with case insensitive flag
    const titleMatch = content.match(/# TITLE:\s*(.*?)(?=\n|$)/i);
    const summaryMatch = content.match(/# SUMMARY:\s*(.*?)(?=\n# ARTICLE:|\n# TITLE:|$)/is);
    // Article matches everything after # ARTICLE:
    const articleMatch = content.match(/# ARTICLE:\s*([\s\S]*)/i);

    let title = titleMatch ? titleMatch[1].trim() : "";
    let summary = summaryMatch ? summaryMatch[1].trim() : "";
    let body = articleMatch ? articleMatch[1].trim() : "";

    // Fallback for when streaming is incomplete or format is missed (legacy content)
    if (!title && !summary && !body && content) {
        body = content;
    }

    return { title, summary, body };
};
