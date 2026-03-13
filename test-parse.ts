import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  const html = await response.text();
  
  let title = '';
  let description = '';
  
  const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
  if (dataMatch) {
    const data = JSON.parse(dataMatch[1]);
    const contents = data.contents?.twoColumnWatchNextResults?.results?.results?.contents;
    if (contents) {
      for (const content of contents) {
        if (content.videoPrimaryInfoRenderer) {
          title = content.videoPrimaryInfoRenderer.title?.runs?.[0]?.text || title;
        }
        if (content.videoSecondaryInfoRenderer) {
          description = content.videoSecondaryInfoRenderer.attributedDescription?.content || 
                        content.videoSecondaryInfoRenderer.description?.runs?.map((r: any) => r.text).join('') || 
                        description;
        }
      }
    }
  }
  
  if (!title) {
    const titleMatch = html.match(/<meta property="og:title" content="(.*?)">/);
    if (titleMatch) title = titleMatch[1];
  }
  if (!description) {
    const descMatch = html.match(/<meta property="og:description" content="(.*?)">/);
    if (descMatch) description = descMatch[1];
  }
  
  console.log("Title:", title);
  console.log("Desc:", description.substring(0, 100));
}
test();
