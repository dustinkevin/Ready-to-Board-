import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required by skill guidelines
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface FeedbackRequest {
  spokenText: string;
  targetSentence: string;
  koreanMeaning: string;
  partnerText: string;
  attemptNumber: number; // 1, 2, 3+
  isSuccess: boolean;
  missingKeywords: string[];
  missingMinorWords: string[];
  turnIndex: number;
}

// Fallback generator adhering strictly to Section 7 rules
function getSection7Fallback(body: FeedbackRequest): string {
  const { spokenText, targetSentence, attemptNumber, isSuccess, missingMinorWords, missingKeywords } = body;

  if (!spokenText || spokenText.trim().length === 0) {
    return "That's okay! Tap the mic and try speaking again. (괜찮아요! 마이크를 누르고 다시 말해 보세요.)";
  }

  if (isSuccess) {
    if (missingMinorWords && missingMinorWords.length > 0) {
      const w = missingMinorWords[0];
      return `Nice work! I understood you, but try adding "${w}." (잘 전달했어요! '${w}'를 넣으면 더 자연스러워요.)`;
    }
    return "Great job! I understood you clearly. (말한 내용을 잘 이해했어요!)";
  }

  // Failures by attempt count:
  if (attemptNumber <= 1) {
    // 1st failure -> Recast
    return `Good try! You can say, "${targetSentence}" (좋은 시도예요! 이렇게 말해 보세요.)`;
  } else if (attemptNumber === 2) {
    // 2nd failure -> Elicitation (first-letter hint)
    // Find missing keyword or first target word
    const key = missingKeywords[0] || targetSentence.split(' ')[1] || 'word';
    const firstLetter = key.charAt(0);
    const masked = targetSentence.replace(new RegExp(`\\b${key}\\b`, 'i'), `${firstLetter}___`);
    return `Almost there! "${masked}" (거의 다 왔어요! 빠진 단어는 ${firstLetter}로 시작해요.)`;
  } else {
    // 3rd failure -> Chunking
    const words = targetSentence.split(' ');
    const mid = Math.ceil(words.length / 2);
    const chunk1 = words.slice(0, mid).join(' ');
    const chunk2 = words.slice(mid).join(' ');
    return `Keep going! Say "${chunk1}" → "${chunk2}". (잘하고 있어요! 짧게 나누어 말해 보세요.)`;
  }
}

