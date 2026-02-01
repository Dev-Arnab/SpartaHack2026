export interface Analysis {
  id: string;
  user_id?: string;
  file_name: string;
  file_type: 'image' | 'video' | 'audio';
  file_url: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface AnalysisResult {
  id: string;
  analysis_id: string;
  model_name: string;
  model_version: string;
  is_ai_generated: boolean;
  confidence_score: number;
  detection_type: 'deepfake' | 'ai_generated' | 'authentic' | 'uncertain';
  metadata: {
    fileType?: string;
    algorithmUsed?: string;
    analysisTimestamp?: string;
    detectedArtifacts?: string[];
    authenticityMarkers?: string[];
    [key: string]: unknown;
  };
  created_at: string;
}

export interface AnalysisSummary {
  totalModels: number;
  aiGeneratedCount: number;
  authenticCount: number;
  averageConfidence: number;
  overallVerdict: string;
}
