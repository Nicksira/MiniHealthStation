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

// 🟢 3. ตั้งค่า Database JHCIS
const dbConfig = {
    host: '127.0.0.1',   
    user: 'root',      
    password: '123456',  // เปลี่ยนให้ตรงกับรหัสผ่านจริงถ้าจำเป็น
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
// 🎯 API 2: ดึงประวัติคนไข้ JHCIS (ชื่อและโรคประจำตัว)
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
// 🎯 API 3: ดึงรูปภาพ (ดึงจากไฟล์ .jpg ก่อน -> ถ้าไม่มีค่อยไปหาใน personimages)
// ==========================================
app.get('/jhcis-api/photo/:cid', checkApiKey, async (req, res) => {
    const cid = req.params.cid;

    // 1. ลองดึงจากไฟล์ .jpg ในเครื่องก่อน (โหลดไวกว่า ไม่พึ่ง DB)
    const filePath = path.join(__dirname, 'patient_photos', `${cid}.jpg`);
    if (fs.existsSync(filePath)) {
        try {
            // 🛑 ท่าไม้ตาย: ส่งไฟล์ออกแบบ Stream เลย ไม่ต้องแปลง Base64 ให้เซิร์ฟเวอร์เหนื่อย
            return res.sendFile(filePath);
        } catch (err) {
            console.error('อ่านไฟล์รูปภาพไม่สำเร็จ จะพยายามดึงจาก DB แทน...');
        }
    }

    // 2. ถ้าไม่มีไฟล์ ให้ไปค้นในฐานข้อมูล (ตาราง personimages)
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
            // 🛑 ท่าไม้ตาย: ส่งข้อมูล BLOB ออกไปเป็นไฟล์รูปภาพ (image/jpeg) ตรงๆ แทนการยัดใส่ JSON
            res.set('Content-Type', 'image/jpeg');
            console.log(`✅ ดึงรูปของ CID: ${cid} จาก Database สำเร็จ!`);
            return res.send(rows[0].photo);
        } else {
            return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพในระบบ' });
        }
    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Database Photo Fetch Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 🎯 API 4: อัปโหลดรูปภาพ (เซฟไฟล์ .jpg + อัปเดตลงตาราง personimages)
// ==========================================
app.post('/jhcis-api/upload-photo', checkApiKey, async (req, res) => {
    const { cid, image } = req.body;
    if (!cid || !image) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });

    let connection;
    try {
        // 1. แปลงรูป Base64 กลับเป็น Buffer
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 2. ระบบ Backup: เซฟเป็นไฟล์ .jpg ตั้งชื่อตามเลข 13 หลัก
        const uploadDir = path.join(__dirname, 'patient_photos');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        fs.writeFileSync(path.join(uploadDir, `${cid}.jpg`), imageBuffer);
        console.log(`📸 เซฟไฟล์รูปภาพลงเครื่องสำเร็จ: ${cid}.jpg`);

        // 3. ระบบ Database: บันทึกลงตาราง personimages
        connection = await mysql.createConnection(dbConfig);
        const [personRows] = await connection.execute('SELECT pid, pcucodeperson FROM person WHERE idcard = ?', [cid]);
        
        if (personRows.length > 0) {
            const { pid, pcucodeperson } = personRows[0];
            
            // เช็คว่ามีรูปในตาราง personimages หรือยัง
            const [photoExist] = await connection.execute(
                'SELECT pid FROM personimages WHERE pid = ? AND pcucodeperson = ?', 
                [pid, pcucodeperson]
            );

            if (photoExist.length > 0) {
                // 🛑 แก้ตรงนี้: เปลี่ยนคำว่า image เป็น photo
                await connection.execute(
                    'UPDATE personimages SET photo = ? WHERE pid = ? AND pcucodeperson = ?',
                    [imageBuffer, pid, pcucodeperson]
                );
            } else {
                // 🛑 แก้ตรงนี้: เปลี่ยนคำว่า image เป็น photo
                await connection.execute(
                    'INSERT INTO personimages (pcucodeperson, pid, photo) VALUES (?, ?, ?)',
                    [pcucodeperson, pid, imageBuffer]
                );
            }
            console.log(`✅ อัปเดตตาราง personimages ของ CID: ${cid} สำเร็จ!`);
        }

        await connection.end();
        res.status(200).json({ success: true, message: 'บันทึกรูปภาพสำเร็จทั้ง 2 ระบบ' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Upload Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});