
import React, { useState } from 'react';
import { PersonaConfig, TargetAudience } from '../types';
import { User, Users, ShieldAlert, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  persona: PersonaConfig;
  setPersona: React.Dispatch<React.SetStateAction<PersonaConfig>>;
  audience: TargetAudience;
  setAudience: React.Dispatch<React.SetStateAction<TargetAudience>>;
  onReset: () => void;
}

const PersonaPanel: React.FC<Props> = ({ persona, setPersona, audience, setAudience, onReset }) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handlePersonaChange = (field: keyof PersonaConfig, value: string) => {
    setPersona(prev => ({ ...prev, [field]: value }));
  };

  const handleAudienceChange = (field: keyof TargetAudience, value: string) => {
    setAudience(prev => ({ ...prev, [field]: value }));
  };

  const handleResetClick = () => {
    if (confirmReset) {
      onReset();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      // Auto-reset confirmation state after 3 seconds if not clicked
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 w-full relative">
      
      {/* Auto-Save Indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 shadow-sm animate-in fade-in">
        <CheckCircle className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Changes auto-saved</span>
      </div>

      <div className="flex items-center gap-2 mb-6 text-slate-800 pb-2 border-b border-slate-100">
        <User className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold">Persona Setup</h2>
      </div>

      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Name / Handle</label>
            <input 
                type="text" 
                value={persona.name || ''}
                onChange={(e) => handlePersonaChange('name', e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g., Tech Guru Jim"
                autoComplete="off"
            />
            </div>

            <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tone & Voice</label>
            <input 
                type="text" 
                value={persona.tone || ''}
                onChange={(e) => handlePersonaChange('tone', e.target.value)}
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Witty, Professional, Cynical"
                autoComplete="off"
            />
            </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role & Expertise</label>
          <textarea 
            value={persona.description || ''}
            onChange={(e) => handlePersonaChange('description', e.target.value)}
            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
            placeholder="Describe who the writer is..."
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Background Context</label>
          <textarea 
            value={persona.background || ''}
            onChange={(e) => handlePersonaChange('background', e.target.value)}
            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
            placeholder="Life experiences, specific biases..."
            autoComplete="off"
          />
          <p className="text-[10px] text-slate-400 mt-2 flex gap-1 items-center bg-blue-50 text-blue-600 p-2 rounded inline-block">
             <ShieldAlert className="w-3 h-3" /> 
             System ensures this frames the story, not fabricates facts.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 my-8 pt-6">
        <div className="flex items-center gap-2 mb-6 text-slate-800 pb-2 border-b border-slate-100">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold">Target Audience</h2>
        </div>

        <div className="space-y-6">
           <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Who are they?</label>
            <textarea 
              value={audience.description || ''}
              onChange={(e) => handleAudienceChange('description', e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
              placeholder="e.g., Junior developers in Tier 1 cities"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pain Points</label>
            <textarea 
              value={audience.painPoints || ''}
              onChange={(e) => handleAudienceChange('painPoints', e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
              placeholder="What keeps them up at night?"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button 
            onClick={handleResetClick}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all border ${
              confirmReset 
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                : 'text-slate-500 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-100'
            }`}
          >
             {confirmReset ? <AlertTriangle className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
             {confirmReset ? "Are you sure? Click to Confirm" : "Reset to Defaults (Jovi)"}
          </button>
      </div>

    </div>
  );
};

export default PersonaPanel;
