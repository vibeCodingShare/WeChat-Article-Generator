
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { ImageAttachment } from '../types';

interface Props {
  content: string;
  isGenerating: boolean;
  images?: ImageAttachment[]; 
}

const ResultView: React.FC<Props> = ({ content, isGenerating, images = [] }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const MarkdownComponents = {
    img: (props: any) => {
      const src = typeof props.src === 'string' ? props.src : undefined;
      const alt = typeof props.alt === 'string' ? props.alt : undefined;
      let targetId = src;
      if (src && !src.startsWith('img_') && !src.startsWith('http') && alt?.startsWith('img_')) {
          targetId = alt;
      }
      const localImage = images.find(img => img.id === targetId || img.id === alt);
      const displaySrc = localImage ? localImage.previewUrl : src;
      const isValidUrl = displaySrc?.startsWith('http') || displaySrc?.startsWith('blob:');

      if (!isValidUrl) {
          return (
            <div className="my-6 p-4 bg-slate-50 border border-slate-200 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon className="w-6 h-6 opacity-50" />
                <span className="text-xs font-mono">{alt || src || 'Missing Image Source'}</span>
            </div>
          );
      }
      return (
        <figure className="my-6">
            <img 
                src={displaySrc} 
                alt={alt} 
                className="w-full rounded-lg border border-slate-200 shadow-sm max-h-[600px] object-contain bg-slate-50"
            />
            {alt && (
                <figcaption className="text-center text-xs text-slate-500 mt-2 italic">
                    {alt}
                </figcaption>
            )}
        </figure>
      );
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
      {/* Sticky Header: Adjusted to work with both desktop fixed header and mobile flow */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/95 flex justify-between items-center sticky top-0 md:top-16 z-20 backdrop-blur-sm rounded-t-xl transition-all">
        <h3 className="font-bold text-slate-800">Generated Article</h3>
        {content && !isGenerating && (
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <div className="p-6 bg-white prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-h1:text-xl prose-a:text-indigo-600 prose-img:rounded-lg">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
             <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
             <p className="text-sm font-medium animate-pulse">Crafting your story...</p>
             <div className="text-xs max-w-[200px] text-center opacity-70">Analyzing sources, applying persona, formatting content</div>
          </div>
        ) : content ? (
           <ReactMarkdown components={MarkdownComponents as any}>{content}</ReactMarkdown>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm font-medium opacity-50">Content will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultView;
