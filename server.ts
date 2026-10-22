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
  });
}

startServer();

