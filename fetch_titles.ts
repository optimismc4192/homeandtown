import fs from 'fs';

const urls = [
  "https://www.youtube.com/watch?v=PLb-1CgsL6U",
  "https://www.youtube.com/watch?v=sC86S4qtuz8",
  "https://www.youtube.com/watch?v=kNM7aHXH4GU",
  "https://www.youtube.com/watch?v=PsULxq0zhoc",
  "https://www.youtube.com/watch?v=kNekttwGbEI",
  "https://www.youtube.com/watch?v=qAkgrf9ngFg",
  "https://www.youtube.com/watch?v=2wAB2-4kAv4",
  "https://www.youtube.com/watch?v=tt6gvxptepY",
  "https://www.youtube.com/watch?v=0GOom7zNfsw",
  "https://www.youtube.com/watch?v=CLmw0eJGuOk",
  "https://www.youtube.com/watch?v=wKQM7aTmoRQ",
  "https://www.youtube.com/watch?v=Q3KR9yMeHMQ",
  "https://www.youtube.com/watch?v=Jch2AeknWV4",
  "https://www.youtube.com/watch?v=qhMPWgw6zsI",
  "https://www.youtube.com/watch?v=lTO6nEda7ok",
  "https://www.youtube.com/watch?v=JHfdOjAl6h0"
];

const prices = [65000, 85000, 120000, 55000, 95000, 150000, 72000, 48000];
const priceStrs = ["6억 5,000만", "8억 5,000만", "12억", "5억 5,000만", "9억 5,000만", "15억", "7억 2,000만", "4억 8,000만"];
const locations = ["경기도 파주시", "경기도 양평군", "경기도 용인시", "경기도 가평군", "제주특별자치도", "경기도 광주시"];
const regions = ["파주", "양평", "용인", "가평", "제주", "광주"];

async function generate() {
  const properties = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const idMatch = url.match(/v=([^&]+)/);
    const id = idMatch ? idMatch[1] : '';
    
    let title = `Property ${i+1}`;
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${url}&format=json`);
      if (res.ok) {
        const data = await res.json();
        title = data.title;
      }
    } catch (e) {
      console.error(e);
    }

    const priceIdx = i % prices.length;
    const locIdx = i % locations.length;
    const landAreaNum = 100 + (i * 10);
    const buildAreaNum = 40 + (i * 5);
    const floors = (i % 3) + 1;

    properties.push({
      id: i + 1,
      title: title,
      youtubeId: id,
      thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      priceStr: priceStrs[priceIdx],
      priceNum: prices[priceIdx],
      landArea: `대지 ${landAreaNum}평`,
      buildArea: `실사용 ${buildAreaNum}평`,
      landAreaNum: landAreaNum,
      buildAreaNum: buildAreaNum,
      floors: floors,
      heating: i % 2 === 0 ? "도시가스" : "LPG",
      parking: `주차 ${(i % 3) + 1}대`,
      yard: "잔디마당",
      location: locations[locIdx],
      region: regions[locIdx],
      coords: { x: 37.5 + (Math.random() * 0.5 - 0.25), y: 127.0 + (Math.random() * 0.5 - 0.25) },
      type: "분양",
      tags: ["전원주택", "타운하우스", "신축"],
      description: title + "\n\n자세한 내용은 영상을 통해 확인해주세요.",
      curation: i < 6 ? ["주목받는 프리미엄 분양 현장"] : (i < 12 ? ["자연을 품은 넓은 마당"] : [])
    });
  }

  const fileContent = `import { Property } from "../types";\n\nexport const mockProperties: Property[] = ${JSON.stringify(properties, null, 2)};\n`;
  fs.writeFileSync('src/data/mockProperties.ts', fileContent);
  console.log('Done!');
}
generate();
