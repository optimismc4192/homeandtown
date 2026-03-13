import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "Search for 8 recent (2025-2026) YouTube videos about '전원주택 분양' or '타운하우스 분양' in South Korea. Return a JSON array of objects matching this interface: { id: number, title: string, youtubeId: string (11 chars), thumbnail: string (https://img.youtube.com/vi/{youtubeId}/maxresdefault.jpg), priceStr: string, priceNum: number (in ten thousands, e.g. 65000 for 6.5억), landArea: string, buildArea: string, heating: string, parking: string, yard: string, location: string, coords: { x: number, y: number }, type: '분양' | '매매', tags: string[], description: string, curation: string[] }. Ensure the youtubeId is a real valid YouTube video ID of a Korean real estate video. Make the data realistic.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });
    
    fs.writeFileSync('generated_properties.json', response.text);
    console.log("Successfully generated properties.");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