// API endpoint for Emma's contextual feedback
app.post('/api/feedback', async (req, res) => {
  const body: FeedbackRequest = req.body;
  const fallback = getSection7Fallback(body);

  if (!ai || !process.env.GEMINI_API_KEY) {
    return res.json({ feedback: fallback, isAiGenerated: false });
  }

  try {
    const prompt = `You are Emma, a friendly and patient airport check-in counter agent.
Target user: Korean middle school 1st-2nd year students (CEFR A1-A2). They are nervous and afraid of making mistakes.
The student is practicing checking in at your airport counter.

Current Situation:
- Airport Clerk (You) said: "${body.partnerText}"
- Target passenger sentence: "${body.targetSentence}" (${body.koreanMeaning})
- What student actually said: "${body.spokenText || '(Nothing heard)'}"
- Attempt number for this turn: ${body.attemptNumber}
- Is evaluated as success (all key words present): ${body.isSuccess}
- Missing key words: ${JSON.stringify(body.missingKeywords || [])}
- Missing minor words: ${JSON.stringify(body.missingMinorWords || [])}

FEEDBACK RULES (MUST FOLLOW STRICTLY):
1. Keep feedback within 2 short sentences.
2. Format: Simple English sentence + Korean explanation in parentheses (영어 문장 + 괄호 안 한국어 설명).
3. Personality: Warm, friendly, patient Emma. Praise first, give only 1 suggestion at a time.
4. Attempt-specific rules:
   - If success: "Great job! I understood you clearly. (말한 내용을 잘 이해했어요!)" or if minor word missing: "Nice work! I understood you, but try adding '[missing word]'. (잘 전달했어요! '[missing word]'를 넣으면 더 자연스러워요.)"
   - If 1st failure: Recast -> Encourage and model the sentence: "Good try! You can say, '${body.targetSentence}' (좋은 시도예요! 이렇게 말해 보세요.)"
   - If 2nd failure: Elicitation -> First letter hint: "Almost there! '...' (거의 다 왔어요! 빠진 단어는 [알파벳]로 시작해요.)"
   - If 3rd failure: Chunking -> Break sentence into 2 small chunks: "Keep going! Say '[chunk 1]' → '[chunk 2]'. (잘하고 있어요! 짧게 나누어 말해 보세요.)"
   - If no speech: "That's okay! Tap the mic and try speaking again. (괜찮아요! 마이크를 누르고 다시 말해 보세요.)"
5. NEVER use negative words like "wrong" or "bad". No numeric scores. Never judge based on accent.
Return ONLY the feedback string in this exact format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are Emma, an encouraging airport check-in clerk helping Korean middle school students practice English speaking.',
        temperature: 0.3,
      },
    });

    const text = response.text?.trim();
    if (text && text.length > 5) {
      return res.json({ feedback: text, isAiGenerated: true });
    }
    return res.json({ feedback: fallback, isAiGenerated: false });
  } catch (error) {
    console.error('Error generating feedback with Gemini:', error);
    return res.json({ feedback: fallback, isAiGenerated: false });
  }
});

// In-memory audio cache for zero-latency mobile playback
const ttsCache = new Map<string, { buffer: Buffer; mimeType: string }>();

const ALL_DIALOGUE_SENTENCES = [
  'Hello! Welcome to Skyline Airways. Where are you traveling today?',
  'I am flying to London for my vacation.',
  'May I please see your passport and flight booking?',
  'Sure, here are my passport and ticket.',
  'Would you prefer a window seat or an aisle seat?',
  'I would like a window seat, please.',
  'Do you have any bags to check in today?',
  'Yes, I have one suitcase to check in.',
  'You can take one carry-on bag. Do you have any questions before boarding?',
  'What time does boarding start for this flight?',
  'Boarding begins at 1:50 PM at Gate 42. Here is your boarding pass. Have a wonderful flight!',
  'Thank you so much for your kind help!',
];

// Helper to generate high-quality audio using Gemini 3.8 Flash Lite TTS
async function fetchTtsAudio(text: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // 1. Try Gemini TTS with natural Kore voice
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text,
                speechMetadata: {
                  style: 'Warm, clear, natural airport check-in ground staff speaking in fluent American English',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return {
          buffer: Buffer.from(base64Audio, 'base64'),
          mimeType: 'audio/wav',
        };
      }
    } catch (e: any) {
      console.warn('Gemini TTS fallback needed:', e?.message || e);
    }
  }

  // 2. Fallback to Google Translate TTS if Gemini is unavailable
  const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
  const ttsRes = await fetch(fallbackUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!ttsRes.ok) {
    throw new Error('TTS upstream request failed');
  }

  const arrayBuf = await ttsRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuf),
    mimeType: 'audio/mpeg',
  };
}

// Background preloader for dialogue lines to achieve instant 0ms playback
async function preloadDialogueAudio() {
  console.log('Preloading dialogue audio files for mobile instant playback...');
  for (const sentence of ALL_DIALOGUE_SENTENCES) {
    if (!ttsCache.has(sentence)) {
      try {
        const item = await fetchTtsAudio(sentence);
        ttsCache.set(sentence, item);
      } catch (err) {
        console.warn('Failed to pre-cache sentence:', sentence);
      }
    }
  }
  console.log(`Preloaded ${ttsCache.size} audio sentences into cache.`);
}

// Audio TTS proxy for reliable mobile (iOS Safari & Android) playback
app.get('/api/tts', async (req, res) => {
  try {
    const rawText = String(req.query.text || '').trim();
    if (!rawText) {
      return res.status(400).send('Text required');
    }

    let item = ttsCache.get(rawText);
    if (!item) {
      item = await fetchTtsAudio(rawText);
      ttsCache.set(rawText, item);
    }

    const { buffer: audioBuffer, mimeType } = item;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const range = req.headers.range;
    if (range) {
      const total = audioBuffer.length;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', end - start + 1);
      return res.send(audioBuffer.subarray(start, end + 1));
    }

    res.setHeader('Content-Length', audioBuffer.length);
    return res.send(audioBuffer);
  } catch (err: any) {
    console.error('TTS endpoint error:', err);
    return res.status(500).send(err?.message || 'TTS Error');
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || !fs.existsSync(path.resolve('.', 'vite.config.ts'));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('.', 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('.', 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ready to Board! app running on http://localhost:${PORT}`);
    // Warm up and pre-cache dialogue audio for instantaneous mobile playback
    preloadDialogueAudio().catch((err) => console.warn('Preload audio error:', err));
  });
}

startServer();
