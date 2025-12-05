
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, RefreshCw, Image as ImageIcon, MessageCircle, FileCode } from 'lucide-react';
import { ImageAttachment } from '../types';

interface Props {
  content: string;
  isGenerating: boolean;
  images?: ImageAttachment[]; 
}

const ResultView: React.FC<Props> = ({ content, isGenerating, images = [] }) => {
  const [copied, setCopied] = React.useState(false);
  const [wechatCopied, setWechatCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Advanced Formatter for WeChat Official Account
   * Fixes:
   * 1. Resolves Blob/ID to Base64 for images
   * 2. Uses robust line parsing
   * 3. Inlines strictly compatible CSS
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

    // --- 2. Robust Image Resolver ---
    // Finds the image object whether the source is an ID, a filename, or a Blob URL
    const getBase64 = (src: string) => {
        const cleanSrc = src.replace(/['"]/g, '').trim();
        
        // 1. Try finding local image by ID or Preview URL
        let img = imgs.find(i => i.id === cleanSrc || cleanSrc.includes(i.id) || i.previewUrl === cleanSrc);

        if (img) return img.base64;

        // 2. SAFETY CHECK: If it looks like a Blob URL but we didn't find it in our list,
        // it is likely a hallucination (e.g. AI fabricated "blob:http://...") or stale data.
        // We MUST return null to prevent rendering broken images.
        if (cleanSrc.startsWith('blob:')) {
            return null; 
        }

        // 3. Pass through standard web URLs (http/https)
        return cleanSrc;
    };

    // --- 3. Inline Parser ---
    const parseInline = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, `<span style="${S.STRONG}">$1</span>`) // Bold
            .replace(/`([^`]+)`/g, `<span style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace; color: #c026d3; font-size: 90%;">$1</span>`) // Inline Code
            .replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" style="color: #4f46e5; text-decoration: none; border-bottom: 1px dashed #4f46e5;">$1</a>`); // Link
    };

    // --- 4. Line-by-Line Parser ---
    // More robust than block splitting for things like lists and headers
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    let inTable = false;
    let tableBuffer: string[] = [];
    let isFirstPara = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
            continue;
        }

        // --- Headers ---
        if (line.match(/^##\s+/)) {
            html += `<section style="${S.SECTION}"><span style="${S.H2_INNER}">${parseInline(line.replace(/^##\s+/, ''))}</span></section>`;
        }
        else if (line.match(/^###\s+/)) {
            html += `<div style="${S.H3}">${parseInline(line.replace(/^###\s+/, ''))}</div>`;
        }

        // --- Divider ---
        else if (line === '---' || line === '***') {
            html += `<div style="${S.DIVIDER}">•••</div>`;
        }

        // --- Blockquote ---
        else if (line.startsWith('> ')) {
            html += `<div style="${S.QUOTE}">${parseInline(line.replace(/^> /, ''))}</div>`;
        }

        // --- Images ---
        else if (line.match(/^!\[(.*?)\]\((.*?)\)/)) {
            const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
            if (match) {
                const alt = match[1];
                const src = match[2];
                const finalSrc = getBase64(src);
                
                // Only render if we have a valid source (filters out hallucinated blobs)
                if (finalSrc) {
                    html += `
                        <div style="${S.IMG_CONTAINER}">
                            <img src="${finalSrc}" style="${S.IMG}" />
                            ${alt ? `<span style="${S.IMG_CAPTION}">${alt}</span>` : ''}
                        </div>`;
                }
            }
        }

        // --- Ordered List (1. xxx) ---
        else if (line.match(/^\d+\.\s+/)) {
            const match = line.match(/^\d+\.\s+(.*)/);
            const numMatch = line.match(/^(\d+)\./);
            const num = numMatch ? numMatch[1] : '1';
            const content = match ? match[1] : line;
            html += `
                <div style="${S.OL_ITEM}">
                    <span style="${S.OL_BADGE}">${num}</span>
                    <span style="flex:1;">${parseInline(content)}</span>
                </div>`;
        }

        // --- Unordered List (- xxx) ---
        else if (line.match(/^-\s+/)) {
             html += `
                <div style="${S.UL_ITEM}">
                    <div style="${S.UL_DOT}"></div>
                    <div>${parseInline(line.replace(/^-\s+/, ''))}</div>
                </div>`;
        }

        // --- Tables ---
        else if (line.startsWith('|')) {
            tableBuffer.push(line);
            // Look ahead to check if table ends
            const nextLine = lines[i+1]?.trim();
            if (!nextLine || !nextLine.startsWith('|')) {
                // Render table
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

        // --- Standard Paragraph ---
        else {
            // Check for Lead Paragraph (First real text paragraph)
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
        const html = formatToWeChatHtml(content, images);
        
        const htmlBlob = new Blob([html], { type: 'text/html' });
        
        // We purposefully omit the Markdown source in text/plain for this action.
        // We replace it with a simple notification string.
        // This forces the receiving editor (WeChat) to ignore the plain text and use the HTML payload.
        const textBlob = new Blob(["[Content Copied as WeChat Rich Text]"], { type: 'text/plain' });
        
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob 
            })
        ]);

        setWechatCopied(true);
        setTimeout(() => setWechatCopied(false), 2500);
    } catch (err) {
        console.error("Clipboard write failed", err);
        alert("Copy failed. Please try again or check browser permissions.");
    }
  };

  // --- Preview Renderer (React Markdown) ---
  const MarkdownComponents = {
    img: (props: any) => {
      const src = typeof props.src === 'string' ? props.src : '';
      const alt = typeof props.alt === 'string' ? props.alt : '';
      
      // Smart Resolve Logic for Preview
      let targetId = src.replace(/['"]/g, '').trim();
      
      // If src is a blob (from restore/paste), use it directly if valid, else try finding by ID
      let displaySrc = src;
      const localImage = images.find(img => img.id === targetId || targetId.includes(img.id) || img.previewUrl === src);
      
      if (localImage) {
          displaySrc = localImage.previewUrl;
      }
      
      // Don't render broken blob links in preview either
      if (!localImage && src.startsWith('blob:')) {
          return null;
      }

      return (
        <figure className="my-6">
            <img 
                src={displaySrc} 
                alt={alt} 
                className="w-full rounded-lg border border-slate-200 shadow-sm max-h-[600px] object-contain bg-slate-50"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            {alt && (
                <figcaption className="text-center text-xs text-slate-500 mt-2 italic">
                    {alt}
                </figcaption>
            )}
        </figure>
      );
    },
    table: (props: any) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-sm" {...props} /></div>,
    th: (props: any) => <th className="bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200" {...props} />,
    td: (props: any) => <td className="px-3 py-2 whitespace-normal border-b border-slate-100 text-slate-600" {...props} />
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 min-h-[300px] mb-20 md:mb-0">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/95 flex justify-between items-center sticky top-0 md:top-16 z-20 backdrop-blur-sm rounded-t-xl transition-all">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
            Generated Article
        </h3>
        
        {content && !isGenerating && (
          <div className="flex items-center gap-3">
              <button 
                onClick={handleCopyToWeChat}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border shadow-sm ${
                    wechatCopied 
                    ? 'bg-green-100 text-green-700 border-green-200' 
                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                }`}
                title="Copy styled HTML for WeChat"
              >
                {wechatCopied ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{wechatCopied ? "Copied!" : "WeChat Copy"}</span>
              </button>

              <div className="h-4 w-px bg-slate-300"></div>

              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                title="Copy Markdown Source"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <FileCode className="w-4 h-4" />}
                <span className="hidden sm:inline">Markdown</span>
              </button>
          </div>
        )}
      </div>

      {/* Preview Body */}
      <div className="p-6 bg-white prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-h1:text-xl prose-a:text-indigo-600 prose-img:rounded-lg">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
             <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
             <p className="text-sm font-medium animate-pulse">Crafting your story...</p>
             <div className="text-xs max-w-[200px] text-center opacity-70">Analyzing input, applying persona, styling layout...</div>
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
