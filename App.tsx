
import React, { useState, useEffect } from 'react';
import { PersonaConfig, TargetAudience, ImageAttachment, AppStatus, HistoryItem, LLMSettings } from './types';
import PersonaPanel from './components/PersonaPanel';
import ContentInput from './components/ContentInput';
import ResultView from './components/ResultView';
import HistoryPanel from './components/HistoryPanel';
import SettingsModal from './components/SettingsModal';
import { generateArticle } from './services/llmService';
import { saveHistoryItem } from './services/historyService';
import { Sparkles, ArrowRight, Settings2, RefreshCw, Layers, UserCircle, History, Settings } from 'lucide-react';

// --- Constants ---
const DEFAULT_PERSONA: PersonaConfig = {
  name: "Jovi",
  description: "前 360 高级设计专家、UXD Leader、T 型系统架构师、AiCC 创始人。擅长将复杂的 B 端架构思维降维打击，转化为普通人（上班族/小白）能听懂的实操干货。",
  tone: "通俗且深刻（拒绝堆砌术语，生活化类比）；迭代主义（行动才有结果）；真诚不爹味（热心的技术老友）。",
  background: "拥有专业摄影与 UX 背景，非常注重文章的阅读节奏和图文排版逻辑。核心理念：事情是迭代出来的。"
};

const DEFAULT_AUDIENCE: TargetAudience = {
  description: "不懂技术的普通上班族、知识爱好者。",
  painPoints: "效率低、担心被 AI 取代、寻找副业机会、职场焦虑。",
  goals: "解决当下的焦虑，寻找提效黑科技，探索 AI 带来的新可能性（副业/转型）。"
};

