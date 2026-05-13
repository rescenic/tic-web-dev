import { OpenRouter } from "@openrouter/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. OpenRouter Configuration (Fallback & Main Plan)
const openRouterKey = process.env.OPENROUTER_API_KEY;
export const ai = new OpenRouter({
  apiKey: openRouterKey || "missing-key",
});

// 2. Google Gemini Configuration (Primary for Regeneration)
const geminiKey = process.env.GEMINI_API_KEY;
export const genAI = new GoogleGenerativeAI(geminiKey || "missing-key");

/**
 * Helper to generate text with fallback from OpenRouter to Gemini
 */
export async function generateContent(prompt: string): Promise<string> {
  // Try OpenRouter first
  try {
    const completion = await ai.chat.send({
      chatRequest: {
        model: "inclusionai/ring-2.6-1t:free",
        messages: [{ role: "user", content: prompt }],
      }
    });
    
    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned an empty response.");
    }
    return content;
  } catch (openRouterError: unknown) {
    const errorMessage = openRouterError instanceof Error ? openRouterError.message : String(openRouterError)
    console.warn("OpenRouter error occurred, falling back to Gemini:", errorMessage);
    
    // Fallback to Gemini
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (geminiError: unknown) {
      const finalError = geminiError instanceof Error ? geminiError.message : String(geminiError)
      console.error("Both AI providers failed:", finalError);
      throw new Error("All AI providers are currently unavailable.");
    }
  }
}