
import React, { useState, useEffect } from 'react';
import { PersonaConfig, TargetAudience, ImageAttachment, AppStatus, HistoryItem, LLMSettings } from './types';
import PersonaPanel from './components/PersonaPanel';
import ContentInput from './components/ContentInput';
import ResultView from './components/ResultView';
import HistoryPanel from './components/HistoryPanel';
import SettingsModal from './components/SettingsModal';
import { generateArticle } from './services/llmService';
import { saveHistoryItem } from './services/historyService';
import { Sparkles, ArrowRight, Settings2, RefreshCw, Layers, UserCircle, History, Settings, PenTool, FilePlus } from 'lucide-react';

// --- Constants ---
const DEFAULT_PERSONA: PersonaConfig = {
  name: "Jovi",
  description: "前 360 高级设计专家、UXD Leader、T 型系统架构师、AiCC 创始人。擅长将复杂的 B 端架构思维降维打击，转化为普通人（上班族/小白）能听懂的实操干货。",
  tone: "通俗且深刻（拒绝堆砌术语，生活化类比）；真诚不爹味（热心的技术老友）。",
  background: "拥有专业摄影与 UX 背景，非常注重文章的阅读节奏和图文排版逻辑。核心理念：事情是迭代出来的。"
};

const DEFAULT_AUDIENCE: TargetAudience = {
  description: "不懂技术的普通上班族、知识爱好者。",
  painPoints: "效率低、担心被 AI 取代、寻找副业机会、职场焦虑。",
  goals: "解决当下的焦虑，寻找提效黑科技，探索 AI 带来的新可能性（副业/转型）。"
};

const DEFAULT_SETTINGS: LLMSettings = {
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

// --- Safe Storage Helper ---
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      const storage = window.localStorage;
      return storage ? storage.getItem(key) : null;
    } catch (e) {
      console.warn(`LocalStorage access denied for key "${key}"`);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      const storage = window.localStorage;
      if (storage) storage.setItem(key, value);
    } catch (e) {
      console.warn(`LocalStorage write denied for key "${key}"`);
    }
  }
};

