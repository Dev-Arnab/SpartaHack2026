import { useEffect, useState } from 'react';
import { Clock, FileImage, FileVideo, FileAudio, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Analysis, AnalysisResult } from '../types';

interface HistoryViewProps {
  onViewAnalysis: (analysisId: string) => void;
}

interface AnalysisWithResults extends Analysis {
  results?: AnalysisResult[];
}

export default function HistoryView({ onViewAnalysis }: HistoryViewProps) {
  const [analyses, setAnalyses] = useState<AnalysisWithResults[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data: analysesData } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (analysesData) {
      const analysesWithResults = await Promise.all(
        analysesData.map(async (analysis) => {
          const { data: results } = await supabase
            .from('analysis_results')
            .select('*')
            .eq('analysis_id', analysis.id);

          return { ...analysis, results: results || [] };
        })
      );

      setAnalyses(analysesWithResults);
    }

    setIsLoading(false);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-400" />;
      case 'video':
        return <FileVideo className="w-5 h-5 text-green-400" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-purple-400" />;
      default:
        return <FileImage className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs">
            <span>Pending</span>
          </span>
        );
    }
  };

  const getVerdict = (results: AnalysisResult[]) => {
    if (results.length === 0) return null;
    const aiCount = results.filter(r => r.is_ai_generated).length;
    const isAiGenerated = aiCount > results.length / 2;
    return {
      isAiGenerated,
      aiCount,
      total: results.length,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Analysis History</h2>
        <p className="text-slate-300">
          View all your previous content analyses
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No analyses yet</h3>
          <p className="text-slate-400">
            Upload a file to start detecting AI-generated content
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => {
            const verdict = getVerdict(analysis.results || []);
            return (
              <div
                key={analysis.id}
                onClick={() => onViewAnalysis(analysis.id)}
                className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getFileIcon(analysis.file_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {analysis.file_name}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {new Date(analysis.created_at).toLocaleString()}
                      </p>
                      <div className="flex items-center space-x-3 mt-2">
                        {getStatusBadge(analysis.status)}
                        {verdict && (
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            verdict.isAiGenerated
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {verdict.isAiGenerated ? (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>AI Detected ({verdict.aiCount}/{verdict.total})</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                <span>Authentic ({verdict.total - verdict.aiCount}/{verdict.total})</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-slate-500 text-xs">
                      {(analysis.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {analysis.results && analysis.results.length > 0 && (
                      <p className="text-slate-400 text-xs mt-1">
                        {analysis.results.length} models
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
