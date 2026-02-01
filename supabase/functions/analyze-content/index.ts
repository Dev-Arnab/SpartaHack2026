import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisRequest {
  analysisId: string;
  fileUrl: string;
  fileType: string;
}

interface ModelResult {
  modelName: string;
  modelVersion: string;
  isAiGenerated: boolean;
  confidenceScore: number;
  detectionType: string;
  processingTime: number;
  metadata: Record<string, unknown>;
}

const AI_MODELS = [
  {
    name: "DeepFake Detector Pro",
    version: "v2.1",
    specialty: "deepfake",
  },
  {
    name: "SynthImage Analyzer",
    version: "v1.8",
    specialty: "ai_generated",
  },
  {
    name: "MediaAuth Validator",
    version: "v3.0",
    specialty: "authentic",
  },
  {
    name: "Neural Pattern Recognition",
    version: "v2.5",
    specialty: "ai_generated",
  },
];

function simulateModelAnalysis(
  modelInfo: typeof AI_MODELS[0],
  fileType: string
): ModelResult {
  const randomConfidence = Math.random() * 40 + 60;
  const isAiGenerated = Math.random() > 0.5;

  const detectionType = isAiGenerated
    ? modelInfo.specialty === "deepfake"
      ? "deepfake"
      : "ai_generated"
    : "authentic";

  const processingTime = Math.random() * 2000 + 500;

  const metadata: Record<string, unknown> = {
    fileType,
    algorithmUsed: modelInfo.specialty,
    analysisTimestamp: new Date().toISOString(),
  };

  if (isAiGenerated) {
    metadata.detectedArtifacts = [
      "Inconsistent lighting patterns",
      "Unnatural facial symmetry",
      "Digital artifacts in high-frequency areas",
    ].slice(0, Math.floor(Math.random() * 3) + 1);
  } else {
    metadata.authenticityMarkers = [
      "Natural noise patterns",
      "Consistent EXIF data",
      "Organic compression artifacts",
    ].slice(0, Math.floor(Math.random() * 3) + 1);
  }

  return {
    modelName: modelInfo.name,
    modelVersion: modelInfo.version,
    isAiGenerated,
    confidenceScore: Math.round(randomConfidence * 100) / 100,
    detectionType,
    processingTime: Math.round(processingTime),
    metadata,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { analysisId, fileUrl, fileType }: AnalysisRequest = await req.json();

    if (!analysisId || !fileUrl || !fileType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("analyses")
      .update({ status: "processing" })
      .eq("id", analysisId);

    const results: ModelResult[] = [];

    for (const model of AI_MODELS) {
      const result = simulateModelAnalysis(model, fileType);
      results.push(result);

      await supabase.from("analysis_results").insert({
        analysis_id: analysisId,
        model_name: result.modelName,
        model_version: result.modelVersion,
        is_ai_generated: result.isAiGenerated,
        confidence_score: result.confidenceScore,
        detection_type: result.detectionType,
        metadata: result.metadata,
      });

      await new Promise((resolve) => setTimeout(resolve, result.processingTime));
    }

    await supabase
      .from("analyses")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", analysisId);

    const aiGeneratedCount = results.filter((r) => r.isAiGenerated).length;
    const averageConfidence =
      results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length;

    return new Response(
      JSON.stringify({
        success: true,
        analysisId,
        summary: {
          totalModels: results.length,
          aiGeneratedCount,
          authenticCount: results.length - aiGeneratedCount,
          averageConfidence: Math.round(averageConfidence * 100) / 100,
          overallVerdict:
            aiGeneratedCount > results.length / 2
              ? "Likely AI Generated"
              : "Likely Authentic",
        },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Analysis error:", error);

    return new Response(
      JSON.stringify({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
