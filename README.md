# TruthGuard AI - Deepfake & AI Detection Platform

An advanced AI detection platform designed to identify deepfakes, AI-generated images, videos, and audio files to keep digital content truthful and society safe.

## Features

- **Multi-Model AI Detection**: Analyze content using 4+ specialized AI detection models
- **Comprehensive Analysis**: Support for images, videos, and audio files
- **Real-Time Processing**: Get instant results with detailed confidence scores
- **Model Comparison**: See how different models analyze the same content
- **Analysis History**: Track all your previous content analyses
- **Statistics Dashboard**: View insights and trends from all analyses
- **Beautiful UI**: Modern, responsive design with smooth animations

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Icons**: Lucide React
- **Build Tool**: Vite

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings.

### 3. Database Setup

The database schema has already been created with the following tables:
- `analyses` - Stores information about each content analysis
- `analysis_results` - Stores individual model results for each analysis

### 4. Edge Function

The `analyze-content` edge function has been deployed and is ready to process your content analyses.

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## How It Works

1. **Upload Content**: Drag and drop or select any image, video, or audio file
2. **Multi-Model Analysis**: The platform runs your content through multiple specialized AI detection models
3. **View Results**: Get a comprehensive report with predictions from each model, confidence scores, and an overall verdict

## Key Components

- **UploadSection**: Handles file uploads with drag-and-drop support
- **AnalysisView**: Displays real-time analysis progress and results
- **HistoryView**: Shows all previous analyses with quick access
- **StatsView**: Provides statistics and insights across all analyses
- **AboutView**: Explains the platform's mission and features

## Models Used

1. **DeepFake Detector Pro** - Specialized in detecting deepfake videos
2. **SynthImage Analyzer** - Focuses on AI-generated images
3. **MediaAuth Validator** - Validates authentic content
4. **Neural Pattern Recognition** - Advanced AI-generated content detection

## Future Enhancements

- Chrome extension for in-browser detection on social media platforms
- Integration with real AI detection APIs
- Support for bulk analysis
- Advanced filtering and search in history
- Export analysis reports

## Built For

This project was created for a hackathon with the goal of protecting digital content authenticity and keeping society safe from misinformation.

## License

MIT
