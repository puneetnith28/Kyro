import { useState, useEffect } from 'react';
import { Trash2, Upload, Settings, Power, Activity, ExternalLink, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { useAuth } from '@clerk/chrome-extension';
import { Onboarding } from './components/Onboarding';
import { Auth } from './components/Auth';

function App() {
  const [isActive, setIsActive] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [recentCaptures, setRecentCaptures] = useState<any[]>([]);

  // Clerk Auth State
  const { isLoaded, isSignedIn, signOut } = useAuth();

  // Routing State
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('kyro_onboarding_complete') !== 'true';
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const healthRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/health`);
        if (healthRes.ok) setBackendConnected(true);
        else setBackendConnected(false);

        const recentRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/recent`);
        if (recentRes.ok) {
          const data = await recentRes.json();
          setRecentCaptures(data.captures || []);
        }
      } catch {
        setBackendConnected(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulate a random sync pulse
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    }, 8000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (showOnboarding) {
    return <Onboarding onComplete={() => {
      localStorage.setItem('kyro_onboarding_complete', 'true');
      setShowOnboarding(false);
    }} />;
  }

  if (!isLoaded) {
    return <div className="h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading...</div>;
  }

  if (!isSignedIn) {
    return <Auth onComplete={() => {
      // In dev mode, they can skip. In production, we don't use this.
    }} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-animate text-white overflow-hidden relative">
      {/* Decorative ambient light */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-600/20 rounded-full blur-[60px] pointer-events-none"></div>

      {/* Header */}
      <header className="glass-panel px-5 py-4 flex items-center justify-between z-10 sticky top-0 border-b-0 border-white/10 rounded-b-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-white/10">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400 text-sm">K</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Kyro</h1>
            <p className="text-[10px] text-blue-300/80 font-medium tracking-wide uppercase">Context OS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => signOut()}
            className="text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 text-zinc-300"
          >
            <Power size={12} className="text-red-400" /> Sign Out
          </button>
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 shadow-sm border ${isActive
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
          >
            <Power size={12} className={isActive ? 'animate-pulse' : ''} />
            {isActive ? 'Active' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4 z-10">

        {/* Status Card */}
        <div className="glass-panel rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div className="flex justify-between items-start mb-3">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              <Activity size={14} className={isActive ? 'text-emerald-400' : 'text-zinc-500'} />
              Connection
            </h2>
            {isSyncing && isActive && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400 font-medium animate-pulse">
                <RefreshCw size={10} className="animate-spin" /> Syncing
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`relative flex h-3 w-3 ${(isActive && backendConnected) ? '' : 'opacity-50'}`}>
              {(isActive && backendConnected) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${(isActive && backendConnected) ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{backendConnected ? 'Connected to Kyro Brain' : 'Offline / Backend Down'}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{isActive ? (backendConnected ? 'Capturing context in real-time' : 'Saving context locally') : 'Tracking paused by user'}</p>
            </div>
          </div>
        </div>

        {/* Captures Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Database size={14} /> Recent Context
            </h2>
            <span className="text-[10px] text-zinc-500 font-medium">Last 1h</span>
          </div>

          <div className="space-y-2">
            {recentCaptures.slice(0, 3).map((item, i) => (
              <div key={i} className="group/item glass-card rounded-lg p-3 flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5 bg-zinc-800/50 p-1.5 rounded-md border border-white/5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm text-zinc-200 font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{item.domain}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecentCaptures(prev => prev.filter((_, index) => index !== i));
                    if (item.id) fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/memory/${item.id}`, { method: 'DELETE' }).catch(() => {});
                  }}
                  className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-md transition-all"
                  title="Delete Memory"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {recentCaptures.length === 0 && (
              <div className="text-center py-4 text-xs text-zinc-500">
                No recent captures.
              </div>
            )}
          </div>
        </div>

        {/* Historical Sync Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Upload size={14} /> Historical Sync
            </h2>
          </div>
          
          <div className="glass-card rounded-lg p-4 border border-white/5 relative overflow-hidden">
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Upload your ChatGPT <code className="bg-white/10 px-1 rounded">conversations.json</code> to backfill your knowledge graph.
            </p>
            <label className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white cursor-pointer transition-all">
              <Upload size={14} className="text-purple-400" />
              <span>Select File</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      if (Array.isArray(data)) {
                        let count = 0;
                        data.forEach((chat: any) => {
                          if (chat.title && chat.mapping) {
                            count++;
                            chrome.runtime.sendMessage({
                              type: "CAPTURE_CONTEXT",
                              data: {
                                url: "https://chatgpt.com/history",
                                title: chat.title,
                                text: `Historical Chat: ${chat.title}`,
                                domain: "chatgpt.com",
                                timestamp: new Date().toISOString()
                              }
                            });
                          }
                        });
                        alert(`Successfully queued ${count} historical conversations for processing!`);
                      }
                    } catch {
                      alert("Invalid JSON format.");
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel px-4 py-3 z-10 flex justify-between items-center border-t border-white/10 mt-auto rounded-t-xl">
        <div className="flex gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Settings">
            <Settings size={16} />
          </button>
          <button 
            onClick={() => {
              chrome.alarms.get("kyro-graph-prune", (alarm) => {
                if (alarm) {
                  alert(`Pruning Alarm active! Next trigger: ${new Date(alarm.scheduledTime).toLocaleString()}`);
                } else {
                  alert('Pruning Alarm is not registered. Please reload the extension.');
                }
              });
            }}
            className="p-2 hover:bg-purple-500/10 rounded-lg text-purple-400 hover:text-purple-300 transition-colors" 
            title="Check Graph Pruning Alarm"
          >
            <Database size={16} />
          </button>
        </div>

        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-all group"
        >
          Open Dashboard
          <ExternalLink size={12} className="text-zinc-400 group-hover:text-white transition-colors" />
        </a>
      </footer>
    </div>
  );
}

export default App;
