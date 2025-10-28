import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import { authRoutes } from "./src/auth/authRoutes.js";
import { courseRoutes } from "./src/moduls/course/courseRoutes.js";

// Connect to MongoDB
connectDB();

const app = express();
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);//course routes
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

const API_KEY = process.env.NEBIUS_API_KEY;

const client = new OpenAI({
  baseURL: "https://api.studio.nebius.com/v1/",
  apiKey: API_KEY,
});

// Code explanation endpoint
app.post("/api/explain-code", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const messages = [
      {
        role: "user",
        content: `Please explain this ${
          language || ""
        } code in simple terms:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
      },
    ];

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.3,
      max_tokens: 800,
    });

    const explanation = response?.choices[0]?.message?.content;
    if (!explanation) {
      return res.status(500).json({ error: "Failed to explain code" });
    }

    res.json({ explanation, language: language || "unknown" });
  } catch (err) {
    console.error("Code Explain API Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});
//ask ai to help 
// app.post("/api/ask-ai-help", async (req, res) => {
//   try {
//     const { problemDescription, language, hints,code } = req.body;

//     if (!problemDescription) {
//       return res.status(400).json({ error: "Problem description is required" });
//     }

//     // Prepare messages for AI
//     const messages = [
//       {
//         role: "user",
//         content: `I am stuck on a coding problem${
//           language ? ` in ${language}` : ""
//         }.\n\nProblem description:\n${problemDescription}${
//           hints ? `\nHints or constraints:\n${hints}` : ""
//         }\n\nPlease provide step-by-step guidance or a hint to help me solve it, without giving the full solution directly.`,
//       },
//     ];

//     // Call AI model
//     const response = await client.chat.completions.create({
//       model: "openai/gpt-oss-120b",
//       messages,
//       temperature: 0.4, // slightly more creative for hints
//       max_tokens: 800,
//     });

//     const guidance = response?.choices[0]?.message?.content;
//     if (!guidance) {
//       return res.status(500).json({ error: "Failed to get guidance from AI" });
//     }

//     res.json({ guidance, language: language || "unknown" });
//   } catch (err) {
//     console.error("Ask AI Help API Error:", err);
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// });
app.post("/api/ai-assist", async (req, res) => {
  try {
    const { code, challenge, useCase, language  } = req.body;

    if (!code || !challenge) {
      return res.status(400).json({ error: "Code and challenge are required." });
    }

    const systemPrompt = `You are an expert programming tutor helping students learn ${language}. 
Be encouraging, clear, and educational. Keep responses concise (under 200 words).
Never give complete solutions — guide students to discover answers themselves.`;

    const userPrompts = {
      hint: `I'm learning ${language} and working on: "${challenge}".

My current code:
\`\`\`${language}
${code}
\`\`\`

Give me a helpful hint to move forward (not the complete solution). Focus on:
1. What I should think about next
2. A small step to try
3. A programming concept to remember`,

      debug: `I'm stuck on this ${language} code for "${challenge}":

\`\`\`${language}
${code}
\`\`\`

Help me debug this. Tell me:
1. What error or issue you see
2. Why it's happening
3. How to fix it (general guidance, not exact code)`,

      explain: `Explain the programming concept of "${challenge}" in ${language}.

Context - here's what I'm working with:
\`\`\`${language}
${code}
\`\`\`

Make it beginner-friendly with:
1. What this concept does
2. Why it's useful
3. A simple analogy or example`,
    };

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompts[useCase] || userPrompts.hint },
    ];

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response?.choices?.[0]?.message?.content?.trim();
    if (!aiResponse) {
      return res.status(500).json({ error: "Failed to generate AI response." });
    }

    const emoji = { hint: "💡", debug: "🔍", explain: "📚" };
    const formattedResponse = `${emoji[useCase] || "🤖"} **AI ${
      useCase.charAt(0).toUpperCase() + useCase.slice(1)
    }**:\n\n${aiResponse}`;

    res.json({
      message: formattedResponse,
      useCase,
      language,
    });
  } catch (error) {
    console.error("AI Assist API Error:", error);
    res.status(500).json({
      error: "Server error while generating AI assistance",
      details: error.message,
    });
  }
});
//--------------------------------------

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    hasApiKey: !!API_KEY,
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Enhanced API server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API Key configured: ${!!API_KEY}`);
});