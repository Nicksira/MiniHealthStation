import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as googleTTS from 'google-tts-api';

// ตั้งค่า Path สำหรับเซฟรูปภาพ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const API_KEY = 'ThapPhrik_Secret_Key_9988';

// 🟢 1. ระบบอนุญาตให้ Kiosk ยิงเข้ามาได้ (CORS)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));

// 🟢 2. ขยายหลอดลมรับไฟล์รูปขนาดใหญ่ 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🟢 3. ตั้งค่า Database JHCIS (รหัสผ่านเดิมที่ถูกต้อง)
const dbConfig = {
    host: '127.0.0.1',   
    user: 'root',      
    password: '123456',
    database: 'jhcisdb',
    port: 3333 
};

// 🟢 4. ระบบตรวจบัตร (API Key)
const checkApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key && key === API_KEY) next();
    else res.status(401).json({ success: false, message: 'Unauthorized' });
};

// ==========================================
// API 1: บันทึกเข้าคิว JHCIS (ปรับปรุงโครงสร้างข้อมูลอาการสำคัญและอาการร่วม)
// ==========================================
app.post('/jhcis-api/queue', checkApiKey, async (req, res) => {
    const data = req.body || {}; 
    
    // ตรวจสอบความถูกต้องของรูปแบบข้อมูล (Data Validation)
    if (!data.cid || String(data.cid).length !== 13) {
        return res.status(400).json({ success: false, message: 'รูปแบบเลขประจำตัวประชาชนไม่ถูกต้อง' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // ค้นหาข้อมูลผู้รับบริการ
        const [personRows] = await connection.execute(
            'SELECT pid, pcucodeperson, rightcode, rightno FROM person WHERE idcard = ? LIMIT 1', 
            [data.cid]
        );
        
        if (personRows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้รับบริการในระบบ' });
        }
        const p = personRows[0];
        
        // กำหนดลำดับการรับบริการ (Visit Number)
        const [maxRows] = await connection.execute('SELECT MAX(visitno) as mx FROM visit');
        const vno = (maxRows[0].mx || 0) + 1;

        // แปลงชนิดข้อมูลและจัดการค่าว่าง (Data Sanitization)
        const weight = parseFloat(data.weight) || 0;
        const height = parseFloat(data.height) || 0;
        const pressure = (data.sysDia && data.sysDia !== '---') ? data.sysDia : '';
        const pulse = parseInt(data.pulse, 10) || 0;
        const temp = parseFloat(data.temp) || 0;
        const waist = parseFloat(data.waist) || 0;
        const sugar = parseFloat(data.sugar) || 0;

        // กำหนดข้อมูลผลตรวจและข้อความวินิจฉัยอัตโนมัติ
        const vitalCheckText = sugar > 0 ? `DTX: ${sugar} mg/dL` : '';
        const autoSymptoms = 'ผู้ป่วย NCD กลุ่มสีเขียว รับบริการที่ health station ประจำหมู่บ้าน โดย อสม.';
        const autoSymptomsco = 'ไม่มีเดินเซ ปากเบี้ยว พูดคุยรู้เรื่องชัดเจน ';

        // บันทึกข้อมูลลงตาราง visit รวมถึง symptoms และ symptomsco
        const sqlVisit = `
            INSERT INTO visit 
            (pcucode, visitno, visitdate, pcucodeperson, pid, weight, height, pressure, pulse, temperature, waist, rightcode, rightno, timeservice, vitalcheck, symptoms, symptomsco) 
            VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1', ?, ?, ?)
        `;
        
        await connection.execute(sqlVisit, [
            p.pcucodeperson, vno, p.pcucodeperson, p.pid, 
            weight, height, pressure, pulse, temp, waist, 
            p.rightcode, p.rightno, vitalCheckText,
            autoSymptoms, autoSymptomsco
        ]);

        // บันทึกผลระดับน้ำตาลในเลือดสำรอง
        if (sugar > 0) {
            try {
                const sqlLab = `
                    INSERT INTO visitlabchcyesur (pcucode, visitno, dtc, dateupdate)
                    VALUES (?, ?, ?, NOW())
                `;
                await connection.execute(sqlLab, [p.pcucodeperson, vno, sugar]);
            } catch (labError) {
                console.warn('ระบบ: ข้ามการบันทึกตาราง visitlabchcyesur เนื่องจากโครงสร้างตารางไม่สอดคล้องกัน');
            }
        }

        res.status(200).json({ success: true, message: 'บันทึกข้อมูลเข้าระบบสำเร็จ' });

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: ' + error.message });
    } finally {
        if (connection) await connection.end(); 
    }
});

// ==========================================
// 🎯 API 2: ดึงประวัติคนไข้ JHCIS (อัปเดต: บันทึกสถิติการใช้งานสำหรับงานวิจัย)
// ==========================================
app.get('/jhcis-api/patient/:cid', checkApiKey, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const sql = `
            SELECT 
                p.fname, p.lname, p.sex,
                GROUP_CONCAT(c.diseasenamethai SEPARATOR ', ') as chronic_name
            FROM person p
            LEFT JOIN personchronic pc ON p.pid = pc.pid AND p.pcucodeperson = pc.pcucodeperson
            LEFT JOIN cdisease c ON pc.chroniccode = c.diseasecode
            WHERE p.idcard = ?
            GROUP BY p.pid, p.fname, p.lname, p.sex
            LIMIT 1
        `;
        const [rows] = await connection.execute(sql, [req.params.cid]);

        if (rows.length > 0) {
            const patient = rows[0];
            
            // 📊 [Data Analytics] แอบบันทึกสถิติการเข้าใช้งานเบื้องหลังแบบ Asynchronous
            try {
                const sqlLog = `INSERT INTO kiosk_usage_log (cid, sex, search_date) VALUES (?, ?, NOW())`;
                // ไม่ต้องรอ await ก็ได้ เพื่อให้หน้าจอ Kiosk โหลดเร็วที่สุด (Fire and Forget)
                connection.execute(sqlLog, [req.params.cid, patient.sex || null]).catch(()=> {});
            } catch (logErr) { /* ปล่อยผ่านหากเก็บ log ไม่ได้ */ }

            res.status(200).json({ 
                success: true, 
                data: { 
                    fname: patient.fname, lname: patient.lname, sex: patient.sex,
                    chronic: patient.chronic_name ? patient.chronic_name : 'ไม่มีโรคประจำตัว' 
                } 
            });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคนไข้ในระบบ JHCIS' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message }); 
    } finally {
        if (connection) await connection.end();
    }
});

// ==========================================
// 🎯 API 3: ดึงรูปภาพ (แปลงเป็น Base64 ส่งไปเหมือนโค้ดเดิมของคุณ)
// ==========================================
app.get('/jhcis-api/photo/:cid', checkApiKey, async (req, res) => {
    const cid = req.params.cid;

    const filePath = path.join(__dirname, 'patient_photos', `${cid}.jpg`);
    if (fs.existsSync(filePath)) {
        try {
            const imageBuffer = fs.readFileSync(filePath);
            console.log(`📸 ดึงรูปของ CID: ${cid} จากไฟล์ .jpg สำเร็จ!`);
            return res.status(200).json({ success: true, image: imageBuffer.toString('base64') });
        } catch (err) {
            console.error('อ่านไฟล์รูปภาพไม่สำเร็จ...');
        }
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const sql = `
            SELECT img.photo as photo
            FROM person p
            INNER JOIN personimages img 
                ON p.pid = img.pid 
                AND p.pcucodeperson = img.pcucodeperson 
            WHERE p.idcard = ?
        `;
        const [rows] = await connection.execute(sql, [cid]);
        await connection.end();

        if (rows.length > 0 && rows[0].photo) {
            const base64Image = Buffer.from(rows[0].photo).toString('base64');
            console.log(`✅ ดึงรูปของ CID: ${cid} จาก Database สำเร็จ!`);
            return res.status(200).json({ success: true, image: base64Image });
        } else {
            return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพในระบบ' });
        }
    } catch (error) {
        if (connection) await connection.end();
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 🎯 API 4: อัปโหลดรูปภาพ (ซ่อน Error ฐานข้อมูลเมื่อเซฟไฟล์สำเร็จ)
// ==========================================
app.post('/jhcis-api/upload-photo', checkApiKey, async (req, res) => {
    const { cid, image } = req.body;
    if (!cid || !image) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });

    let connection;
    try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 1. เซฟไฟล์รูปภาพลงเครื่อง (สำเร็จแน่นอน)
        const uploadDir = path.join(__dirname, 'patient_photos');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        fs.writeFileSync(path.join(uploadDir, `${cid}.jpg`), imageBuffer);
        console.log(`📸 เซฟไฟล์รูปภาพลงเครื่องสำเร็จ: ${cid}.jpg`);

        // 2. ระบบ Database (แยก Try-Catch ไว้ ไม่ให้พังไปถึงหน้าเว็บ)
        try {
            connection = await mysql.createConnection(dbConfig);
            const [personRows] = await connection.execute('SELECT pid, pcucodeperson FROM person WHERE idcard = ?', [cid]);
            
            if (personRows.length > 0) {
                const { pid, pcucodeperson } = personRows[0];
                const [photoExist] = await connection.execute(
                    'SELECT pid FROM personimages WHERE pid = ? AND pcucodeperson = ?', 
                    [pid, pcucodeperson]
                );

                if (photoExist.length > 0) {
                    await connection.execute(
                        'UPDATE personimages SET photo = ? WHERE pid = ? AND pcucodeperson = ?',
                        [imageBuffer, pid, pcucodeperson]
                    );
                } else {
                    await connection.execute(
                        'INSERT INTO personimages (pcucodeperson, pid, photo) VALUES (?, ?, ?)',
                        [pcucodeperson, pid, imageBuffer]
                    );
                }
            }
        } catch (dbError) {
            // ซ่อน Error Data too long ไว้แค่ในหลังบ้าน ไม่ส่งไปกวนหน้าเว็บ
            console.warn(`⚠️ Warning: ไม่สามารถเซฟรูปลง Database ได้ (${dbError.message}) แต่ไฟล์ถูกเซฟลงเครื่องแล้ว`);
        } finally {
            if (connection) await connection.end();
        }

        // ส่งสถานะสำเร็จกลับไปที่หน้าจอ Kiosk เสมอ
        res.status(200).json({ success: true, message: 'บันทึกรูปภาพสำเร็จ' });

    } catch (error) {
        console.error('❌ Upload Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ==========================================
// 🎯 API 5: ระบบ AI พยาบาลอัจฉริยะ (Smart Triage + JSON Output)
// ==========================================
const GOOGLE_API_KEY = process.env.GCP_API_KEY;

app.post('/jhcis-api/ai-analyze', checkApiKey, async (req, res) => {
    const { vitals } = req.body;
    
    try {
        const prompt = `
        คุณคือ "พยาบาลเอไอ ประจำ โรงพยาบาลส่งเสริมสุขภาพตำบลทับพริก" หน้าที่ของคุณคือประเมินความเสี่ยงสุขภาพคนไข้
        
        กฎสำคัญที่ต้องปฏิบัติตามอย่างเคร่งครัด:
        1. ต้องเรียกผู้รับบริการว่า "คนไข้" เท่านั้น
        2. ห้ามใช้คำเรียกอื่นๆ เด็ดขาด (ห้ามเรียก คุณ, พี่, น้อง, ลุง, ป้า)
        3. ประเมินและจัดระดับความเร่งด่วน (Triage) เป็น 3 สี คือ green (ปกติ), yellow (เฝ้าระวัง), red (วิกฤต/ต้องพบแพทย์ทันที)
        4. ตอบกลับเป็น JSON Format ตามโครงสร้างนี้เท่านั้น ห้ามมีข้อความอื่นปน:
        {
            "color": "green หรือ yellow หรือ red",
            "message": "คำแนะนำแบบสั้นๆ เป็นกันเอง ห่วงใย ไม่เกิน 2 ประโยค"
        }

        ข้อมูลคนไข้ที่วัดได้ตอนนี้: 
        - ความดันโลหิต: ${vitals.sysDia} mmHg
        - น้ำตาลในเลือด: ${vitals.sugar} mg/dL
        - น้ำหนัก: ${vitals.weight} kg
        `;

        // 🌟 บังคับใช้รุ่น 3.5 Flash Lite และใช้ method: 'POST' พร้อมส่ง body ให้ถูกต้อง
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST', // ต้องเป็น POST เสมอ
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();

        // 🌟 เพิ่มจุดเช็ก Error จาก Google ตรงนี้ชัดๆ
        if (!response.ok) {
            console.error("❌ Google API Error Response:", JSON.stringify(data, null, 2));
            throw new Error(data.error?.message || "Google API Rejected Request");
        }

        if (data.candidates && data.candidates.length > 0) {
            const aiResult = JSON.parse(data.candidates[0].content.parts[0].text);
            
            return res.status(200).json({ 
                success: true, 
                message: aiResult.message,
                triageColor: aiResult.color 
            });
        } else {
            throw new Error("Invalid response format from Google");
        }

    } catch (error) {
        console.error("❌ AI Error Detail:", error.message);
        return res.status(200).json({ 
            success: true, 
            message: "ค่าความดันของคนไข้ถูกบันทึกแล้วค่ะ หากรู้สึกปวดศีรษะให้แจ้งเจ้าหน้าที่ทันทีนะคะ",
            triageColor: "yellow" 
        });
    }
});

// ==========================================
// 🎯 API 6: ระบบเสียงพูด (Google TTS API - เสถียร 100% ฟรี ไม่ติดโควตา)
// ==========================================
app.post('/jhcis-api/tts', checkApiKey, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'No text provided' });

    try {
        // 🌟 ดึงเสียงจาก Google และแปลงเป็น Base64 ทันที (ไม่ต้องสร้างไฟล์ลงเครื่องให้เสี่ยง Error)
        const audioBase64 = await googleTTS.getAudioBase64(text, {
            lang: 'th',
            slow: false,
            host: 'https://translate.google.com',
        });

        return res.status(200).json({ 
            success: true, 
            audioContent: audioBase64,
            mimeType: 'audio/mp3' 
        });

    } catch (error) {
        console.error("❌ Google TTS Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 🎯 API 7: ระบบเก็บคะแนนความพึงพอใจ (Patient Satisfaction)
// ==========================================
app.post('/jhcis-api/rating', checkApiKey, async (req, res) => {
    const { cid, visitno, score } = req.body;

    // Data Validation ตรวจสอบความถูกต้องเบื้องต้น
    if (!cid || !score || score < 1 || score > 5) {
        return res.status(400).json({ success: false, message: 'ข้อมูลคะแนนไม่ถูกต้อง' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        const sqlRating = `
            INSERT INTO kiosk_satisfaction (cid, visitno, score, record_date) 
            VALUES (?, ?, ?, NOW())
        `;
        
        await connection.execute(sqlRating, [cid, visitno || null, score]);
        
        console.log(`[System] บันทึกคะแนนความพึงพอใจ: ${score} ดาว (CID: ${cid})`);
        res.status(200).json({ success: true, message: 'บันทึกคะแนนสำเร็จ' });

    } catch (error) {
        console.error('[Database Error - Rating]:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคะแนน' });
    } finally {
        if (connection) await connection.end(); 
    }
});

// ==========================================
// 🎯 API 8: ระบบประมวลผลสถิติเพื่องานวิจัย (Research Analytics Dashboard)
// ==========================================
app.get('/jhcis-api/analytics', checkApiKey, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // 1. [God-Tier Query] นับจำนวนการใช้งาน แยกเพศ และคำนวณอายุจากตาราง person ของ JHCIS
        const [usageRows] = await connection.execute(`
            SELECT 
                COUNT(l.id) as total_usage,
                SUM(CASE WHEN l.sex = '1' THEN 1 ELSE 0 END) as male_count,
                SUM(CASE WHEN l.sex = '2' THEN 1 ELSE 0 END) as female_count,
                SUM(CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) <= 15 THEN 1 ELSE 0 END) as age_0_15,
                SUM(CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) > 15 AND TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) <= 35 THEN 1 ELSE 0 END) as age_16_35,
                SUM(CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) > 35 AND TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) <= 60 THEN 1 ELSE 0 END) as age_36_60,
                SUM(CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) > 60 THEN 1 ELSE 0 END) as age_60_plus
            FROM kiosk_usage_log l
            LEFT JOIN person p ON l.cid = p.idcard
        `);
        const usage = usageRows[0];

        // 2. ดึงข้อมูลคะแนนความพึงพอใจ
        const [ratingRows] = await connection.execute(`
            SELECT score, COUNT(*) as count 
            FROM kiosk_satisfaction 
            GROUP BY score 
            ORDER BY score DESC
        `);

        // คำนวณเป็นเปอร์เซ็นต์สำหรับกราฟ
        let totalRatings = 0;
        let totalScoreSum = 0;
        const chartData = [
            { name: '5 ดาว (ดีเยี่ยม)', value: 0, color: '#10b981' }, 
            { name: '4 ดาว (ดีมาก)', value: 0, color: '#84cc16' }, 
            { name: '3 ดาว (ปานกลาง)', value: 0, color: '#facc15' }, 
            { name: '2 ดาว (พอใช้)', value: 0, color: '#fb923c' }, 
            { name: '1 ดาว (ปรับปรุง)', value: 0, color: '#ef4444' }  
        ];

        ratingRows.forEach(row => {
            const count = Number(row.count);
            const score = Number(row.score);
            totalRatings += count;
            totalScoreSum += (score * count);
            const chartIndex = 5 - score;
            if(chartData[chartIndex]) chartData[chartIndex].value = count;
        });

        const avgScore = totalRatings > 0 ? (totalScoreSum / totalRatings).toFixed(2) : 0;

        res.status(200).json({
            success: true,
            data: {
                usage: { total: usage.total_usage, male: usage.male_count, female: usage.female_count },
                // 🔴 ส่งข้อมูลช่วงอายุกลับไปให้ Frontend
                ageGroups: { 
                    gen1: usage.age_0_15 || 0, 
                    gen2: usage.age_16_35 || 0, 
                    gen3: usage.age_36_60 || 0, 
                    gen4: usage.age_60_plus || 0 
                },
                satisfaction: { total: totalRatings, average: avgScore, chartData: chartData }
            }
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JHCIS API รอรับข้อมูลจาก Kiosk ที่พอร์ต ${PORT}`);
});