const App: React.FC = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'generate' | 'persona' | 'history'>('generate');
  const [showSettings, setShowSettings] = useState(false);
  
  // Use a counter to guarantee uniqueness for force-remounting components
  const [formKey, setFormKey] = useState(0); 
  const [editorKey, setEditorKey] = useState(0);
  
  // LLM Settings with persistence
  const [llmSettings, setLlmSettings] = useState<LLMSettings>(() => {
      const saved = localStorage.getItem('inkflow_settings');
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) { console.error("Failed to parse settings", e); }
      }
      // Defaults
      return {
          activeProvider: 'gemini',
          configs: {
              gemini: {
                  provider: 'gemini', enabled: true, 
                  apiKey: process.env.API_KEY || '', 
                  baseUrl: '', 
                  modelName: 'gemini-2.5-flash'
              },
              deepseek: {
                  provider: 'deepseek', enabled: true,
                  apiKey: '',
                  baseUrl: 'https://api.deepseek.com',
                  modelName: 'deepseek-chat'
              },
              qianwen: {
                  provider: 'qianwen', enabled: true,
                  apiKey: '',
                  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                  modelName: 'qwen-plus'
              },
              openai: {
                  provider: 'openai', enabled: true,
                  apiKey: '',
                  baseUrl: 'https://api.openai.com/v1',
                  modelName: 'gpt-4o'
              }
          }
      };
  });

  // Save settings on change
  useEffect(() => {
      localStorage.setItem('inkflow_settings', JSON.stringify(llmSettings));
  }, [llmSettings]);

  // BYOK Safety Check: Auto-open settings if key is missing
  useEffect(() => {
      // Guideline: Gemini uses process.env.API_KEY, do not ask user.
      if (llmSettings.activeProvider === 'gemini') return;

      const activeConfig = llmSettings.configs[llmSettings.activeProvider];
      // Check if key is empty. Note: process.env.API_KEY might be baked in during build, 
      // but if user deploys cleanly, it might be empty.
      if (!activeConfig.apiKey) {
          // A small timeout ensures UI is ready
          const timer = setTimeout(() => setShowSettings(true), 500);
          return () => clearTimeout(timer);
      }
  }, [llmSettings.activeProvider]);

  // Persona & Audience Defaults with Persistence
  const [persona, setPersona] = useState<PersonaConfig>(() => {
    const saved = localStorage.getItem('inkflow_persona');
    if (saved) return JSON.parse(saved);
    return DEFAULT_PERSONA;
  });

  const [audience, setAudience] = useState<TargetAudience>(() => {
    const saved = localStorage.getItem('inkflow_audience');
    if (saved) return JSON.parse(saved);
    return DEFAULT_AUDIENCE;
  });

  // Save Persona/Audience on change
  useEffect(() => {
    localStorage.setItem('inkflow_persona', JSON.stringify(persona));
  }, [persona]);

  useEffect(() => {
    localStorage.setItem('inkflow_audience', JSON.stringify(audience));
  }, [audience]);


  // Content Input
  const [sourceText, setSourceText] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  
  // Generation Settings
  const [customInstructions, setCustomInstructions] = useState("");
  
  // Output
  const [generatedContent, setGeneratedContent] = useState("");
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState("");

  // --- Handlers ---

  const handleGenerate = async () => {
    if (!sourceText && images.length === 0) {
      setErrorMsg("Please provide some text or images as source material.");
      return;
    }

    // Double check key before generating
    const isGemini = llmSettings.activeProvider === 'gemini';
    const currentKey = llmSettings.configs[llmSettings.activeProvider].apiKey;
    
    // Guideline: Skip key check for Gemini as it uses process.env.API_KEY (assumed valid)
    if (!isGemini && !currentKey) {
        setShowSettings(true);
        setErrorMsg("Please enter your API Key in Settings to proceed.");
        return;
    }

    setErrorMsg("");
    setStatus(AppStatus.GENERATING);
    
    // Ensure we are on the generate tab
    setActiveTab('generate');

    try {
      const result = await generateArticle(
        sourceText,
        images,
        persona,
        audience,
        customInstructions,
        llmSettings
      );
      setGeneratedContent(result);
      setStatus(AppStatus.SUCCESS);

      // Auto-save to history (IndexedDB)
      await saveHistoryItem({
        sourceText,
        images: images, // Save images
        generatedContent: result,
        personaName: persona.name,
        customInstructions,
      });

    } catch (e: any) {
      setErrorMsg(e.message || "An error occurred during generation.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleRegenerate = () => {
      handleGenerate();
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setSourceText(item.sourceText);
    setGeneratedContent(item.generatedContent);
    setCustomInstructions(item.customInstructions);
    
    // Restore Images:
    // The stored images have base64 data but invalid/expired previewUrls.
    // We use the base64 data as the source for the preview.
    const restoredImages = (item.images || []).map(img => ({
        ...img,
        file: null, // File handle is lost in DB but base64 persists
        previewUrl: img.base64 // Use base64 as valid src
    }));
    
    setImages(restoredImages);
    setEditorKey(prev => prev + 1); // Force content input to remount and accept new state
    setActiveTab('generate');
  };

  const handleResetDefaults = () => {
    // Immediate Synchronous Reset (No window.confirm blocking)
    
    // 1. Create deep copies
    const newPersona = JSON.parse(JSON.stringify(DEFAULT_PERSONA));
    const newAudience = JSON.parse(JSON.stringify(DEFAULT_AUDIENCE));
    
    // 2. Update State
    setPersona(newPersona);
    setAudience(newAudience);

    // 3. Force LocalStorage update immediately
    localStorage.setItem('inkflow_persona', JSON.stringify(newPersona));
    localStorage.setItem('inkflow_audience', JSON.stringify(newAudience));
    
    // 4. Force Remount of PersonaPanel
    setFormKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={llmSettings}
        onSave={setLlmSettings}
      />

      {/* Header with Navigation - Increased Z-Index for stacking context */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-6 z-30 shadow-sm sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">InkFlow AI</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('generate')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'generate' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <Layers className="w-4 h-4" />
                Generate
            </button>
            <button
                onClick={() => setActiveTab('persona')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'persona' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <UserCircle className="w-4 h-4" />
                Persona
            </button>
            <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'history' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <History className="w-4 h-4" />
                History
            </button>
        </nav>
        
        {/* Status & Settings */}
        <div className="w-64 flex justify-end items-center gap-4">
             {status === AppStatus.ERROR && <span className="text-red-500 text-sm font-medium animate-pulse truncate" title={errorMsg}>{errorMsg}</span>}
             
             <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Model Settings"
             >
                <Settings className="w-5 h-5" />
             </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto p-6">
        
        {/* TAB: GENERATE */}
        {activeTab === 'generate' && (
            <div className="flex flex-col gap-8">
                
                {/* Top Section: Editor (Left) + Controls (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto">
                    {/* Source Editor - Fixed heights to ensure stability */}
                    <div className="lg:col-span-8 h-[500px] lg:h-[600px]">
                        <ContentInput 
                            key={editorKey}
                            sourceText={sourceText} 
                            setSourceText={setSourceText}
                            images={images}
                            setImages={setImages}
                        />
                    </div>
                    
                    {/* Controls Panel - Fixed heights to match Editor */}
                    <div className="lg:col-span-4 h-[500px] lg:h-[600px] flex flex-col">
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
                            
                            {/* Current Model Indicator */}
                            <div className="mb-4 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</span>
                                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                    {llmSettings.configs[llmSettings.activeProvider].modelName}
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mb-3 text-slate-700 shrink-0">
                                <Settings2 className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Additional Instructions</span>
                            </div>
                            
                            <textarea 
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                placeholder="E.g., Make it 2000 words, focus on the second point, keep it humorous..."
                                className="flex-1 w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg resize-none mb-4 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed min-h-[150px]"
                            />
                            
                            <div className="flex flex-col gap-3 shrink-0">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={status === AppStatus.GENERATING}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
                                >
                                    {status === AppStatus.GENERATING ? 'Generating...' : 'Generate Article'}
                                    {!status.includes('GENERATING') && <ArrowRight className="w-4 h-4" />}
                                </button>

                                {generatedContent && (
                                    <button 
                                        onClick={handleRegenerate}
                                        disabled={status === AppStatus.GENERATING}
                                        className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${status === AppStatus.GENERATING ? 'animate-spin' : ''}`} />
                                        Regenerate
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Result - Natural Height */}
                <div className="w-full pb-20">
                    <ResultView 
                        content={generatedContent} 
                        isGenerating={status === AppStatus.GENERATING}
                        images={images}
                    />
                </div>
            </div>
        )}

        {/* TAB: PERSONA */}
        {activeTab === 'persona' && (
            <div className="max-w-4xl mx-auto pb-20">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Persona & Audience Settings</h2>
                    <p className="text-slate-500 text-sm">Define the voice and target of your articles.</p>
                </div>
                <PersonaPanel 
                    key={formKey}
                    persona={persona} 
                    setPersona={setPersona} 
                    audience={audience} 
                    setAudience={setAudience}
                    onReset={handleResetDefaults}
                />
            </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
            <div className="pb-20">
                <HistoryPanel onRestore={handleRestoreHistory} />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
