import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: "Extract the exact title and full description from this YouTube video: https://www.youtube.com/watch?v=jNQXAC9IVRw",
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  console.log(response.text);
}
test();
