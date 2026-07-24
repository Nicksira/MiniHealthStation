import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
// 🎯 API 1: บันทึกเข้าคิว JHCIS (ตาราง Visit)
// ==========================================
app.post('/jhcis-api/queue', checkApiKey, async (req, res) => {
    const data = req.body || {}; 
    if (!data.cid) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูล CID' });

    let connection;
    try {
        console.log(`[API] กำลังนำข้อมูลของ CID: ${data.cid} บันทึกลง JHCIS...`);
        connection = await mysql.createConnection(dbConfig);

        const [personRows] = await connection.execute(
            'SELECT pid, pcucodeperson, rightcode, rightno FROM person WHERE idcard = ? LIMIT 1', 
            [data.cid]
        );
        
        if (personRows.length === 0) {
            await connection.end();
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคนไข้ใน JHCIS' });
        }
        
        const p = personRows[0];
        const [maxRows] = await connection.execute('SELECT MAX(visitno) as mx FROM visit');
        const vno = (maxRows[0].mx || 0) + 1;

        const sql = `
            INSERT INTO visit 
            (pcucode, visitno, visitdate, pcucodeperson, pid, weight, height, pressure, pulse, temperature, waist, rightcode, rightno, timeservice) 
            VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1')
        `;
        
        await connection.execute(sql, [
            p.pcucodeperson, vno, p.pcucodeperson, p.pid, 
            data.weight || 0, data.height || 0, data.sysDia === '---' ? '' : data.sysDia, data.pulse || 0, data.temp || 0, data.waist || 0, 
            p.rightcode, p.rightno
        ]);

        await connection.end();
        console.log(`✅ ออกคิวสำเร็จ! Visit No: ${vno}`);
        res.status(200).json({ success: true, message: 'บันทึกคิวสำเร็จ' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Database Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 🎯 API 2: ดึงประวัติคนไข้ JHCIS
// ==========================================
app.get('/jhcis-api/patient/:cid', checkApiKey, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const sql = `
            SELECT 
                p.fname, p.lname,
                GROUP_CONCAT(c.diseasenamethai SEPARATOR ', ') as chronic_name
            FROM person p
            LEFT JOIN personchronic pc ON p.pid = pc.pid AND p.pcucodeperson = pc.pcucodeperson
            LEFT JOIN cdisease c ON pc.chroniccode = c.diseasecode
            WHERE p.idcard = ?
            GROUP BY p.pid, p.fname, p.lname
            LIMIT 1
        `;
        const [rows] = await connection.execute(sql, [req.params.cid]);
        await connection.end();

        if (rows.length > 0) {
            const patient = rows[0];
            res.status(200).json({ 
                success: true, 
                data: { 
                    fname: patient.fname, lname: patient.lname, 
                    chronic: patient.chronic_name ? patient.chronic_name : 'ไม่มีโรคประจำตัว' 
                } 
            });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคนไข้ในระบบ JHCIS' });
        }
    } catch (error) {
        if (connection) await connection.end();
        res.status(500).json({ success: false, message: error.message }); 
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JHCIS API รอรับข้อมูลจาก Kiosk ที่พอร์ต ${PORT}`);
});