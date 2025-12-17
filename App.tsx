import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import ChatInterface from './components/ChatInterface';
import { GeometryData, ChatMessage, Project } from './types';
import { generateGeometry } from './services/geminiService';
import { 
  Menu, Plus, Calculator, X, 
  FolderOpen, Edit2, Trash2, Save, Copy, Download, Upload, Check,
  Sigma, Pi, Triangle, MessageSquare, ChevronRight, GripVertical
} from 'lucide-react';

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Chào em! Thầy là trợ lý Toán học. Em có thể chụp ảnh đề bài hoặc nhắn tin để thầy hỗ trợ nhé!',
  timestamp: Date.now()
};

const App: React.FC = () => {
  // Global Project State
  const [projects, setProjects] = useState<Project[]>(() => {
     try {
       const saved = localStorage.getItem('hinh-hoc-ai-projects');
       return saved ? JSON.parse(saved) : [];
     } catch (e) {
       return [];
     }
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Renaming State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  
  // Floating Assistant Position State
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    if (projects.length === 0) {
      createProject("Bài toán mới");
    } else if (!currentProjectId) {
      const mostRecent = [...projects].sort((a,b) => b.lastModified - a.lastModified)[0];
      setCurrentProjectId(mostRecent.id);
    }
    if (window.innerWidth > 1024) setIsSidebarOpen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('hinh-hoc-ai-projects', JSON.stringify(projects));
  }, [projects]);

  const activeProject = projects.find(p => p.id === currentProjectId);
  const messages = activeProject?.messages || [DEFAULT_WELCOME_MSG];
  const geometryData = activeProject?.geometryData || null;
  const currentStepIndex = activeProject?.currentStepIndex || 0;

  const updateActiveProject = (updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => 
      p.id === currentProjectId ? { ...p, ...updates, lastModified: Date.now() } : p
    ));
  };

  // --- Drag Logic ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX - bubblePos.x, y: clientY - bubblePos.y };
    setIsDragging(true);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let newX = clientX - dragStartPos.current.x;
    let newY = clientY - dragStartPos.current.y;

    // Constrain within screen
    newX = Math.max(10, Math.min(window.innerWidth - (isChatOpen ? 360 : 70), newX));
    newY = Math.max(10, Math.min(window.innerHeight - (isChatOpen ? 550 : 70), newY));

    setBubblePos({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, isChatOpen]);

  // --- Project Functions ---
  const createProject = (nameInput?: string) => {
    const name = nameInput || `Bài toán ${projects.length + 1}`;
    const newProj: Project = {
      id: Date.now().toString(),
      name: name,
      subjectId: 'math', 
      messages: [{ ...DEFAULT_WELCOME_MSG, timestamp: Date.now() }],
      geometryData: null,
      currentStepIndex: 0,
      lastModified: Date.now()
    };
    setProjects(prev => [newProj, ...prev]);
    setCurrentProjectId(newProj.id);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Xóa bài toán này?")) {
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      if (currentProjectId === id && newProjects.length > 0) setCurrentProjectId(newProjects[0].id);
    }
  };

  const handleSendMessage = async (text: string, image?: string) => {
    if (!currentProjectId) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    updateActiveProject({ messages: updatedMessages });
    setIsLoading(true);

    try {
      const data = await generateGeometry(text, messages.map(m=>m.text).join('\n'), image);
      const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: data.message || "Xong!", timestamp: Date.now() };
      updateActiveProject({ messages: [...updatedMessages, aiMsg], geometryData: data, currentStepIndex: 0 });
    } catch (error) {
      updateActiveProject({ messages: [...updatedMessages, { id: Date.now().toString(), role: 'model', text: "Lỗi rồi em ạ.", timestamp: Date.now() }] });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-xl md:shadow-none`}>
          <div className="p-4 border-b flex items-center justify-between bg-blue-50/50">
            <h1 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <Calculator size={24} className="text-blue-600" /> Toán THCS
            </h1>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
          </div>

          <div className="p-4 shrink-0">
            <button onClick={() => createProject()} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all font-bold"><Plus size={20} /> Bài toán mới</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-2">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => { setCurrentProjectId(proj.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer border ${currentProjectId === proj.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}
              >
                <Triangle size={18} className={currentProjectId === proj.id ? 'text-blue-600' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate text-sm ${currentProjectId === proj.id ? 'text-blue-900' : 'text-slate-700'}`}>{proj.name}</div>
                </div>
                <button onClick={(e) => deleteProject(proj.id, e)} className="hidden group-hover:block p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      {/* Canvas Area */}
      <div className="flex-1 h-full relative z-0">
        <div className="absolute top-4 left-4 z-10 md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white rounded-full shadow-lg border border-slate-200 text-slate-700"><Menu size={24} /></button>
        </div>

        <Canvas 
          key={currentProjectId}
          data={geometryData} 
          currentStepIndex={currentStepIndex}
          onDataUpdate={(newData) => updateActiveProject({ geometryData: newData })}
          onSpeak={(t) => { if(isVoiceEnabled) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang='vi-VN'; window.speechSynthesis.speak(u); } }}
        />

        {/* Floating Mini AI Assistant */}
        <div 
          className="fixed z-50 flex flex-col items-end pointer-events-none"
          style={{ left: bubblePos.x, top: bubblePos.y }}
        >
          {/* Chat Window */}
          {isChatOpen && (
            <div className="mb-4 w-[350px] md:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-bottom-10 pointer-events-auto origin-bottom-right">
              <div className="p-4 border-b bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold cursor-move" onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
                  <div className="bg-white/20 p-1 rounded-lg"><MessageSquare size={18}/></div>
                  Trợ lý Toán học
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatInterface 
                  key={currentProjectId}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  isVoiceEnabled={isVoiceEnabled}
                  toggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  geometryData={geometryData}
                  currentStepIndex={currentStepIndex}
                  setCurrentStepIndex={(idx) => updateActiveProject({ currentStepIndex: idx })}
                />
              </div>
            </div>
          )}

          {/* Assistant Bubble */}
          <div 
            className={`
              w-16 h-16 rounded-full shadow-2xl flex items-center justify-center cursor-pointer pointer-events-auto transition-transform active:scale-95
              ${isChatOpen ? 'bg-red-500 rotate-90' : 'bg-blue-600 hover:scale-105'}
            `}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={(e) => {
               if (!isDragging) setIsChatOpen(!isChatOpen);
            }}
          >
            {isChatOpen ? <X size={28} className="text-white" /> : <div className="text-2xl">🤖</div>}
            
            {/* Drag Handle Indicator */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity">
              <GripVertical size={14} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;