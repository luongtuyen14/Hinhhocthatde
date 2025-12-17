import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, GeometryData } from '../types';
import { Mic, MicOff, Send, Volume2, VolumeX, MessageSquare, Paperclip, X, BrainCircuit, Lightbulb, ListChecks, HelpCircle, Camera, Image as ImageIcon, ClipboardPaste } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, image?: string) => void;
  isLoading: boolean;
  isVoiceEnabled: boolean;
  toggleVoice: () => void;
  geometryData: GeometryData | null;
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isVoiceEnabled,
  toggleVoice,
  geometryData,
  currentStepIndex,
  setCurrentStepIndex
}) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'solution' | 'reasoning'>('chat');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Handle Clipboard Paste (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'vi-VN';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSend = () => {
    if ((!input.trim() && !selectedImage)) return;
    onSendMessage(input.trim(), selectedImage || undefined);
    setInput("");
    setSelectedImage(null);
  };

  useEffect(() => {
    if (geometryData?.reasoning && geometryData.reasoning.length > 0) setActiveTab('reasoning');
    else if (geometryData?.mathSolution) setActiveTab('solution');
  }, [geometryData]);

  return (
    <div className="flex flex-col h-full bg-white" onPaste={handlePaste}>
      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}><MessageSquare size={14}/> Chat</button>
        <button onClick={() => setActiveTab('reasoning')} disabled={!(geometryData?.reasoning?.length)} className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 ${activeTab === 'reasoning' ? 'text-amber-600 border-b-2 border-amber-600 bg-white' : 'text-slate-400'}`}><Lightbulb size={14}/> Gợi ý</button>
        <button onClick={() => setActiveTab('solution')} disabled={!geometryData?.mathSolution} className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 ${activeTab === 'solution' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-slate-400'}`}><BrainCircuit size={14}/> Giải</button>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-slate-50/30">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-xs text-slate-400 animate-pulse">AI đang suy nghĩ...</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t bg-white">
              {selectedImage && (
                <div className="mb-2 relative inline-block group">
                  <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border shadow-sm object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X size={12} /></button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <div className="flex gap-1 shrink-0">
                  <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
                  <button onClick={() => cameraInputRef.current?.click()} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50" title="Chụp ảnh"><Camera size={20}/></button>
                  
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50" title="Chọn từ máy"><ImageIcon size={20}/></button>
                </div>

                <div className="flex-1">
                  <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                    placeholder="Hỏi AI hoặc dán ảnh..." 
                    className="w-full px-4 py-2 text-sm rounded-xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 outline-none"
                    disabled={isLoading}
                  />
                </div>

                <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-md">
                   <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'reasoning' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {geometryData?.reasoning?.map((step, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-amber-600 mb-1">Gợi ý {idx+1}</div>
                <div className="text-sm font-semibold text-slate-800">{step.question}</div>
                <div className="text-xs text-slate-500 mt-1 italic">💡 {step.answer}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'solution' && (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            <div className="bg-white rounded-xl p-4 border shadow-sm prose prose-sm max-w-none">
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {geometryData?.mathSolution}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;