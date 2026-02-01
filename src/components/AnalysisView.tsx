import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Analysis, AnalysisResult } from '../types';

interface AnalysisViewProps {
  analysisId: string;
}

export default function AnalysisView({ analysisId }: AnalysisViewProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
    const interval = setInterval(loadAnalysis, 2000);
    return () => clearInterval(interval);
  }, [analysisId]);

  const loadAnalysis = async () => {
    const { data: analysisData } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .maybeSingle();

    if (analysisData) {
      setAnalysis(analysisData);

      const { data: resultsData } = await supabase
        .from('analysis_results')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: true });

      if (resultsData) {
        setResults(resultsData);
      }

      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!analysis) return <Loader2 className="w-6 h-6 animate-spin text-blue-400" />;
    if (analysis.status === 'processing') return <Loader2 className="w-6 h-6 animate-spin text-blue-400" />;
    if (analysis.status === 'completed') return <CheckCircle className="w-6 h-6 text-green-400" />;
    if (analysis.status === 'failed') return <XCircle className="w-6 h-6 text-red-400" />;
    return <Shield className="w-6 h-6 text-slate-400" />;
  };

  const getOverallVerdict = () => {
    if (results.length === 0) return null;
    const aiCount = results.filter(r => r.is_ai_generated).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length;
    const isAiGenerated = aiCount > results.length / 2;

    return {
      verdict: isAiGenerated ? 'AI-Generated Content Detected' : 'Likely Authentic Content',
      confidence: avgConfidence,
      aiCount,
      totalCount: results.length,
      color: isAiGenerated ? 'red' : 'green',
    };
  };

  const verdict = getOverallVerdict();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              {getStatusIcon()}
              <h2 className="text-2xl font-bold text-white">
                {analysis?.status === 'processing' ? 'Analyzing...' : 'Analysis Complete'}
              </h2>
            </div>
            <p className="text-slate-400">File: {analysis?.file_name}</p>
            <p className="text-slate-500 text-sm mt-1">
              Type: {analysis?.file_type?.toUpperCase()} • Size: {((analysis?.file_size || 0) / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>

      {verdict && (
        <div className={`bg-gradient-to-r ${
          verdict.color === 'red'
            ? 'from-red-500/10 to-orange-500/10 border-red-500/50'
            : 'from-green-500/10 to-emerald-500/10 border-green-500/50'
        } border rounded-2xl p-8`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                {verdict.color === 'red' ? (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                ) : (
                  <Shield className="w-6 h-6 text-green-400" />
                )}
                <h3 className={`text-2xl font-bold ${verdict.color === 'red' ? 'text-red-400' : 'text-green-400'}`}>
                  {verdict.verdict}
                </h3>
              </div>
              <p className="text-slate-300 text-sm">
                {verdict.aiCount} out of {verdict.totalCount} models detected AI-generated content
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${verdict.color === 'red' ? 'text-red-400' : 'text-green-400'}`}>
                {verdict.confidence.toFixed(1)}%
              </div>
              <p className="text-slate-400 text-sm">Avg. Confidence</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Model Analysis Results</span>
        </h3>

        {results.length === 0 && analysis?.status === 'processing' && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
            <p className="text-slate-300">Running detection models...</p>
            <p className="text-slate-500 text-sm mt-1">This may take a few moments</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result) => (
            <div
              key={result.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-white font-semibold">{result.model_name}</h4>
                  <p className="text-slate-500 text-xs">{result.model_version}</p>
                </div>
                {result.is_ai_generated ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Confidence</span>
                    <span className={result.is_ai_generated ? 'text-red-400' : 'text-green-400'}>
                      {result.confidence_score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${result.is_ai_generated ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${result.confidence_score}%` }}
                    />
                  </div>
                </div>

                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    result.is_ai_generated
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {result.detection_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {result.metadata.detectedArtifacts && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Detected Artifacts:</p>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {(result.metadata.detectedArtifacts as string[]).map((artifact, i) => (
                        <li key={i}>• {artifact}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.metadata.authenticityMarkers && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Authenticity Markers:</p>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {(result.metadata.authenticityMarkers as string[]).map((marker, i) => (
                        <li key={i}>• {marker}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
