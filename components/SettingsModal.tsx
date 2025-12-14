
import React, { useState } from 'react';
import { LLMSettings, LLMProvider } from '../types';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '../services/promptService';
import { X, Save, Server, Key, Cpu, ShieldCheck, Lock, Terminal, RotateCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSave: (newSettings: LLMSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<LLMSettings>(settings);
  const [activeTab, setActiveTab] = React.useState<'models' | 'prompt'>('models');
  const [activeProvider, setActiveProvider] = React.useState<LLMProvider>(settings.activeProvider);

  // Sync when opening
  React.useEffect(() => {
    if (isOpen) {
        setLocalSettings(settings);
        setActiveProvider(settings.activeProvider);
        setActiveTab('models');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleConfigChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      configs: {
        ...prev.configs,
        [activeProvider]: {
          ...prev.configs[activeProvider],
          [field]: value
        }
      }
    }));
  };

  const handlePromptChange = (value: string) => {
      setLocalSettings(prev => ({
          ...prev,
          systemPromptTemplate: value
      }));
  };

  const handleResetPrompt = () => {
      if (confirm("Reset System Prompt to default? Your custom changes to the prompt will be lost.")) {
          handlePromptChange(DEFAULT_SYSTEM_PROMPT_TEMPLATE);
      }
  };

  const handleSave = () => {
    onSave({
        ...localSettings,
        activeProvider: activeProvider
    });
    onClose();
  };

  const providers: {id: LLMProvider, label: string}[] = [
      { id: 'gemini', label: 'Google Gemini' },
      { id: 'deepseek', label: 'DeepSeek' },
      { id: 'qianwen', label: 'Qianwen (Aliyun)' },
      { id: 'openai', label: 'OpenAI / Custom' },
  ];

  const currentConfig = localSettings.configs[activeProvider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-auto md:w-full md:max-w-2xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                Settings
            </h2>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Top Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('models')}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${activeTab === 'models' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Model Configuration
            </button>
            <button 
                onClick={() => setActiveTab('prompt')}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-colors border-b-2 ${activeTab === 'prompt' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                System Prompt
            </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
            
            {activeTab === 'models' && (
                <div className="space-y-6">
                    {/* Security Alert */}
                    <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Secure Local Storage</h4>
                            <p className="text-xs text-blue-700 leading-relaxed mt-0.5">
                                API Keys are stored in your browser's LocalStorage and sent directly to the AI provider.
                            </p>
                        </div>
                    </div>

                    {/* Provider Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {providers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setActiveProvider(p.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                                    activeProvider === p.id 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Config Form */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                                Base URL
                            </label>
                            <div className="relative">
                                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={currentConfig.baseUrl}
                                    onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                                    placeholder={activeProvider === 'gemini' ? '(Not required for Gemini SDK)' : 'https://api.example.com/v1'}
                                    disabled={activeProvider === 'gemini'}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                                API Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="password" 
                                    value={currentConfig.apiKey}
                                    onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                                    placeholder="sk-..."
                                    autoComplete="off"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Lock className="w-3.5 h-3.5 text-slate-300" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                                Model Name
                            </label>
                            <div className="relative">
                                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={currentConfig.modelName}
                                    onChange={(e) => handleConfigChange('modelName', e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                                    placeholder="e.g. gpt-4o"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'prompt' && (
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                             <Terminal className="w-4 h-4 text-indigo-600" />
                             System Instruction Template
                         </div>
                         <button 
                            onClick={handleResetPrompt}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                         >
                             <RotateCcw className="w-3.5 h-3.5" />
                             Reset Default
                         </button>
                    </div>

                    <div className="flex-1 relative">
                        <textarea 
                            value={localSettings.systemPromptTemplate}
                            onChange={(e) => handlePromptChange(e.target.value)}
                            className="w-full h-64 p-4 text-xs font-mono leading-relaxed bg-slate-900 text-slate-50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                            placeholder="Enter system instructions..."
                            spellCheck={false}
                        />
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Available Variables</span>
                        <div className="flex flex-wrap gap-2">
                            {['{{persona.name}}', '{{persona.description}}', '{{persona.tone}}', '{{persona.background}}', '{{audience.description}}', '{{audience.painPoints}}', '{{imageManifest}}', '{{customInstructions}}'].map(v => (
                                <code key={v} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                                    {v}
                                </code>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 pb-safe">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-all flex items-center gap-2"
            >
                <Save className="w-4 h-4" />
                Save Settings
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
