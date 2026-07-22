import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 3000;

const API_KEY = 'ThapPhrik_Secret_Key_9988';

// 🟢 1. ระบบอนุญาตให้ Kiosk ยิงเข้ามาได้ (CORS)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'] // ลบ ngrok ออก เหลือแค่นี้พอครับ
}));

// 🟢 2. คำสั่งนี้สำคัญมาก (ห้ามลบ): สอนให้ Node.js อ่านข้อมูลที่ส่งมาจากหน้าจอ Kiosk
app.use(express.json());

// 🟢 3. ตั้งค่า Database JHCIS
const dbConfig = {
    host: '127.0.0.1',   // 👈 สำคัญมาก: ให้เปลี่ยนเป็น 127.0.0.1 (เพื่อบังคับให้ MySQL ยอมรับสิทธิ์ root)
    user: 'root',      
    password: '123456',  // 👈 ใส่รหัสผ่านเข้าฐานข้อมูล JHCIS ของคุณ (จากโค้ด Python ก่อนหน้า ผมเดาว่าอาจจะเป็น 123456 หรือรหัสที่คุณตั้งไว้ครับ)
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
    // ป้องกันกรณี req.body เป็นค่าว่าง
    const data = req.body || {}; 
    
    if (!data.cid) {
        console.error('❌ ข้อมูลที่ส่งมาไม่มีเลขบัตรประชาชน (CID)');
        return res.status(400).json({ success: false, message: 'ไม่มีข้อมูล CID กรุณาส่งข้อมูลให้ครบถ้วน' });
    }

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

        const weight = data.weight || 0;
        const height = data.height || 0;
        const pulse = data.pulse || 0;
        const temp = data.temp || 0;
        const waist = data.waist || 0;
        const pressure = data.sysDia === '---' ? '' : data.sysDia;

        const sql = `
            INSERT INTO visit 
            (pcucode, visitno, visitdate, pcucodeperson, pid, weight, height, pressure, pulse, temperature, waist, rightcode, rightno, timeservice) 
            VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1')
        `;
        
        await connection.execute(sql, [
            p.pcucodeperson, vno, p.pcucodeperson, p.pid, 
            weight, height, pressure, pulse, temp, waist, 
            p.rightcode, p.rightno
        ]);

        await connection.end();
        console.log(`✅ ออกคิวสำเร็จ! Visit No: ${vno}`);
        res.status(200).json({ success: true, message: 'บันทึกคิวสำเร็จ' });

    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Database Error:', error);
        res.status(500).json({ success: false, message: 'Database Error', error: error.message });
    }
});

// ==========================================
// 🎯 API 2: ดึงประวัติคนไข้ JHCIS (ดึงชื่อโรคประจำตัวของจริง)
// ==========================================
app.get('/jhcis-api/patient/:cid', checkApiKey, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // ใช้คำสั่ง JOIN เชื่อมตารางคนไข้ (person) -> ตารางประวัติโรค (personchronic) -> ตารางชื่อโรค (cdisease)
        const sql = `
            SELECT 
                p.fname, 
                p.lname,
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
                    fname: patient.fname, 
                    lname: patient.lname, 
                    // ถ้าเจอชื่อโรคให้แสดงชื่อโรค (คั่นด้วยลูกน้ำถ้ามีหลายโรค) ถ้าไม่เจอให้ขึ้น 'ไม่มีโรคประจำตัว'
                    chronic: patient.chronic_name ? patient.chronic_name : 'ไม่มีโรคประจำตัว' 
                } 
            });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคนไข้ในระบบ JHCIS' });
        }
    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ ดึงประวัติคนไข้ล้มเหลว (SQL Error):', error.message);
        res.status(500).json({ success: false, message: error.message }); 
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JHCIS API รอรับข้อมูลจาก Kiosk ที่พอร์ต ${PORT}`);
});