const App: React.FC = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'generate' | 'persona' | 'history'>('generate');
  const [showSettings, setShowSettings] = useState(false);
  
  const [formKey, setFormKey] = useState(0); 
  const [editorKey, setEditorKey] = useState(0);
  
  // 1. Initialize with Defaults
  const [llmSettings, setLlmSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [persona, setPersona] = useState<PersonaConfig>(DEFAULT_PERSONA);
  const [audience, setAudience] = useState<TargetAudience>(DEFAULT_AUDIENCE);
  const [isLoaded, setIsLoaded] = useState(false);

  // 2. Hydrate from Storage
  useEffect(() => {
    try {
        const savedSettings = safeLocalStorage.getItem('inkflow_settings');
        if (savedSettings) setLlmSettings(JSON.parse(savedSettings));

        const savedPersona = safeLocalStorage.getItem('inkflow_persona');
        if (savedPersona) setPersona(JSON.parse(savedPersona));

        const savedAudience = safeLocalStorage.getItem('inkflow_audience');
        if (savedAudience) setAudience(JSON.parse(savedAudience));
    } catch (e) {
        console.error("Failed to hydrate state from storage", e);
    } finally {
        setIsLoaded(true);
    }
  }, []);

  // 3. Persist Changes
  useEffect(() => {
      if (isLoaded) safeLocalStorage.setItem('inkflow_settings', JSON.stringify(llmSettings));
  }, [llmSettings, isLoaded]);

  useEffect(() => {
      if (isLoaded) safeLocalStorage.setItem('inkflow_persona', JSON.stringify(persona));
  }, [persona, isLoaded]);

  useEffect(() => {
      if (isLoaded) safeLocalStorage.setItem('inkflow_audience', JSON.stringify(audience));
  }, [audience, isLoaded]);

  // BYOK Safety Check
  useEffect(() => {
      if (!isLoaded) return;
      if (llmSettings.activeProvider === 'gemini') return;

      const activeConfig = llmSettings.configs[llmSettings.activeProvider];
      if (!activeConfig.apiKey) {
          const timer = setTimeout(() => setShowSettings(true), 500);
          return () => clearTimeout(timer);
      }
  }, [llmSettings.activeProvider, isLoaded]);


  // Content Input
  const [sourceText, setSourceText] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = async () => {
    if (!sourceText && images.length === 0) {
      setErrorMsg("Please provide some text or images.");
      return;
    }

    const isGemini = llmSettings.activeProvider === 'gemini';
    const currentKey = llmSettings.configs[llmSettings.activeProvider].apiKey;
    
    if (!isGemini && !currentKey) {
        setShowSettings(true);
        setErrorMsg("Please enter your API Key in Settings.");
        return;
    }

    setErrorMsg("");
    setStatus(AppStatus.GENERATING);
    setActiveTab('generate');
    
    // Scroll to result on mobile after clicking generate
    if (window.innerWidth < 1024) {
        setTimeout(() => {
            document.getElementById('result-view')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

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

      await saveHistoryItem({
        sourceText,
        images: images, 
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

  const handleStartNew = () => {
    if (sourceText || images.length > 0 || generatedContent) {
        if (!window.confirm("Start a new article? This will clear current content and images.")) {
            return;
        }
    }
    setSourceText("");
    setImages([]);
    setGeneratedContent("");
    setCustomInstructions("");
    setStatus(AppStatus.IDLE);
    setErrorMsg("");
    setEditorKey(prev => prev + 1); // Force editor component to re-mount/clear
    setActiveTab('generate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setSourceText(item.sourceText);
    setGeneratedContent(item.generatedContent);
    setCustomInstructions(item.customInstructions);
    
    const restoredImages = (item.images || []).map(img => ({
        ...img,
        file: null,
        previewUrl: img.base64 
    }));
    
    setImages(restoredImages);
    setEditorKey(prev => prev + 1);
    setActiveTab('generate');
  };

  const handleResetDefaults = () => {
    const newPersona = JSON.parse(JSON.stringify(DEFAULT_PERSONA));
    const newAudience = JSON.parse(JSON.stringify(DEFAULT_AUDIENCE));
    setPersona(newPersona);
    setAudience(newAudience);
    safeLocalStorage.setItem('inkflow_persona', JSON.stringify(newPersona));
    safeLocalStorage.setItem('inkflow_audience', JSON.stringify(newAudience));
    setFormKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={llmSettings}
        onSave={setLlmSettings}
      />

      {/* --- Desktop Header --- */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-4 md:px-6 z-30 shadow-sm sticky top-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 truncate max-w-[150px] md:max-w-none">
                InkFlow AI
            </h1>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            {[
                { id: 'generate', icon: Layers, label: 'Generate' },
                { id: 'persona', icon: UserCircle, label: 'Persona' },
                { id: 'history', icon: History, label: 'History' }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab.id 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </nav>
        
        <div className="flex justify-end items-center gap-2 md:gap-3">
             {status === AppStatus.ERROR && (
                <span className="text-red-500 text-xs font-medium animate-pulse truncate max-w-[100px] md:max-w-[200px]" title={errorMsg}>
                    {errorMsg}
                </span>
             )}
             
             <button 
                onClick={handleStartNew}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                title="Start New Article"
             >
                <FilePlus className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-semibold">New Article</span>
             </button>

             <div className="w-px h-6 bg-slate-200 mx-1"></div>
             
             <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Model Settings"
             >
                <Settings className="w-5 h-5" />
             </button>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto p-4 md:p-6 pb-24 md:pb-6">
        
        {activeTab === 'generate' && (
            <div className="flex flex-col gap-6 md:gap-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto">
                    
                    {/* Left: Input (Adaptive Height) */}
                    <div className="lg:col-span-8 h-[50vh] min-h-[400px] lg:h-[600px]">
                        <ContentInput 
                            key={editorKey}
                            sourceText={sourceText} 
                            setSourceText={setSourceText}
                            images={images}
                            setImages={setImages}
                        />
                    </div>
                    
                    {/* Right: Controls (Stacked on Mobile) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm flex flex-col gap-4">
                            
                            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</span>
                                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 truncate max-w-[120px]">
                                    {llmSettings.configs[llmSettings.activeProvider].modelName}
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                </span>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2 text-slate-700">
                                    <Settings2 className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Instructions</span>
                                </div>
                                <textarea 
                                    value={customInstructions}
                                    onChange={(e) => setCustomInstructions(e.target.value)}
                                    placeholder="Add specific requirements (e.g. word count, tone adjustment)..."
                                    className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[100px] lg:min-h-[150px]"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-3 mt-auto">
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

                <div id="result-view" className="w-full">
                    <ResultView 
                        content={generatedContent} 
                        isGenerating={status === AppStatus.GENERATING}
                        images={images}
                    />
                </div>
            </div>
        )}

        {activeTab === 'persona' && (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">Persona & Audience</h2>
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

        {activeTab === 'history' && (
            <div>
                <HistoryPanel onRestore={handleRestoreHistory} />
            </div>
        )}

      </main>

      {/* --- Mobile Bottom Nav --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-2 py-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         {[
            { id: 'generate', icon: PenTool, label: 'Create' },
            { id: 'persona', icon: UserCircle, label: 'Persona' },
            { id: 'history', icon: History, label: 'History' }
         ].map((tab) => (
             <button
                key={tab.id}
                onClick={() => {
                    setActiveTab(tab.id as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-full ${
                    activeTab === tab.id 
                    ? 'text-indigo-600 bg-indigo-50' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
             >
                 <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'fill-indigo-600/20' : ''}`} />
                 <span className="text-[10px] font-medium">{tab.label}</span>
             </button>
         ))}
      </div>

    </div>
  );
};

export default App;
