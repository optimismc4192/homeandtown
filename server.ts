import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { mockProperties } from './src/data/mockProperties';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Initialize Database
const db = new Database('database.sqlite');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    youtubeId TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    priceStr TEXT NOT NULL,
    priceNum INTEGER NOT NULL,
    landArea TEXT NOT NULL,
    buildArea TEXT NOT NULL,
    landAreaNum INTEGER NOT NULL,
    buildAreaNum INTEGER NOT NULL,
    floors INTEGER NOT NULL,
    heating TEXT NOT NULL,
    parking TEXT NOT NULL,
    yard TEXT NOT NULL,
    location TEXT NOT NULL,
    region TEXT NOT NULL,
    coords TEXT NOT NULL,
    type TEXT NOT NULL,
    tags TEXT NOT NULL,
    description TEXT NOT NULL,
    curation TEXT,
    isPopular INTEGER DEFAULT 0,
    images TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propertyId INTEGER NOT NULL,
    propertyTitle TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '대기중'
  );
`);

try {
  db.exec(`ALTER TABLE properties ADD COLUMN contact TEXT`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE properties ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE properties ADD COLUMN images TEXT DEFAULT '[]'`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE properties ADD COLUMN isClosingSoon INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE reservations ADD COLUMN time TEXT`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE reservations ADD COLUMN message TEXT`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE properties ADD COLUMN overviewImages TEXT DEFAULT '[]'`);
} catch (e) {
  // Column already exists
}

// Seed initial data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO properties (
      title, youtubeId, thumbnail, priceStr, priceNum, landArea, buildArea, 
      landAreaNum, buildAreaNum, floors, heating, parking, yard, location, region, 
      coords, type, tags, description, curation, isPopular, status, images
    ) VALUES (
      @title, @youtubeId, @thumbnail, @priceStr, @priceNum, @landArea, @buildArea, 
      @landAreaNum, @buildAreaNum, @floors, @heating, @parking, @yard, @location, @region, 
      @coords, @type, @tags, @description, @curation, @isPopular, @status, @images
    )
  `);

  const insertMany = db.transaction((props) => {
    for (const p of props) {
      insert.run({
        ...p,
        coords: JSON.stringify(p.coords),
        tags: JSON.stringify(p.tags),
        curation: p.curation ? JSON.stringify(p.curation) : null,
        isPopular: p.isPopular ? 1 : 0,
        status: 'approved',
        images: p.images ? JSON.stringify(p.images) : '[]'
      });
    }
  });

  insertMany(mockProperties);
  console.log('Database seeded with mock properties.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // --- API Routes ---

  // Upload
  app.post('/api/upload', (req, res, next) => {
    upload.array('images', 20)(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(500).json({ error: 'Multer error', details: err.message });
      }
      next();
    });
  }, (req, res) => {
    console.log('Upload request received');
    console.log('req.files:', req.files);
    console.log('req.body:', req.body);
    if (!req.files || !Array.isArray(req.files)) {
      console.error('No files uploaded or req.files is not an array');
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const fileUrls = req.files.map((file: any) => `/uploads/${file.filename}`);
    console.log('File URLs:', fileUrls);
    res.json({ urls: fileUrls });
  });

  // Parse YouTube URL
  app.post('/api/parse-youtube', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      console.log('Parsing YouTube URL:', url);
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
        try {
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
        } catch (e) {
          console.error('Error parsing ytInitialData', e);
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

      if (!title && !description) {
        return res.status(404).json({ error: 'Could not extract video information' });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = process.env.GEMINI_API_KEY;
      console.log('API Key length:', apiKey ? apiKey.length : 0);
      console.log('API Key starts with:', apiKey ? apiKey.substring(0, 5) : 'none');
      if (!apiKey) {
        throw new Error('API key is missing');
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
      다음은 부동산 매물 소개 유튜브 영상의 제목과 설명입니다.
      이 정보에서 부동산 매물 정보를 추출하여 JSON 형식으로 반환해주세요.
      
      제목: ${title}
      설명: ${description}
      
      추출할 필드 (없으면 빈 문자열이나 0으로 설정, 숫자는 단위 제외하고 숫자만):
      - title: 매물 제목 (문자열, 영상 제목을 적절히 다듬어서 사용)
      - priceStr: 매매가/전세가 등 가격 문자열 (예: "매매 5억 3천")
      - priceNum: 가격을 만원 단위 숫자로 변환 (예: 5억 3천 -> 53000, 없으면 0)
      - landArea: 대지 면적 문자열 (예: "100평" 또는 "330㎡")
      - buildArea: 건축/연면적 문자열 (예: "30평" 또는 "99㎡")
      - heating: 난방 방식 (예: "도시가스", "LPG", "기름보일러", "지열보일러" 등)
      - parking: 주차 대수 (예: "2대")
      - yard: 마당 특징 (예: "잔디마당", "텃밭")
      - location: 대략적인 위치 (예: "경기도 파주시 탄현면")
      - majorRegion: 광역 지역명 (예: "경기", "서울", "인천", "강원" 등)
      - minorRegion: 시/군/구 이름 (예: "파주시", "양평군")
      - type: 거래 종류 ("분양", "매매", "전세", "월세" 중 하나, 기본값 "매매")
      - tags: 쉼표로 구분된 태그 문자열 (예: "전원주택,타운하우스,마당넓은집")
      - description: 매물에 대한 상세 설명 (원문 설명에서 추출하여 정리)
      
      반드시 JSON 객체만 반환하세요.
      `;
      
      const genRes = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const parsedData = JSON.parse(genRes.text || '{}');
      res.json({ success: true, data: parsedData });
      
    } catch (error: any) {
      console.error('Error parsing youtube:', error);
      
      if (error.message && error.message.includes('API key not valid')) {
        return res.status(400).json({ 
          error: '유효하지 않은 Gemini API 키입니다. AI Studio의 Secrets 패널에서 GEMINI_API_KEY를 올바른 값으로 수정하거나 삭제해주세요.' 
        });
      }
      
      res.status(500).json({ error: 'Failed to parse youtube video', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Properties
  app.get('/api/properties', (req, res) => {
    const rows = db.prepare('SELECT * FROM properties ORDER BY id DESC').all();
    const properties = rows.map((row: any) => ({
      ...row,
      coords: JSON.parse(row.coords),
      tags: JSON.parse(row.tags),
      curation: row.curation ? JSON.parse(row.curation) : undefined,
      isPopular: row.isPopular === 1,
      isClosingSoon: row.isClosingSoon === 1,
      images: row.images ? JSON.parse(row.images) : [],
      overviewImages: row.overviewImages ? JSON.parse(row.overviewImages) : []
    }));
    res.json(properties);
  });

  app.post('/api/properties', (req, res) => {
    const p = req.body;
    const insert = db.prepare(`
      INSERT INTO properties (
        title, youtubeId, thumbnail, priceStr, priceNum, landArea, buildArea, 
        landAreaNum, buildAreaNum, floors, heating, parking, yard, location, region, 
        coords, type, tags, description, curation, isPopular, isClosingSoon, status, images, overviewImages, contact
      ) VALUES (
        @title, @youtubeId, @thumbnail, @priceStr, @priceNum, @landArea, @buildArea, 
        @landAreaNum, @buildAreaNum, @floors, @heating, @parking, @yard, @location, @region, 
        @coords, @type, @tags, @description, @curation, @isPopular, @isClosingSoon, @status, @images, @overviewImages, @contact
      )
    `);
    
    const result = insert.run({
      ...p,
      coords: JSON.stringify(p.coords),
      tags: JSON.stringify(p.tags),
      curation: p.curation ? JSON.stringify(p.curation) : null,
      isPopular: p.isPopular ? 1 : 0,
      isClosingSoon: p.isClosingSoon ? 1 : 0,
      status: p.status || 'pending',
      images: p.images ? JSON.stringify(p.images) : '[]',
      overviewImages: p.overviewImages ? JSON.stringify(p.overviewImages) : '[]',
      contact: p.contact || null
    });
    
    res.json({ id: result.lastInsertRowid, ...p, status: p.status || 'pending' });
  });

  app.put('/api/properties/:id', (req, res) => {
    const id = req.params.id;
    const p = req.body;
    const update = db.prepare(`
      UPDATE properties SET 
        title = @title, youtubeId = @youtubeId, thumbnail = @thumbnail, priceStr = @priceStr, 
        priceNum = @priceNum, landArea = @landArea, buildArea = @buildArea, landAreaNum = @landAreaNum, 
        buildAreaNum = @buildAreaNum, floors = @floors, heating = @heating, parking = @parking, 
        yard = @yard, location = @location, region = @region, coords = @coords, type = @type, 
        tags = @tags, description = @description, curation = @curation, isPopular = @isPopular, isClosingSoon = @isClosingSoon, status = @status, images = @images, overviewImages = @overviewImages, contact = @contact
      WHERE id = @id
    `);
    
    update.run({
      ...p,
      id,
      coords: JSON.stringify(p.coords),
      tags: JSON.stringify(p.tags),
      curation: p.curation ? JSON.stringify(p.curation) : null,
      isPopular: p.isPopular ? 1 : 0,
      isClosingSoon: p.isClosingSoon ? 1 : 0,
      status: p.status || 'pending',
      images: p.images ? JSON.stringify(p.images) : '[]',
      overviewImages: p.overviewImages ? JSON.stringify(p.overviewImages) : '[]',
      contact: p.contact || null
    });
    
    res.json({ success: true });
  });

  app.delete('/api/properties/:id', (req, res) => {
    db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/properties/:id/toggle-popular', (req, res) => {
    const id = req.params.id;
    const property = db.prepare('SELECT isPopular, curation FROM properties WHERE id = ?').get(id) as any;
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.isPopular === 0) {
      const curations = property.curation ? JSON.parse(property.curation) : [];
      const targetCuration = curations[0];

      if (targetCuration) {
        const allPopular = db.prepare('SELECT curation FROM properties WHERE isPopular = 1').all() as any[];
        const countInSameCuration = allPopular.filter(p => {
          const c = p.curation ? JSON.parse(p.curation) : [];
          return c.includes(targetCuration);
        }).length;

        if (countInSameCuration >= 4) {
          return res.status(400).json({ error: `'${targetCuration}' 카테고리의 인기 매물은 최대 4개까지만 지정할 수 있습니다.` });
        }
      } else {
        const allPopular = db.prepare('SELECT curation FROM properties WHERE isPopular = 1').all() as any[];
        const countNoCuration = allPopular.filter(p => !p.curation || JSON.parse(p.curation).length === 0).length;
        if (countNoCuration >= 4) {
          return res.status(400).json({ error: '일반 인기 매물은 최대 4개까지만 지정할 수 있습니다.' });
        }
      }
    }

    db.prepare('UPDATE properties SET isPopular = ? WHERE id = ?').run(property.isPopular ? 0 : 1, id);
    res.json({ success: true, isPopular: !property.isPopular });
  });

  app.post('/api/properties/:id/toggle-closing-soon', (req, res) => {
    const id = req.params.id;
    const property = db.prepare('SELECT isClosingSoon FROM properties WHERE id = ?').get(id) as any;
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    db.prepare('UPDATE properties SET isClosingSoon = ? WHERE id = ?').run(property.isClosingSoon ? 0 : 1, id);
    res.json({ success: true, isClosingSoon: !property.isClosingSoon });
  });

  app.post('/api/properties/:id/approve', (req, res) => {
    const id = req.params.id;
    db.prepare('UPDATE properties SET status = ? WHERE id = ?').run('approved', id);
    res.json({ success: true });
  });

  app.post('/api/properties/:id/toggle-status', (req, res) => {
    const id = req.params.id;
    const property = db.prepare('SELECT status FROM properties WHERE id = ?').get(id) as any;
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    const newStatus = property.status === 'approved' ? 'pending' : 'approved';
    db.prepare('UPDATE properties SET status = ? WHERE id = ?').run(newStatus, id);
    res.json({ success: true, status: newStatus });
  });

  // Auth
  app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'town1234!';
    
    if (password === adminPassword) {
      res.json({ token: 'admin-token-secret' });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });

  // Reservations
  app.get('/api/reservations', (req, res) => {
    const rows = db.prepare('SELECT * FROM reservations ORDER BY id DESC').all();
    res.json(rows);
  });

  app.post('/api/reservations', (req, res) => {
    const r = req.body;
    const insert = db.prepare(`
      INSERT INTO reservations (propertyId, propertyTitle, name, phone, date, time, message, createdAt, status)
      VALUES (@propertyId, @propertyTitle, @name, @phone, @date, @time, @message, @createdAt, @status)
    `);
    const result = insert.run({
      ...r,
      time: r.time || null,
      message: r.message || null
    });
    res.json({ id: result.lastInsertRowid, ...r });
  });

  app.put('/api/reservations/:id/status', (req, res) => {
    db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/reservations/:id', (req, res) => {
    db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
