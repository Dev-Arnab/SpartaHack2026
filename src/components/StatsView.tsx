import { useEffect, useState } from 'react';
import { TrendingUp, FileCheck, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Analysis, AnalysisResult } from '../types';

export default function StatsView() {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    aiDetected: 0,
    authentic: 0,
    averageConfidence: 0,
    byType: { image: 0, video: 0, audio: 0 },
    modelStats: [] as { name: string; aiDetected: number; total: number }[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: analyses } = await supabase
      .from('analyses')
      .select('*')
      .eq('status', 'completed');

    const { data: results } = await supabase
      .from('analysis_results')
      .select('*');

    if (analyses && results) {
      const aiDetectedCount = new Set(
        results.filter(r => r.is_ai_generated).map(r => r.analysis_id)
      ).size;

      const avgConfidence = results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length
        : 0;

      const byType = {
        image: analyses.filter(a => a.file_type === 'image').length,
        video: analyses.filter(a => a.file_type === 'video').length,
        audio: analyses.filter(a => a.file_type === 'audio').length,
      };

      const modelMap = new Map<string, { aiDetected: number; total: number }>();
      results.forEach(r => {
        const current = modelMap.get(r.model_name) || { aiDetected: 0, total: 0 };
        current.total++;
        if (r.is_ai_generated) current.aiDetected++;
        modelMap.set(r.model_name, current);
      });

      const modelStats = Array.from(modelMap.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      }));

      setStats({
        totalAnalyses: analyses.length,
        aiDetected: aiDetectedCount,
        authentic: analyses.length - aiDetectedCount,
        averageConfidence: avgConfidence,
        byType,
        modelStats,
      });
    }

    setIsLoading(false);
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
        <h2 className="text-3xl font-bold text-white mb-2">Statistics & Insights</h2>
        <p className="text-slate-300">
          Overview of all detection analyses
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-blue-400" />
            <div className="text-3xl font-bold text-blue-400">
              {stats.totalAnalyses}
            </div>
          </div>
          <div className="text-white font-medium">Total Analyses</div>
          <div className="text-slate-400 text-sm mt-1">
            All content scanned
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div className="text-3xl font-bold text-red-400">
              {stats.aiDetected}
            </div>
          </div>
          <div className="text-white font-medium">AI Detected</div>
          <div className="text-slate-400 text-sm mt-1">
            {stats.totalAnalyses > 0 ? ((stats.aiDetected / stats.totalAnalyses) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <FileCheck className="w-8 h-8 text-green-400" />
            <div className="text-3xl font-bold text-green-400">
              {stats.authentic}
            </div>
          </div>
          <div className="text-white font-medium">Authentic</div>
          <div className="text-slate-400 text-sm mt-1">
            {stats.totalAnalyses > 0 ? ((stats.authentic / stats.totalAnalyses) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
            <div className="text-3xl font-bold text-cyan-400">
              {stats.averageConfidence.toFixed(1)}%
            </div>
          </div>
          <div className="text-white font-medium">Avg. Confidence</div>
          <div className="text-slate-400 text-sm mt-1">
            Across all models
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Content Types</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Images</span>
                <span className="text-blue-400">{stats.byType.image}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${stats.totalAnalyses > 0 ? (stats.byType.image / stats.totalAnalyses) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Videos</span>
                <span className="text-green-400">{stats.byType.video}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${stats.totalAnalyses > 0 ? (stats.byType.video / stats.totalAnalyses) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Audio</span>
                <span className="text-purple-400">{stats.byType.audio}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${stats.totalAnalyses > 0 ? (stats.byType.audio / stats.totalAnalyses) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Model Performance</h3>
          <div className="space-y-4">
            {stats.modelStats.map((model) => (
              <div key={model.name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300 truncate mr-2">{model.name}</span>
                  <span className="text-slate-400">
                    {model.aiDetected}/{model.total}
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                    style={{
                      width: `${model.total > 0 ? (model.aiDetected / model.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {stats.modelStats.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">
                No model data available yet
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/20 border border-slate-700/50 rounded-xl p-8">
        <h3 className="text-xl font-bold text-white mb-4">Detection Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-slate-300 font-medium mb-2">Why Multiple Models?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Different AI detection models specialize in various aspects of content analysis.
              By combining multiple models, we achieve higher accuracy and reduce false positives.
            </p>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium mb-2">Understanding Confidence Scores</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Confidence scores indicate how certain each model is about its detection.
              Higher scores mean stronger evidence of AI-generated or authentic content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
