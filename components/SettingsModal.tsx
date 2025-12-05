
import React from 'react';
import { LLMSettings, LLMProvider } from '../types';
import { X, Save, Server, Key, Cpu, ShieldCheck, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSave: (newSettings: LLMSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<LLMSettings>(settings);
  const [activeTab, setActiveTab] = React.useState<LLMProvider>(settings.activeProvider);

  // Sync when opening
  React.useEffect(() => {
    if (isOpen) {
        setLocalSettings(settings);
        setActiveTab(settings.activeProvider);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleConfigChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      configs: {
        ...prev.configs,
        [activeTab]: {
          ...prev.configs[activeTab],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSave({
        ...localSettings,
        activeProvider: activeTab
    });
    onClose();
  };

  const providers: {id: LLMProvider, label: string}[] = [
      { id: 'gemini', label: 'Google Gemini' },
      { id: 'deepseek', label: 'DeepSeek' },
      { id: 'qianwen', label: 'Qianwen (Aliyun)' },
      { id: 'openai', label: 'OpenAI / Custom' },
  ];

  const currentConfig = localSettings.configs[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-auto md:w-full md:max-w-lg md:rounded-xl shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                Model Settings
            </h2>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Security Alert (BYOK Pattern) */}
        <div className="bg-blue-50 border-b border-blue-100 px-4 md:px-6 py-3 flex items-start gap-3 shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Secure Local Storage</h4>
                <p className="text-xs text-blue-700 leading-relaxed mt-0.5">
                    Your API Key is stored locally in your browser (LocalStorage). 
                    It is sent directly to the AI provider and never passes through our own backend servers.
                </p>
            </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
            
            {/* Provider Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {providers.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setActiveTab(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                            activeTab === p.id 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Config Form */}
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
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
                            placeholder={activeTab === 'gemini' ? '(Not required for Gemini SDK)' : 'https://api.example.com/v1'}
                            disabled={activeTab === 'gemini'}
                        />
                    </div>
                    {activeTab !== 'gemini' && (
                        <p className="text-[10px] text-slate-400 mt-1">
                            Endpoint root. For OpenAI compatible, usually ends in /v1
                        </p>
                    )}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 pb-safe">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
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
