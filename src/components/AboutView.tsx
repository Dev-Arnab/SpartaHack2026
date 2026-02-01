import { Shield, Eye, Target, Zap, Users, Lock } from 'lucide-react';

export default function AboutView() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white mb-3">TruthGuard AI</h2>
        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
          An advanced AI detection platform designed to identify deepfakes, AI-generated images,
          videos, and audio files to keep digital content truthful and society safe.
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
        <p className="text-slate-300 text-lg leading-relaxed">
          In an era where AI-generated content is becoming increasingly sophisticated,
          TruthGuard AI stands as a guardian of digital authenticity. We combine multiple
          state-of-the-art detection models to provide comprehensive analysis of media content,
          helping individuals, organizations, and platforms maintain trust and authenticity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
            <Eye className="w-6 h-6 text-blue-400" />
          </div>
          <h4 className="text-white font-semibold text-lg mb-2">Multi-Model Analysis</h4>
          <p className="text-slate-400 text-sm">
            We use 4+ specialized AI detection models, each focusing on different aspects
            of content authenticity to provide comprehensive analysis.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-green-400" />
          </div>
          <h4 className="text-white font-semibold text-lg mb-2">High Accuracy</h4>
          <p className="text-slate-400 text-sm">
            Our ensemble approach combines insights from multiple models to achieve
            industry-leading accuracy in deepfake and AI-generated content detection.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
          <h4 className="text-white font-semibold text-lg mb-2">Real-Time Processing</h4>
          <p className="text-slate-400 text-sm">
            Get instant results with our optimized analysis pipeline that processes
            multiple models in parallel for fast, reliable detection.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <h4 className="text-white font-semibold text-lg mb-2">For Everyone</h4>
          <p className="text-slate-400 text-sm">
            From journalists to social media users, our platform is designed to be
            accessible and useful for anyone concerned about content authenticity.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
          <h4 className="text-white font-semibold text-lg mb-2">Privacy First</h4>
          <p className="text-slate-400 text-sm">
            Your uploaded content is processed securely and not stored permanently.
            We prioritize your privacy and data security above all else.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-orange-400" />
          </div>
          <h4 className="text-white font-semibold text-lg mb-2">Protecting Society</h4>
          <p className="text-slate-400 text-sm">
            Our ultimate goal is to combat misinformation and protect society from
            the harmful effects of deceptive AI-generated content.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
        <h3 className="text-2xl font-bold text-white mb-4">How It Works</h3>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Upload Your Content</h4>
              <p className="text-slate-400 text-sm">
                Simply drag and drop or select any image, video, or audio file you want to analyze.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Multi-Model Analysis</h4>
              <p className="text-slate-400 text-sm">
                Our platform runs your content through multiple specialized AI detection models,
                each examining different aspects of authenticity.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Get Detailed Results</h4>
              <p className="text-slate-400 text-sm">
                Receive a comprehensive report showing predictions from each model, confidence scores,
                detected artifacts, and an overall verdict on content authenticity.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/20 border border-slate-700/50 rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-3">Chrome Extension Coming Soon</h3>
        <p className="text-slate-300 max-w-2xl mx-auto">
          We are developing a Chrome extension that will allow you to detect AI-generated
          content directly while browsing social media platforms like Facebook, Instagram,
          and Twitter. Stay tuned for updates!
        </p>
      </div>

      <div className="text-center py-8">
        <p className="text-slate-400">
          Built with passion for the hackathon community
        </p>
        <p className="text-slate-500 text-sm mt-2">
          TruthGuard AI - Fighting misinformation, one detection at a time
        </p>
      </div>
    </div>
  );
}
