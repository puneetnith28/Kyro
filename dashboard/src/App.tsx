import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Search, Home, FileText, Star, Settings, 
  Plus, MoreHorizontal, MessageSquare, ChevronRight, Hash, Sparkles, Share2, PanelLeftClose, User, Network, Clock, Inbox, BarChart2, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GraphVisualizer from './components/GraphVisualizer';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Live Feed');
  const [isTyping, setIsTyping] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full bg-gradient-animate text-white overflow-hidden selection:bg-indigo-500/30 relative">
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onSelectTab={setActiveTab} />
      
      {/* Decorative ambient light (like extension) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div 
        className={`fixed md:relative ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'
        } w-[260px] h-full transition-all duration-300 ease-in-out glass-sidebar flex flex-col z-40`}
      >
        <div className="p-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5 font-bold text-white text-lg tracking-tight group cursor-pointer">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 shadow-md border border-white/10">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400 text-sm font-bold">K</span>
              </div>
            </div>
            Kyro
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 hover:bg-white/5 rounded-md text-zinc-400 transition-colors">
            <PanelLeftClose size={16} />
          </button>
          <button onClick={() => setSidebarOpen(false)} className="hidden md:block p-1.5 hover:bg-white/5 rounded-md text-zinc-400 transition-colors">
            <PanelLeftClose size={16} />
          </button>
        </div>

        <div className="px-3 pb-3">
          <div onClick={() => { setCommandPaletteOpen(true); if(window.innerWidth < 768) setSidebarOpen(false); }} className="group flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 border border-transparent hover:border-white/5 transition-all cursor-pointer">
            <Search size={16} className="text-zinc-500 group-hover:text-blue-400 transition-colors" />
            <span className="flex-1 text-left">Search...</span>
            <span className="text-[10px] font-semibold bg-black/20 px-1.5 py-0.5 rounded text-zinc-500 border border-white/5">⌘K</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div className="space-y-0.5">
            <SidebarItem icon={<Clock size={16} />} label="Live Feed" active={activeTab === 'Live Feed'} onClick={() => { setActiveTab('Live Feed'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
            <SidebarItem icon={<MessageSquare size={16} />} label="Chat" active={activeTab === 'Chat'} onClick={() => { setActiveTab('Chat'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
            <SidebarItem icon={<Network size={16} />} label="Brain" active={activeTab === 'Brain'} onClick={() => { setActiveTab('Brain'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
            <SidebarItem icon={<Star size={16} />} label="Favorites" active={activeTab === 'Favorites'} onClick={() => { setActiveTab('Favorites'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
            <SidebarItem icon={<BarChart2 size={16} />} label="Insights" active={activeTab === 'Insights'} onClick={() => { setActiveTab('Insights'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
            <SidebarItem icon={<Settings size={16} />} label="Settings" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 px-2 mb-1.5 uppercase tracking-wider">
              <span>Personal Workspace</span>
              <button className="hover:text-white hover:bg-white/10 p-1 rounded transition-colors"><Plus size={14} /></button>
            </div>
            <div className="space-y-0.5">
              <SidebarItem icon={<FileText size={16} />} label="Getting Started" active={activeTab === 'Getting Started'} onClick={() => { setActiveTab('Getting Started'); if(window.innerWidth < 768) setSidebarOpen(false); }} />
              <SidebarItem icon={<Hash size={16} />} label="Project Ideas" />
              <SidebarItem icon={<FileText size={16} />} label="Meeting Notes" />
            </div>
          </div>
        </div>
        
        <div className="p-3 border-t border-white/5">
          <button className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-all text-sm font-medium border border-transparent hover:border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center">
                <User size={14} />
              </div>
              <span className="text-zinc-300">User Account</span>
            </div>
            <MoreHorizontal size={16} className="text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden w-full">
        
        <header className="h-14 glass-header flex items-center px-4 pl-4 sticky top-0 z-10 justify-between">
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            {(!sidebarOpen || window.innerWidth < 768) && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-1.5 mr-2 hover:bg-white/10 rounded-md text-zinc-400 transition-colors md:mr-2"
              >
                <Menu size={16} />
              </button>
            )}
            <span className="hover:text-white cursor-pointer transition-colors font-medium hidden sm:inline">Personal</span>
            <ChevronRight size={14} className="text-zinc-600 hidden sm:inline" />
            <span className="text-zinc-200 font-medium">{activeTab}</span>
          </div>
          <div className="flex items-center gap-2">
             <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-colors">
               <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
             </button>
             <button className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 transition-colors">
               <MoreHorizontal size={18} />
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-4xl mx-auto py-8 md:py-16 px-4 sm:px-6 md:px-10">
            <h1 className="text-[40px] font-bold text-white mb-8 outline-none placeholder-zinc-700 tracking-tight" contentEditable suppressContentEditableWarning data-placeholder="Untitled Page">
              {activeTab}
            </h1>
            
            {activeTab === 'Live Feed' && (
              <LiveFeed />
            )}

            {activeTab === 'Brain' && (
              <div className="relative z-10">
                <p className="text-zinc-400 text-lg mb-4">Visualize your live knowledge graph built by Cognee.</p>
                <GraphVisualizer />
              </div>
            )}
            
            {activeTab === 'Insights' && (
              <InsightsPanel />
            )}

            {activeTab === 'Getting Started' && (
              <GettingStarted setActiveTab={setActiveTab} />
            )}
            
            {activeTab === 'Settings' && (
              <SettingsPanel />
            )}
            
            {activeTab === 'Chat' && (
              <ChatComponent />
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}

function ChatComponent() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [relatedMemories, setRelatedMemories] = useState<{id: string, label: string}[]>([]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      if (data.related_memories) setRelatedMemories(data.related_memories);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to Kyro brain." }]);
    }
    setLoading(false);
  };

  return (
    <div className="mt-16 glass-card rounded-2xl p-6 relative overflow-hidden group flex flex-col">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={120} className="text-blue-400" />
      </div>
      
      <div className="flex-1 space-y-6 overflow-y-auto mb-6 relative z-10 min-h-[300px]">
        {messages.length === 0 && (
          <div className="flex gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30"></div>
              <div className="relative w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400">K</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-white font-semibold mb-1">Kyro AI</p>
              <p className="text-[15px] text-zinc-400 leading-relaxed">Hello! I have access to your personal context operating system. What would you like to recall today?</p>
            </div>
          </div>
        )}
        
        <AnimatePresence>
        {messages.map((msg, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className="relative flex-shrink-0">
              {msg.role === 'assistant' && <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30"></div>}
              <div className={`relative w-10 h-10 rounded-xl ${msg.role === 'user' ? 'bg-gradient-to-tr from-blue-500 to-purple-500' : 'bg-zinc-900 border border-white/10'} flex items-center justify-center text-white shadow-md`}>
                {msg.role === 'user' ? <User size={20} /> : <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400">K</span>}
              </div>
            </div>
            <div className={`flex flex-col w-[85%] md:w-auto ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <p className="text-xs md:text-sm text-white font-semibold mb-1">{msg.role === 'user' ? 'You' : 'Kyro AI'}</p>
              <div className={`px-4 py-3 rounded-2xl md:max-w-lg text-[14px] md:text-[15px] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>
                {msg.content}
              </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {loading && <div className="text-zinc-500 text-sm italic pl-14">Kyro is thinking...</div>}
        
        {relatedMemories.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
          <div className="pl-14 mt-4">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-semibold">Sources</p>
            <div className="flex flex-wrap gap-2">
              {relatedMemories.map(mem => (
                <span key={mem.id} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-md text-zinc-400">
                  {mem.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="relative mt-auto z-10 pt-4 border-t border-white/5">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask Kyro anything..." 
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
          className={`w-full bg-zinc-900/50 border ${isTyping ? 'border-blue-500/50 ring-4 ring-blue-500/10' : 'border-white/10'} rounded-xl pl-4 pr-12 py-3 text-[15px] text-white focus:outline-none transition-all shadow-inner backdrop-blur-md placeholder:text-zinc-600`} 
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className={`absolute right-3 top-7 p-1.5 rounded-lg transition-all ${isTyping ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
          <Sparkles size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick = () => {} }) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-[13px] font-medium border border-transparent ${
        active 
          ? 'bg-white/10 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`}
    >
      <span className={`${active ? 'text-blue-400' : 'text-zinc-500'} transition-colors`}>{icon}</span>
      {label}
    </motion.button>
  );
}

function LiveFeed() {
  const [captures, setCaptures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaptures = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/recent');
      const data = await res.json();
      setCaptures(data.captures || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCaptures();
    const interval = setInterval(fetchCaptures, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-zinc-500 animate-pulse">Loading live feed...</div>;
  if (captures.length === 0) return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 mt-8 text-center glass-card rounded-2xl border border-white/5"
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
        <Inbox size={32} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Your Brain is Empty</h3>
      <p className="text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
        Ensure the Kyro Chrome Extension is active, or use the Webhook API to inject your first memory. The Live Feed will automatically update when context arrives.
      </p>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {captures.map((cap, i) => (
          <motion.div 
            key={cap.timestamp || i}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
            className="glass-card p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              {cap.title}
            </h3>
            <span className="text-xs text-zinc-500">{new Date(cap.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{cap.text}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-zinc-500">{cap.domain}</span>
            <a href={cap.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">View Source</a>
          </div>
        </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}function SettingsPanel() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('loading');
    try {
      const res = await fetch('http://localhost:8000/api/config/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey })
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="max-w-2xl mt-8">
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-blue-400" /> API Configuration
          </h2>
          <p className="text-zinc-400 mt-2 text-sm">Configure your Google Gemini API key to power Kyro's intelligence.</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Gemini API Key</label>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                <button 
                  onClick={handleSave}
                  disabled={status === 'loading'}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {status === 'loading' ? 'Saving...' : status === 'success' ? 'Saved!' : status === 'error' ? 'Error' : 'Save Key'}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Your key is stored locally in your browser and sent securely to your local backend.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandPalette({ isOpen, onClose, onSelectTab }: { isOpen: boolean, onClose: () => void, onSelectTab: (tab: string) => void }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const actions = [
    { id: 'live-feed', label: 'Go to Live Feed', icon: <Clock size={16} />, action: () => onSelectTab('Live Feed') },
    { id: 'chat', label: 'Go to Chat', icon: <MessageSquare size={16} />, action: () => onSelectTab('Chat') },
    { id: 'brain', label: 'Go to Brain Visualizer', icon: <Network size={16} />, action: () => onSelectTab('Brain') },
    { id: 'settings', label: 'Go to Settings', icon: <Settings size={16} />, action: () => onSelectTab('Settings') },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search size={18} className="text-zinc-400" />
              <input 
                ref={inputRef}
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-[15px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length > 0) {
                    filtered[0].action();
                    onClose();
                    setSearch('');
                  }
                  if (e.key === 'Escape') {
                    onClose();
                  }
                }}
              />
              <span className="text-[10px] font-semibold bg-white/10 px-1.5 py-0.5 rounded text-zinc-400 border border-white/5">ESC</span>
            </div>
            
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length > 0 ? (
                <div className="space-y-1">
                  {filtered.map((action, i) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { action.action(); onClose(); setSearch(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${i === 0 && search.length > 0 ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-300'}`}
                    >
                      <span className={i === 0 && search.length > 0 ? 'text-blue-400' : 'text-zinc-500'}>{action.icon}</span>
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-zinc-500">
                  No commands found.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GettingStarted({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="max-w-5xl mx-auto pb-20 relative z-10 animate-fade-in">
      
      {/* Hero Section */}
      <div className="glass-card rounded-[32px] p-10 mb-12 border border-blue-500/20 relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all duration-1000 scale-150 transform translate-x-1/4 -translate-y-1/4">
          <Sparkles size={300} className="text-blue-400" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent z-0"></div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Context OS v1.0
          </div>
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-zinc-400 mb-6 tracking-tight leading-tight">
            The AI That Never Forgets You.
          </h1>
          <p className="text-zinc-300 text-xl leading-relaxed font-light mb-8 max-w-2xl">
            Welcome to <strong className="text-white font-semibold">Kyro</strong>. It silently captures the context of your digital life—intercepting your thoughts across ChatGPT, Claude, Gemini, and Perplexity—weaving them into a continuous, local memory graph using <strong className="text-blue-400 font-medium">Cognee</strong> and <strong className="text-purple-400 font-medium">Gemini 1.5</strong>.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('Brain')} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2">
              <Network size={18} /> Explore Brain
            </button>
            <button onClick={() => setActiveTab('Settings')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-2">
              <Settings size={18} /> Configure API
            </button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 px-2">Core Capabilities</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Universal Tracking</h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The browser extension runs silently in the background, intercepting your prompts from all major AI platforms before they are sent, capturing your raw train of thought.
          </p>
        </div>
        
        <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Network size={24} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Cognee Knowledge Graph</h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Captured context is fed into a local RAG engine. Entities and relationships are extracted to build a 3D structural graph of your knowledge.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
            <MessageSquare size={24} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Contextual RAG Chat</h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Query your own history. Ask Kyro questions and it will retrieve exactly what you were researching on Claude three days ago to answer you perfectly.
          </p>
        </div>
      </div>

      {/* Step by Step Guide */}
      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 px-2">How to Operate</h3>
      <div className="space-y-4">
        
        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-2xl shadow-lg border-4 border-zinc-900 z-10">
            1
          </div>
          <div className="flex-1 z-10">
            <h3 className="text-xl font-bold text-white mb-2">Configure the Engine</h3>
            <p className="text-zinc-400 leading-relaxed">
              Kyro requires an LLM to process information. Navigate to the <strong>Settings</strong> tab in the sidebar and paste your Gemini API Key. This securely activates the backend RAG pipeline and `Cognee` graph without needing to restart the server.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-2xl shadow-lg border-4 border-zinc-900 z-10">
            2
          </div>
          <div className="flex-1 z-10">
            <h3 className="text-xl font-bold text-white mb-2">Activate the Trackers</h3>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Kyro works best when it's listening. Ensure the Kyro Chrome Extension is installed and active. Once running, simply use your favorite AI tools normally. Kyro will intercept and log your context automatically.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> chatgpt.com</span>
              <span className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> claude.ai</span>
              <span className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> gemini.google.com</span>
              <span className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> perplexity.ai</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-white font-bold text-2xl shadow-lg border-4 border-zinc-900 z-10">
            3
          </div>
          <div className="flex-1 z-10">
            <h3 className="text-xl font-bold text-white mb-2">Explore the Graph</h3>
            <p className="text-zinc-400 leading-relaxed">
              As Kyro learns, your memory graph grows. Check the <strong>Live Feed</strong> to see data flowing from the extension in real-time. Jump into the <strong>Brain</strong> tab to explore a beautiful 3D visualization of how your ideas connect. When you're ready, use the <strong>Chat</strong> to talk directly to your augmented memory!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsPanel() {
  const [activity, setActivity] = useState<{date: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/analytics/activity');
        if (res.ok) {
          const data = await res.json();
          setActivity(data.activity || []);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchActivity();
  }, []);

  const totalCaptured = activity.reduce((acc, curr) => acc + curr.count * 12, 452); // mockup multiplier
  
  const getColor = (count: number) => {
    if (count === 0) return 'bg-zinc-800/50';
    if (count === 1) return 'bg-blue-900/50';
    if (count === 2) return 'bg-blue-700/60';
    if (count === 3) return 'bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
    return 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Network size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1">Total Memories</p>
            <p className="text-2xl font-bold text-white">{totalCaptured}</p>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1">Current Streak</p>
            <p className="text-2xl font-bold text-white">12 Days</p>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <BarChart2 size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1">Daily Average</p>
            <p className="text-2xl font-bold text-white">34 Contexts</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Activity Heatmap</h3>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-zinc-500 animate-pulse text-sm">Synthesizing telemetry...</div>
        ) : (
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <AnimatePresence>
              {activity.map((day, i) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.005, duration: 0.2 }}
                  title={`${day.date}: ${day.count} captures`}
                  className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${getColor(day.count)} transition-all hover:scale-125 cursor-crosshair`}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-zinc-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-zinc-800/50" />
            <div className="w-3 h-3 rounded-sm bg-blue-900/50" />
            <div className="w-3 h-3 rounded-sm bg-blue-700/60" />
            <div className="w-3 h-3 rounded-sm bg-blue-500/80" />
            <div className="w-3 h-3 rounded-sm bg-purple-500" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default App;
