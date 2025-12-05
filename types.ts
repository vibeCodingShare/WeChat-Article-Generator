
export interface PersonaConfig {
  name: string;
  description: string;
  tone: string;
  background: string;
}

export interface TargetAudience {
  description: string;
  painPoints: string;
  goals: string;
}

export interface ImageAttachment {
  id: string;
  file: File | null; // null if from URL paste or restored from history
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface GenerationConfig {
  customInstructions: string;
  includeImages: boolean;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  sourceText: string;
  images: ImageAttachment[]; // Added images to history
  generatedContent: string;
  personaName: string;
  customInstructions: string;
}

// --- New LLM Settings Types ---

export type LLMProvider = 'gemini' | 'deepseek' | 'qianwen' | 'openai';

export interface ModelConfig {
  provider: LLMProvider;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

export interface LLMSettings {
  activeProvider: LLMProvider;
  configs: Record<LLMProvider, ModelConfig>;
}
