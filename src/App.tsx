import { useState } from 'react';
import { Shield, History, BarChart3, Upload, Info } from 'lucide-react';
import UploadSection from './components/UploadSection';
import AnalysisView from './components/AnalysisView';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';
import AboutView from './components/AboutView';

type View = 'upload' | 'analysis' | 'history' | 'stats' | 'about';

function App() {
  const [currentView, setCurrentView] = useState<View>('upload');
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  const handleAnalysisStart = (analysisId: string) => {
    setCurrentAnalysisId(analysisId);
    setCurrentView('analysis');
  };

  const navigation = [
    { id: 'upload' as View, label: 'Detect', icon: Upload },
    { id: 'history' as View, label: 'History', icon: History },
    { id: 'stats' as View, label: 'Statistics', icon: BarChart3 },
    { id: 'about' as View, label: 'About', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">TruthGuard AI</h1>
                <p className="text-xs text-slate-400">Deepfake & AI Detection Platform</p>
              </div>
            </div>

            <div className="flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      currentView === item.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'upload' && <UploadSection onAnalysisStart={handleAnalysisStart} />}
        {currentView === 'analysis' && currentAnalysisId && (
          <AnalysisView analysisId={currentAnalysisId} />
        )}
        {currentView === 'history' && <HistoryView onViewAnalysis={handleAnalysisStart} />}
        {currentView === 'stats' && <StatsView />}
        {currentView === 'about' && <AboutView />}
      </main>

      <footer className="mt-16 py-6 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
          <p>TruthGuard AI - Keeping Digital Content Authentic & Society Safe</p>
          <p className="mt-1 text-xs">Built for protecting truth in the digital age</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
