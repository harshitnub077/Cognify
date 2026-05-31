// Real-Time Streaming Pipeline (Phase 7)
import { semanticClassify } from '../services/semanticClassifier.js';
import { enrichVideoMetadata } from '../services/youtubeEnricher.js';
import { classifyWithAgent } from '../agents/classificationAgent.js';
import { analyzeThumbnail } from '../agents/visionAgent.js';
import { computeFinalVerdict } from '../services/scoreFusion.js';

export async function setupWebSocketServer(server) {
  try {
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({ server, path: '/classify-stream' });

    console.log('[WebSocket] Streaming server ready on /classify-stream');

    wss.on('connection', (ws) => {
      console.log('[WebSocket] Client connected');

      ws.on('message', async (data) => {
        try {
          const { type, video, profileId, profileSnapshot } = JSON.parse(data);
          
          if (type === 'CLASSIFY') {
            // Process the classification exactly like the POST route, but stream result back
            const enrichedMeta = await enrichVideoMetadata(video.videoId);
            const fullMeta = enrichedMeta ? { ...video, ...enrichedMeta } : video;

            // 1. Semantic Fast Fail
            const semanticResult = await semanticClassify(fullMeta, profileSnapshot);
            if (semanticResult) {
              ws.send(JSON.stringify({ videoId: video.videoId, ...semanticResult }));
              return;
            }

            // 2. Full AI Analysis
            const [llmResult, visionResult] = await Promise.all([
              classifyWithAgent(fullMeta, profileSnapshot),
              analyzeThumbnail(fullMeta.thumbnailUrl)
            ]);

            const fusionResult = computeFinalVerdict({
              semantic: { score: 0.5 },
              llm: llmResult,
              vision: visionResult,
              ytCategory: fullMeta.category,
              channelTrust: 50
            });

            ws.send(JSON.stringify({ 
              videoId: video.videoId, 
              verdict: fusionResult.verdict, 
              confidence: fusionResult.confidence, 
              reason: 'Streamed classification'
            }));
          }
        } catch (err) {
          console.error('[WebSocket] Processing Error:', err);
        }
      });
    });
  } catch (e) {
    console.warn('[WebSocket] "ws" module not installed. Streaming pipeline skipped. Run `npm install ws` to enable Phase 7.');
  }
}
