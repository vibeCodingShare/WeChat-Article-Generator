
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, RefreshCw, Image as ImageIcon, MessageCircle, FileCode, Heading, FileText, AlignLeft } from 'lucide-react';
import { ImageAttachment } from '../types';

interface Props {
  content: string;
  isGenerating: boolean;
  images?: ImageAttachment[]; 
}

const ResultView: React.FC<Props> = ({ content, isGenerating, images = [] }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [wechatCopied, setWechatCopied] = useState(false);

  // --- Parser Logic ---
  const parsedContent = useMemo(() => {
      // Regex with case insensitive flag
      const titleMatch = content.match(/# TITLE:\s*(.*?)(?=\n|$)/i);
      const summaryMatch = content.match(/# SUMMARY:\s*(.*?)(?=\n# ARTICLE:|\n# TITLE:|$)/is);
      // Article matches everything after # ARTICLE:
      const articleMatch = content.match(/# ARTICLE:\s*([\s\S]*)/i);

      let title = titleMatch ? titleMatch[1].trim() : "";
      let summary = summaryMatch ? summaryMatch[1].trim() : "";
      let body = articleMatch ? articleMatch[1].trim() : "";

      // Fallback for when streaming is incomplete or format is missed
      if (!title && !summary && !body && content) {
          // If content exists but no markers yet (or legacy format), treat all as body
          body = content;
      }

      return { title, summary, body };
  }, [content]);

  // --- Copy Helpers ---
  const handleSimpleCopy = (text: string, sectionKey: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(null), 2000);
  };

  /**
   * Advanced Formatter for WeChat Official Account
   * ... (Kept existing styling logic)
   */
  const formatToWeChatHtml = (markdown: string, imgs: ImageAttachment[]) => {
    
    // --- 1. WeChat Compatible Styles ---
    const S = {
        // Base Font & Layout
        BODY: `font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; font-size: 15px; line-height: 1.75; color: #333; text-align: justify; letter-spacing: 0.5px;`,
        
        // H2: Left Border Accent
        SECTION: `margin-top: 40px; margin-bottom: 20px; text-align: left;`,
        H2_INNER: `font-size: 18px; font-weight: bold; color: #333; padding-left: 10px; border-left: 4px solid #4f46e5; display: inline-block; line-height: 1.2;`,
        
        // H3: Simple Bold
        H3: `font-size: 16px; font-weight: bold; color: #000; margin-top: 30px; margin-bottom: 15px;`,

        // Paragraphs
        P: `margin-bottom: 20px; color: #333; text-align: justify; word-wrap: break-word;`,
        
        // Lead / Abstract
        LEAD: `font-size: 16px; color: #333; font-weight: 500; margin-bottom: 30px; line-height: 1.6;`,

        // Emphasis
        STRONG: `color: #4f46e5; font-weight: bold;`,
        
        // Blockquote (Card Style)
        QUOTE: `margin: 20px 0; padding: 15px 15px 15px 20px; font-size: 14px; color: #555; background-color: #f7f7f8; border-left: 4px solid #d1d5db; border-radius: 4px; line-height: 1.6;`,
        
        // Lists (Simulated with div/span for better compatibility)
        UL_ITEM: `margin-bottom: 10px; padding-left: 15px; position: relative;`,
        UL_DOT: `position: absolute; left: 0; top: 9px; width: 6px; height: 6px; background-color: #4f46e5; border-radius: 50%;`,
        
        // Ordered Lists (Circular Badges)
        OL_ITEM: `margin-bottom: 15px; display: flex; align-items: baseline;`,
        OL_BADGE: `display: inline-block; width: 20px; height: 20px; background-color: #4f46e5; color: #ffffff; font-size: 12px; font-weight: bold; text-align: center; line-height: 20px; border-radius: 50%; margin-right: 8px; flex-shrink: 0;`,
        
        // Images
        IMG_CONTAINER: `margin: 30px 0; text-align: center;`,
        IMG: `display: block; margin: 0 auto; max-width: 100%; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);`,
        IMG_CAPTION: `display: block; margin-top: 8px; font-size: 12px; color: #888; text-align: center;`,

        // Divider
        DIVIDER: `margin: 40px auto; text-align: center; color: #e5e7eb; font-weight: bold; letter-spacing: 4px; font-size: 20px;`,

        // Table
        TABLE_WRAP: `overflow-x: auto; margin-bottom: 20px;`,
        TABLE: `border-collapse: collapse; width: 100%; font-size: 13px;`,
        TH: `background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #374151;`,
        TD: `border: 1px solid #e5e7eb; padding: 8px; color: #4b5563;`
    };

    const getBase64 = (src: string) => {
        const cleanSrc = src.replace(/['"]/g, '').trim();
        let img = imgs.find(i => i.id === cleanSrc || cleanSrc.includes(i.id) || i.previewUrl === cleanSrc);
        if (img) return img.base64;
        if (cleanSrc.startsWith('blob:')) return null; 
        return cleanSrc;
    };

    const parseInline = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, `<span style="${S.STRONG}">$1</span>`)
            .replace(/`([^`]+)`/g, `<span style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace; color: #c026d3; font-size: 90%;">$1</span>`)
            .replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" style="color: #4f46e5; text-decoration: none; border-bottom: 1px dashed #4f46e5;">$1</a>`);
    };

    const lines = markdown.split('\n');
    let html = '';
    let tableBuffer: string[] = [];
    let isFirstPara = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.match(/^##\s+/)) {
            html += `<section style="${S.SECTION}"><span style="${S.H2_INNER}">${parseInline(line.replace(/^##\s+/, ''))}</span></section>`;
        }
        else if (line.match(/^###\s+/)) {
            html += `<div style="${S.H3}">${parseInline(line.replace(/^###\s+/, ''))}</div>`;
        }
        else if (line === '---' || line === '***') {
            html += `<div style="${S.DIVIDER}">•••</div>`;
        }
        else if (line.startsWith('> ')) {
            html += `<div style="${S.QUOTE}">${parseInline(line.replace(/^> /, ''))}</div>`;
        }
        else if (line.match(/^!\[(.*?)\]\((.*?)\)/)) {
            const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
            if (match) {
                const alt = match[1];
                const src = match[2];
                const finalSrc = getBase64(src);
                if (finalSrc) {
                    html += `<div style="${S.IMG_CONTAINER}"><img src="${finalSrc}" style="${S.IMG}" />${alt ? `<span style="${S.IMG_CAPTION}">${alt}</span>` : ''}</div>`;
                }
            }
        }
        else if (line.match(/^\d+\.\s+/)) {
            const match = line.match(/^\d+\.\s+(.*)/);
            const numMatch = line.match(/^(\d+)\./);
            const num = numMatch ? numMatch[1] : '1';
            const content = match ? match[1] : line;
            html += `<div style="${S.OL_ITEM}"><span style="${S.OL_BADGE}">${num}</span><span style="flex:1;">${parseInline(content)}</span></div>`;
        }
        else if (line.match(/^-\s+/)) {
             html += `<div style="${S.UL_ITEM}"><div style="${S.UL_DOT}"></div><div>${parseInline(line.replace(/^-\s+/, ''))}</div></div>`;
        }
        else if (line.startsWith('|')) {
            tableBuffer.push(line);
            const nextLine = lines[i+1]?.trim();
            if (!nextLine || !nextLine.startsWith('|')) {
                if (tableBuffer.length >= 2) {
                     const headers = tableBuffer[0].split('|').filter(c => c.trim()).map(c => c.trim());
                     const rows = tableBuffer.slice(2).map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()));
                     let tHtml = `<div style="${S.TABLE_WRAP}"><table style="${S.TABLE}"><thead><tr>`;
                     headers.forEach(h => tHtml += `<th style="${S.TH}">${h}</th>`);
                     tHtml += `</tr></thead><tbody>`;
                     rows.forEach(r => {
                         tHtml += `<tr>`;
                         r.forEach(d => tHtml += `<td style="${S.TD}">${parseInline(d)}</td>`);
                         tHtml += `</tr>`;
                     });
                     tHtml += `</tbody></table></div>`;
                     html += tHtml;
                }
                tableBuffer = [];
            }
        }
        else {
            if (isFirstPara && !line.startsWith('!') && !line.startsWith('|')) {
                html += `<div style="${S.LEAD}">${parseInline(line)}</div>`;
                isFirstPara = false;
            } else {
                html += `<div style="${S.P}">${parseInline(line)}</div>`;
            }
        }
    }

    return `<div style="${S.BODY}">${html}</div>`;
  };

  const handleCopyToWeChat = async () => {
    try {
        const html = formatToWeChatHtml(parsedContent.body, images);
        const htmlBlob = new Blob([html], { type: 'text/html' });
        // Send a simple text fallback to allow pasting into non-rich environments,
        // but force WeChat to pick up the HTML by being explicit in the ClipboardItem.
        // Empty text string sometimes forces apps to look for HTML.
        const textBlob = new Blob([" "], { type: 'text/plain' });
        
        await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
        ]);

        setWechatCopied(true);
        setTimeout(() => setWechatCopied(false), 2500);
    } catch (err) {
        console.error("Clipboard write failed", err);
        alert("Copy failed.");
    }
  };

  // --- Preview Renderer (React Markdown) ---
  const MarkdownComponents = {
    img: (props: any) => {
      const src = typeof props.src === 'string' ? props.src : '';
      const alt = typeof props.alt === 'string' ? props.alt : '';
      let targetId = src.replace(/['"]/g, '').trim();
      let displaySrc = src;
      const localImage = images.find(img => img.id === targetId || targetId.includes(img.id) || img.previewUrl === src);
      if (localImage) displaySrc = localImage.previewUrl;
      if (!localImage && src.startsWith('blob:')) return null;

      return (
        <figure className="my-6">
            <img 
                src={displaySrc} 
                alt={alt} 
                className="w-full rounded-lg border border-slate-200 shadow-sm max-h-[600px] object-contain bg-slate-50"
            />
            {alt && <figcaption className="text-center text-xs text-slate-500 mt-2 italic">{alt}</figcaption>}
        </figure>
      );
    },
    table: (props: any) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-sm" {...props} /></div>,
    th: (props: any) => <th className="bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200" {...props} />,
    td: (props: any) => <td className="px-3 py-2 whitespace-normal border-b border-slate-100 text-slate-600" {...props} />
  };

  const summaryLength = parsedContent.summary.length;
  const isSummaryLengthValid = summaryLength >= 80 && summaryLength <= 110;

  return (
    <div className="flex flex-col gap-4 mb-20 md:mb-0">
      
      {/* 1. Title Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
                 <Heading className="w-4 h-4 text-indigo-600" />
                 Generated Title
             </div>
             <button 
                onClick={() => handleSimpleCopy(parsedContent.title, 'title')}
                disabled={!parsedContent.title}
                className="text-slate-500 hover:text-indigo-600 transition-colors"
                title="Copy Title"
             >
                {copiedSection === 'title' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
             </button>
         </div>
         <div className="p-4 text-lg font-bold text-slate-800">
             {isGenerating && !parsedContent.title ? (
                 <span className="animate-pulse text-slate-300">Generating Title...</span>
             ) : (
                 parsedContent.title || <span className="text-slate-300 text-sm italic">Title will appear here</span>
             )}
         </div>
      </div>

      {/* 2. Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
                 <AlignLeft className="w-4 h-4 text-indigo-600" />
                 Summary / Abstract
             </div>
             <div className="flex items-center gap-3">
                 <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isSummaryLengthValid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {summaryLength} chars {(!isSummaryLengthValid && summaryLength > 0) && '(Aim: 80-110)'}
                 </span>
                 <button 
                    onClick={() => handleSimpleCopy(parsedContent.summary, 'summary')}
                    disabled={!parsedContent.summary}
                    className="text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Copy Summary"
                 >
                    {copiedSection === 'summary' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                 </button>
             </div>
         </div>
         <div className="p-4 text-sm text-slate-600 leading-relaxed bg-slate-50/50">
             {isGenerating && !parsedContent.summary ? (
                 <span className="animate-pulse text-slate-300">Generating Summary...</span>
             ) : (
                 parsedContent.summary || <span className="text-slate-300 italic">Summary will appear here</span>
             )}
         </div>
      </div>

      {/* 3. Main Article Body */}
      {/* Removed overflow-hidden from parent to allow sticky child to work reliably. Added rounded-t-xl to toolbar. */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
        {/* Header/Toolbar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-16 z-20 shadow-sm transition-all rounded-t-xl">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <FileText className="w-4 h-4 text-indigo-600" />
                Article Body
            </div>
            
            {parsedContent.body && !isGenerating && (
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleCopyToWeChat}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border shadow-sm ${
                        wechatCopied 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {wechatCopied ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{wechatCopied ? "Copied!" : "WeChat Copy"}</span>
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                <button 
                    onClick={() => handleSimpleCopy(parsedContent.body, 'body')}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1"
                >
                    {copiedSection === 'body' ? <Check className="w-4 h-4 text-green-500" /> : <FileCode className="w-4 h-4" />}
                    <span className="hidden sm:inline">Markdown</span>
                </button>
            </div>
            )}
        </div>

        {/* Preview Content */}
        {/* Added prose modifiers to remove default margins from the first element to fix whitespace issues */}
        <div className="p-6 bg-white rounded-b-xl prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-h1:text-xl prose-a:text-indigo-600 prose-img:rounded-lg prose-headings:first:mt-0 prose-p:first:mt-0 prose-img:first:mt-0">
            {isGenerating && !parsedContent.body ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium animate-pulse">Crafting your story...</p>
                <div className="text-xs max-w-[200px] text-center opacity-70">Analyzing input, applying persona, styling layout...</div>
            </div>
            ) : parsedContent.body ? (
            <ReactMarkdown components={MarkdownComponents as any}>{parsedContent.body}</ReactMarkdown>
            ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm font-medium opacity-50">Content will appear here.</p>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ResultView;
