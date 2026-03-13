export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
    }

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
    if (dataMatch && dataMatch[1]) {
      try {
        const ytData = JSON.parse(dataMatch[1]);
        const videoDetails = ytData.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer;
        const secondaryDetails = ytData.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer;
        
        if (videoDetails?.title?.runs?.[0]?.text) {
          title = videoDetails.title.runs[0].text;
        }
        
        if (secondaryDetails?.description?.runs) {
          description = secondaryDetails.description.runs.map((r: any) => r.text).join('');
        } else if (secondaryDetails?.attributedDescription?.content) {
          description = secondaryDetails.attributedDescription.content;
        }
      } catch (e) {
        console.error('Error parsing ytInitialData:', e);
      }
    }

    if (!title) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(' - YouTube', '').trim();
      }
    }

    if (!description) {
      const descMatch = html.match(/<meta name="description" content="(.*?)">/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      }
    }

    if (!title && !description) {
      return new Response(JSON.stringify({ error: 'Could not extract video information' }), { status: 404 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('API key is missing');
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
    다음은 부동산 매물 소개 유튜브 영상의 제목과 설명입니다.
    이 정보에서 부동산 매물 정보를 추출하여 JSON 형식으로 반환해주세요.
    
    제목: ${title}
    설명: ${description}
    
    다음 형식의 JSON으로만 응답해주세요. 마크다운 백틱(\`\`\`) 없이 순수 JSON 문자열만 반환해야 합니다.
    {
      "title": "매물명 (제목에서 추출)",
      "priceStr": "가격 (예: 6억 3,290만)",
      "priceNum": 63290, // 가격을 만원 단위 숫자로 변환
      "landArea": "대지 면적 (예: 대지 48평)",
      "buildArea": "건축 면적 (예: 실사용 70평)",
      "heating": "난방 방식 (예: 도시가스, LPG, 지열보일러 등)",
      "parking": "주차장 (예: 벙커주차장 2대)",
      "yard": "특화 공간 (예: 프라이빗 테라스, 잔디마당)",
      "location": "현장 주소 (예: 경기도 파주시 와동동)",
      "majorRegion": "대분류 지역 (서울, 경기, 인천 등)",
      "minorRegion": "하위분류 지역 (파주시, 일산동구 등)",
      "type": "분양 또는 매매",
      "tags": "해시태그 쉼표로 구분 (예: 운정신도시, 호수공원뷰)",
      "description": "상세 설명 (줄바꿈은 \\n으로 처리)"
    }
    
    정보가 없는 항목은 빈 문자열("") 또는 0으로 처리해주세요.
    `;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    let jsonStr = aiResponse.text || '{}';
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Gemini response:', jsonStr);
      parsedData = {
        title,
        description,
        priceStr: '',
        priceNum: 0,
        landArea: '',
        buildArea: '',
        heating: '',
        parking: '',
        yard: '',
        location: '',
        majorRegion: '',
        minorRegion: '',
        type: '',
        tags: ''
      };
    }

    return new Response(JSON.stringify({ data: parsedData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to parse YouTube URL', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
