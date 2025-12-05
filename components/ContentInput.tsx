import React, { useRef, useEffect, useState } from 'react';
import { ImageAttachment } from '../types';
import { Image as ImageIcon, Link, FileText, X, Eraser, Globe, Loader2, ArrowDownToLine } from 'lucide-react';
import { fileToBase64 } from '../services/llmService';

interface Props {
  sourceText: string;
  setSourceText: (val: string) => void;
  images: ImageAttachment[];
  setImages: React.Dispatch<React.SetStateAction<ImageAttachment[]>>;
}

const ContentInput: React.FC<Props> = ({ sourceText, setSourceText, images, setImages }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // URL Fetching State
  const [urlInput, setUrlInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // Sync text from props to editable div
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== sourceText) {
      // Allow external updates (like History Restore or URL Import) to populate the editor.
      // We avoid overwriting if the user is typing (isFocused) to prevent cursor jumping,
      // unless the new value is empty (Clear All) or the editor is currently empty.
      if (!isFocused || sourceText === "" || editorRef.current.innerText.trim() === "") {
        editorRef.current.innerText = sourceText;
      }
    }
  }, [sourceText, isFocused]);

  const handleInput = () => {
    if (editorRef.current) {
      setSourceText(editorRef.current.innerText);
    }
  };

  const handleFetchUrl = async () => {
    if (!urlInput) return;
    
    // Simple validation
    let targetUrl = urlInput;
    if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
    }

    setIsFetching(true);
    try {
        // Use r.jina.ai as a bridge to get Markdown friendly content from a URL
        // This solves the "Hallucination" issue by providing real text content.
        const response = await fetch(`https://r.jina.ai/${targetUrl}`);
        if (!response.ok) throw new Error("Failed to fetch");
        
        const text = await response.text();
        
        const separator = sourceText ? "\n\n--- Imported Web Content ---\n\n" : "";
        const newContent = sourceText + separator + `Title: Imported Link (${targetUrl})\n\n` + text;
        
        setSourceText(newContent);
        if (editorRef.current) {
            editorRef.current.innerText = newContent;
        }
        setUrlInput(""); // Clear input on success
    } catch (e) {
        alert("Could not fetch content from this URL directly. Please copy/paste the content manually.");
        console.error(e);
    } finally {
        setIsFetching(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasHandledImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); 
        hasHandledImage = true;
        const file = item.getAsFile();
        if (file) {
          await processAndInsertImage(file);
        }
      } 
    }
  };

  const processAndInsertImage = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      const newImage: ImageAttachment = {
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      };

      setImages(prev => [...prev, newImage]);
      insertTextAtCursor(`\n[Image Inserted: ${id}]\n`);
      handleInput();
    } catch (err) {
      console.error("Paste image error", err);
    }
  };

  const insertTextAtCursor = (text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (editorRef.current) {
        editorRef.current.innerText += text;
    }
    handleInput(); // Trigger state update
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        await processAndInsertImage(e.target.files[i]);
      }
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAll = () => {
      setSourceText("");
      setImages([]);
      if (editorRef.current) editorRef.current.innerText = "";
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-offset-2 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
      
      {/* 1. URL Importer Bar */}
      <div className="p-2 border-b border-slate-100 bg-slate-50 flex gap-2 items-center">
        <div className="relative flex-1">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Paste URL here to fetch content (e.g., https://mp.weixin.qq.com/...)"
            />
        </div>
        <button 
            onClick={handleFetchUrl}
            disabled={isFetching || !urlInput}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1"
        >
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
            Import
        </button>
      </div>

      {/* 2. Toolbar */}
      <div className="p-2 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 px-2">
           <FileText className="w-3.5 h-3.5 text-indigo-600" />
           <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Source Editor</h3>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={clearAll}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Clear all content"
            >
                <Eraser className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-slate-200 mx-1"></div>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-100 px-3 py-1 rounded shadow-sm hover:bg-indigo-100 text-indigo-700 transition-all"
            >
                <ImageIcon className="w-3.5 h-3.5" />
                Add / Paste Image
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                multiple 
                accept="image/*" 
                className="hidden" 
            />
        </div>
      </div>
      
      {/* 3. Main Edit Area */}
      <div className="flex-1 flex flex-col relative min-h-0 bg-white">
        {/* Thumbnails of inserted images */}
        {images.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50/50 border-b border-slate-100 min-h-[50px] max-h-[100px] overflow-y-auto shrink-0">
                {images.map((img) => (
                    <div key={img.id} className="relative group h-10 w-10 bg-white rounded border border-slate-200 shadow-sm overflow-hidden hover:scale-110 transition-transform shrink-0 cursor-help" title={`ID: ${img.id}`}>
                        <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => removeImage(img.id)}
                            className="absolute top-0 right-0 bg-red-500/80 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* Content Editable */}
        <div 
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`flex-1 w-full p-4 outline-none overflow-y-auto text-xs leading-relaxed font-normal text-slate-900 selection:bg-indigo-100 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent`}
            data-placeholder="Paste text, import URL, or paste screenshots (Ctrl+V) here..."
        />
      </div>
      
      {/* Footer Tip */}
      <div className="py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-1.5">
            <Link className="w-3 h-3" />
            <span>Images tagged as <b>[Image Inserted: ID]</b> will be used by AI.</span>
        </div>
        <div>
            {sourceText.length} chars
        </div>
      </div>
    </div>
  );
};

export default ContentInput;