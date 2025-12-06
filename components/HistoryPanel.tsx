
import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../types';
import { getHistory, deleteHistoryItem, clearHistory } from '../services/historyService';
import { parseGeneratedArticle } from '../services/promptService';
import { Clock, Trash2, ArrowUpRight, FileText, AlertCircle, Loader2, Heading, AlignLeft, Image as ImageIcon } from 'lucide-react';

interface Props {
  onRestore: (item: HistoryItem) => void;
}

const HistoryPanel: React.FC<Props> = ({ onRestore }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        const data = await getHistory();
        setHistory(data);
        setLoading(false);
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    const updated = await deleteHistoryItem(id);
    setHistory(updated);
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to delete all history?")) {
        await clearHistory();
        setHistory([]);
    }
  };

  if (loading) {
      return (
          <div className="flex justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
          </div>
      );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-slate-600">No History Yet</h3>
        <p className="text-sm">Generated articles will automatically appear here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">History</h2>
            <p className="text-slate-500 text-sm">Your previously generated articles.</p>
         </div>
         <button 
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
         >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
         </button>
      </div>

      <div className="grid gap-4">
        {history.map((item) => {
          // Parse content on the fly to show Title/Summary
          const { title, summary, body } = parseGeneratedArticle(item.generatedContent);
          
          return (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-1">
                 {title ? (
                     <h3 className="font-bold text-slate-800 text-base leading-tight">{title}</h3>
                 ) : (
                     <span className="text-slate-400 text-sm italic">Untitled Article</span>
                 )}
                 <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{item.personaName}</span>
                 </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                 <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
               {/* Summary Preview */}
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-600 uppercase">
                     <AlignLeft className="w-3 h-3" /> Summary / Preview
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {summary || body.substring(0, 150).replace(/[#*`]/g, '') + '...'}
                  </p>
               </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-400">
                   {item.images && item.images.length > 0 && (
                       <span className="flex items-center gap-1">
                           <ImageIcon className="w-3 h-3" /> {item.images.length} images used
                       </span>
                   )}
                </div>
                <button 
                    onClick={() => onRestore(item)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    Restore
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>
          </div>
          );
        })}
      </div>
      
      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1 mt-8">
        <AlertCircle className="w-3 h-3" />
        <span>Images are not saved in history to save space. Re-upload images if needed.</span>
      </div>
    </div>
  );
};

export default HistoryPanel;
