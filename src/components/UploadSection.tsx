import { useState, useCallback } from 'react';
import { Upload, FileImage, FileVideo, FileAudio, Loader2, AlertCircle } from 'lucide-react';

interface UploadSectionProps {
  onAnalysisStart: (analysisId: string) => void;
}

export default function UploadSection({ onAnalysisStart }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['image/', 'video/', 'audio/'];
    const isValid = validTypes.some(type => file.type.startsWith(type));

    if (!isValid) {
      setError('Please upload an image, video, or audio file');
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 100MB');
      return;
    }

    setFile(file);
    setError(null);
  };

  const getFileType = (mimeType: string): 'image' | 'video' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'audio';
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      // POST the file to the local detection server. The server should be
      // running separately (see README / server/index.js). It will call
      // RealityDefender with the API key from the .env on the server side.
      const form = new FormData();
      form.append('file', file, file.name);

      const resp = await fetch(import.meta.env.VITE_RD_DETECT_URL || 'http://localhost:4000/detect', {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Server error: ${resp.status} ${body}`);
      }

      const result = await resp.json();
      setResult(result);

      // The server returns an object like the shape you provided. Use the
      // server's requestId as the local analysis id for tracking in the UI.
      if (result && result.requestId) {
        onAnalysisStart(result.requestId);
      }

      // Show results in console and optionally turn into UI state (not
      // persisted anywhere since Supabase is removed).
      console.log('Detection result:', result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-slate-400" />;
    const type = getFileType(file.type);
    if (type === 'image') return <FileImage className="w-12 h-12 text-blue-400" />;
    if (type === 'video') return <FileVideo className="w-12 h-12 text-green-400" />;
    return <FileAudio className="w-12 h-12 text-purple-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Detect AI-Generated Content</h2>
        <p className="text-slate-300 text-lg">
          Upload images, videos, or audio files to analyze with multiple AI detection models
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          {getFileIcon()}

          {file ? (
            <div className="text-center">
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white text-lg font-medium">
                Drag and drop your file here
              </p>
              <p className="text-slate-400 mt-1">
                or click to browse
              </p>
            </div>
          )}

          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex gap-4 mt-4">
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              <FileImage className="w-4 h-4" />
              <span>Images</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              <FileVideo className="w-4 h-4" />
              <span>Videos</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              <FileAudio className="w-4 h-4" />
              <span>Audio</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {file && (
        <button
          onClick={handleAnalyze}
          disabled={isUploading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/50 disabled:shadow-none flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Analyze with AI Detection Models</span>
            </>
          )}
        </button>
      )}

      {/* Detection result panel */}
      {result && (
        <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-300">Request ID</div>
              <div className="text-xs text-white/80 break-all">{result.requestId}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-300">Overall</div>
              <div className="text-lg font-semibold text-white">{result.status || 'Unknown'}</div>
              <div className="text-sm text-slate-400">Score: {(result.score ?? 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-sm text-slate-300 mb-2">Model breakdown</div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {Array.isArray(result.models) && result.models.map((m: any) => (
                <div key={m.name} className="flex items-center justify-between rounded-md p-2 bg-white/2">
                  <div>
                    <div className="text-sm text-white">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.status}</div>
                  </div>
                  <div className="text-sm font-mono text-white">{(m.score ?? 0).toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="text-blue-400 text-3xl font-bold mb-2">4+</div>
          <div className="text-white font-medium">AI Models</div>
          <div className="text-slate-400 text-sm mt-1">
            Multiple detection algorithms working together
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="text-cyan-400 text-3xl font-bold mb-2">95%</div>
          <div className="text-white font-medium">Accuracy</div>
          <div className="text-slate-400 text-sm mt-1">
            High precision deepfake detection
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="text-green-400 text-3xl font-bold mb-2">Fast</div>
          <div className="text-white font-medium">Analysis</div>
          <div className="text-slate-400 text-sm mt-1">
            Results in seconds with detailed insights
          </div>
        </div>
      </div>
    </div>
  );
}
