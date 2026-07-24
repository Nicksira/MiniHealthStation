import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'https://api.miniheealthstation.com';
const API_KEY = 'ThapPhrik_Secret_Key_9988';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  // 🟢 State สำหรับ Admin ลับ และระบบ Offline
  const [adminTab, setAdminTab] = useState<'settings' | 'data'>('settings');
  const [offlineQueue, setOfflineQueue] = useState<any[]>(JSON.parse(localStorage.getItem('offline_queue') || '[]'));

  // 🟢 State สำหรับ AI ผู้ช่วยประเมิน
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // 🟢 State สำหรับหน้าต่าง Modal ต่างๆ
  const [showTelemedModal, setShowTelemedModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showConfirmQueueModal, setShowConfirmQueueModal] = useState(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // 🟢 State สำหรับระบบ "กรอกเลขบัตร 13 หลัก (ไม่มีบัตร)"
  const [showManualIdModal, setShowManualIdModal] = useState(false);
  const [manualIdInput, setManualIdInput] = useState('');
  const [manualIdError, setManualIdError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyModal, setNotifyModal] = useState({ show: false, isSuccess: true, title: '', message: '' });

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [customLogo, setCustomLogo] = useState(localStorage.getItem('custom_logo') || '/TK.png');
  const [customVideo, setCustomVideo] = useState(localStorage.getItem('custom_video') || '/bg-video.mp4');

  const [devices, setDevices] = useState({
    weight: localStorage.getItem('dev_weight') || '',
    temp: localStorage.getItem('dev_temp') || '',
    bp: localStorage.getItem('dev_bp') || '',
    sugar: localStorage.getItem('dev_sugar') || '',
    o2: localStorage.getItem('dev_o2') || ''
  });

  const [config, setConfig] = useState({
    host: localStorage.getItem('config_host') || '26.62.30.1',
    port: localStorage.getItem('config_port') || '3000',
    user: localStorage.getItem('config_user') || 'root',
    password: localStorage.getItem('config_password') || '',
    nhsoToken: localStorage.getItem('config_token') || '',
    hospName: localStorage.getItem('config_hospName') || 'โรงพยาบาลส่งเสริมสุขภาพตำบลทับพริก [02506]'
  });


  // 🛑 เติมบรรทัดนี้ลงไปครับ! สำคัญมาก เพื่อป้องกันหน้าจอขาว หรือปุ่มค้าง 🛑
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);


  const [vitals, setVitals] = useState({
    height: '---', weight: '---', waist: '---',
    bmi: '---', temp: '---', spo2: '---',
    sysDia: '---', pulse: '---', sugar: '---'
  });

  // 1. เพิ่ม State สำหรับเก็บรูปภาพคนไข้ (Base64)
  const [patientImage, setPatientImage] = useState<string | null>(null);
  

  // 1. ฟังก์ชันดึงรูป ทะลวง Cache 100%
  const fetchPatientPhoto = async (cid: string) => {
    try {
      const timestamp = new Date().getTime();
      // 🌟 เปลี่ยน URL ยิงไปที่ HTTPS หลัก
      const photoUrl = `${API_BASE_URL}/jhcis-api/photo/${cid}?t=${timestamp}`;
      
      const response = await fetch(photoUrl, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (response.ok) {
        // 🛑 แก้ไข: รับข้อมูลเป็น JSON เพื่อดึงตัวแปร image ที่เป็น Base64 ออกมา
        const data = await response.json();
        if (data.success && data.image) {
          setPatientImage(`data:image/jpeg;base64,${data.image}`);
        } else {
          setPatientImage(null);
        }
      } else {
        setPatientImage(null); 
      }
    } catch (error) {
      console.error("ไม่สามารถดึงรูปจาก JHCIS ได้:", error);
      setPatientImage(null);
    }
  };

  // 2. ฟังก์ชันถ่ายรูป (พร้อมระบบบีบอัดภาพ God Tier และแจ้งเตือน)
  const handleCapturePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      // 🌟 สร้าง Canvas เพื่อบีบอัดรูปภาพก่อนส่ง
      const img = new Image();
      img.src = reader.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // จำกัดความกว้างสูงสุดแค่ 600px (ประหยัดพื้นที่ Database JHCIS)
        const MAX_WIDTH = 600; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // แปลงรูปเป็น JPEG และลดคุณภาพลงเหลือ 70% (เหลือไม่กี่สิบ KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        setPatientImage(compressedBase64); // โชว์รูปที่บีบอัดแล้วหน้าจอทันที
        
        const currentCid = patient?.cid;
        if (!currentCid) return;

        try {
          setIsUploadingPhoto(true);
          // 🌟 เปลี่ยนจาก http://${config.host} เป็นโดเมน HTTPS หลักของระบบ
          const response = await fetch(`${API_BASE_URL}/jhcis-api/upload-photo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': API_KEY
            },
            body: JSON.stringify({
              cid: currentCid,
              image: compressedBase64
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('📸 บันทึกรูปภาพลงฐานข้อมูลสำเร็จ!'); // แจ้งเตือนเมื่อสำเร็จชัวร์ๆ
          } else {
            alert(`❌ บันทึกรูปไม่สำเร็จ: ${data.message}`);
          }
        } catch (error: any) {
          console.error("อัปโหลดรูปไม่สำเร็จ:", error);
          alert(`❌ การเชื่อมต่อล้มเหลว (เช็ก IP หรือ Chrome Flags): ${error.message}`);
        } finally {
          setIsUploadingPhoto(false);
        }
      };
    };
    
    reader.readAsDataURL(file);
  };

  const updateDeviceName = (key: string, name: string) => {
    setDevices(prev => ({ ...prev, [key]: name }));
    localStorage.setItem(`dev_${key}`, name);
  };

  const formatThaiDateTime = (date: Date) => {
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543} เวลา ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')} น.`;
  };

  const processCardData = async (cardData: any) => {
    setLoading(true);
    try {
      const cid = cardData.pid || cardData.citizenId;
      let raw_img = cardData.image || cardData.photo;
      let img_str = "";
      if (raw_img) {
          img_str = String(raw_img).trim();
          if (img_str.includes("base64,")) img_str = img_str.split("base64,")[1];
          img_str = img_str.replace(/\s/g, "").replace(/\n/g, "").replace(/\r/g, "");
          const missing_padding = img_str.length % 4;
          if (missing_padding > 0) img_str += '='.repeat(4 - missing_padding);
      }
      setPatientPhoto(img_str);

      try {
  const jhcisResponse = await axios.get(`https://api.miniheealthstation.com/jhcis-api/patient/${cid}`, {
    headers: { 'x-api-key': API_KEY }, 
    timeout: 4000 
  });
        if (jhcisResponse.data.success) {
          setPatient({ ...jhcisResponse.data.data, cid: cid }); 
        } else {
          setPatient({ cid: cid, fname: cardData.fname, lname: cardData.lname, chronic: 'ไม่มีประวัติในระบบ' });
        }
      } catch (dbError) {
        setPatient({ cid: cid, fname: cardData.fname, lname: cardData.lname, chronic: 'ไม่สามารถดึงข้อมูลโรคได้' });
      }

      // ... โค้ดเดิม
      axios.post('http://localhost:8189/api/nhso-authen', {
          pid: cid, claimType: "PG0060001", mobile: "0000000000", correlationId: "MiniHealthStation-001"
      }).catch(() => {});

      // 🛑 สั่งให้ระบบวิ่งไปดึงรูปจากฐานข้อมูล JHCIS ทันที
      await fetchPatientPhoto(cid); 

      setIsLoggedIn(true);
      // ... โค้ดเดิม
    } catch (error) {
      alert("ระบบประมวลผลขัดข้อง");
    } finally {
      setLoading(false);
    }
  };

// 🟢 ฟังก์ชันค้นหาประวัติจากการพิมพ์เลข 13 หลัก (ไม่มีบัตร)
  const processManualId = async () => {
    if (manualIdInput.length !== 13) {
      setManualIdError('กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก');
      return;
    }
    
    setLoading(true);
    setManualIdError('');
    
    try {
  const response = await axios.get(`https://api.miniheealthstation.com/jhcis-api/patient/${manualIdInput}`, { 
    headers: { 'x-api-key': API_KEY }, 
    timeout: 5000 
  });
      
      // ... โค้ดเดิม
      if (response.data.success) {
        setPatient({ ...response.data.data, cid: manualIdInput });
        
        // 🛑 สั่งให้ระบบวิ่งไปดึงรูปจากฐานข้อมูล JHCIS ทันที
        await fetchPatientPhoto(manualIdInput); 
        
        setIsTestingMode(true); 
        setIsLoggedIn(true);
      // ... โค้ดเดิม
        setShowManualIdModal(false); 
        setManualIdInput(''); 
      }
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        setManualIdError('ไม่พบข้อมูลในระบบ JHCIS กรุณาติดต่อเจ้าหน้าที่');
      } else {
        setManualIdError('การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  const simulateTest = () => {
    setIsTestingMode(true);
    const mockData = { pid: "1279800022828", fname: "สิรภพ", lname: "แก้วทิพย์", image: "" };
    processCardData(mockData);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPatient(null);
    setPatientPhoto(null);
    
    // 🛑 เพิ่มบรรทัดนี้! เพื่อเคลียร์รูปภาพที่ดึงจาก JHCIS/กล้องถ่ายรูป ไม่ให้ค้างไปถึงคนไข้คิวถัดไป
    setPatientImage(null); 
    
    setIsTestingMode(false);
    setVitals({ height: '---', weight: '---', waist: '---', bmi: '---', temp: '---', spo2: '---', sysDia: '---', pulse: '---', sugar: '---' });
  };

  const handleManualRead = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8189/api/smartcard/read?readImageFlag=true');
      if (response.data && response.data.pid) processCardData(response.data);
      else alert('กรุณาสอดบัตรประชาชนให้แน่น แล้วคลิกอีกครั้งครับ');
    } catch (e) {
      alert('ไม่สามารถเชื่อมต่อเครื่องอ่านบัตรได้');
    } finally {
      setLoading(false);
    }
  };

  // ดักจับการสอดบัตร
  useEffect(() => {
    let checkCardInterval: NodeJS.Timeout;
    if (!loading && !showSettings && !isSubmitting && !showManualIdModal) {
      checkCardInterval = setInterval(async () => {
        try {
          const response = await axios.get('http://localhost:8189/api/smartcard/read?readImageFlag=true', { timeout: 1500 });
          if (response.data && response.data.pid) {
            setIsTestingMode(false);
            if (!isLoggedIn) processCardData(response.data);
          } else {
            if (isLoggedIn && !isTestingMode) handleLogout();
          }
        } catch (e) {
          if (isLoggedIn && !isTestingMode) handleLogout();
        }
      }, 2000);
    }
    return () => clearInterval(checkCardInterval);
  }, [isLoggedIn, loading, showSettings, isTestingMode, isSubmitting, showManualIdModal]);

  // 🟢 Bluetooth Functions (อัปเดตล็อกเป้าหมายชื่ออุปกรณ์ตามหน้างานจริง)
  
  const connectBluetoothO2 = async () => {
    try {
      // 🚀 ปลดล็อกชื่อ ค้นหาอุปกรณ์ Bluetooth ทุกตัวที่อยู่รอบๆ เพื่อดูว่ามันแผ่สัญญาณชื่ออะไรออกมา
      const device = await navigator.bluetooth.requestDevice({ 
        acceptAllDevices: true, 
        optionalServices: ['pulse_oximeter'] 
      });
      
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('pulse_oximeter');
      const characteristic = await service?.getCharacteristic('plx_continuous_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        setVitals(prev => ({ ...prev, spo2: value.getUint8(1).toString(), pulse: value.getUint8(3).toString() }));
      });
      alert('✅ เชื่อมต่อสำเร็จ!');
      updateDeviceName('o2', device.name || 'Yuwell Oximeter');
    } catch (error) { 
      console.error("O2 Radar Error:", error); 
      alert('❌ ยกเลิกหรืออุปกรณ์อาจใช้โปรโตคอลเฉพาะตัว (ดู Error ใน Console)'); 
    }
  };

  const connectBluetoothWeight = async () => {
    try {
      // ล็อกเป้าหมายชื่อ BodyA-1B
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ namePrefix: 'BodyA' }], 
        optionalServices: ['weight_scale'] 
      });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('weight_scale');
      const characteristic = await service?.getCharacteristic('weight_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const weight = (value.getUint16(1, true) * 0.005).toFixed(1); 
        setVitals(prev => {
          const h = parseFloat(prev.height) / 100;
          return { ...prev, weight: weight.toString(), bmi: h > 0 ? (parseFloat(weight) / (h * h)).toFixed(2) : '---' };
        });
      });
      alert('✅ เชื่อมต่อเครื่องชั่งน้ำหนักสำเร็จ!');
      updateDeviceName('weight', device.name || 'BodyA Scale');
    } catch (error) { 
      console.error("Weight Error:", error); 
      alert('❌ ยกเลิกหรืออุปกรณ์อาจใช้โปรโตคอลเฉพาะตัว'); 
    }
  };

  const connectBluetoothTemp = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ namePrefix: 'Yuwell HT' }], 
        optionalServices: ['health_thermometer'] 
      });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('health_thermometer');
      const characteristic = await service?.getCharacteristic('temperature_measurement');
      await characteristic?.startNotifications();
      
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        
        // 🧠 ถอดรหัสอุณหภูมิมาตรฐานการแพทย์ (IEEE-11073 32-bit FLOAT)
        // แยกตัวเลขหลัก (Mantissa) 3 ไบต์ และเลขยกกำลัง (Exponent) 1 ไบต์
        const mantissa = value.getUint8(1) | (value.getUint8(2) << 8) | (value.getUint8(3) << 16);
        const exponent = value.getInt8(4);
        
        // คำนวณค่าจริง: mantissa * (10 ^ exponent)
        const tempValue = (mantissa * Math.pow(10, exponent)).toFixed(1);
        
        setVitals(prev => ({ ...prev, temp: tempValue.toString() }));
      });
      
      alert('✅ เชื่อมต่อเครื่องวัดอุณหภูมิสำเร็จ!');
      updateDeviceName('temp', device.name || 'Yuwell Temp');
    } catch (error) { 
      console.error("Temp Error:", error); 
      alert('❌ ยกเลิกหรือเชื่อมต่อไม่สำเร็จ'); 
    }
  };

  const connectBluetoothSugar = async () => {
    try {
      // ล็อกเป้าหมายชื่อ Yuwell Glucose
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ namePrefix: 'Yuwell Glucose' }], 
        optionalServices: ['glucose'] 
      });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('glucose');
      const characteristic = await service?.getCharacteristic('glucose_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        setVitals(prev => ({ ...prev, sugar: value.getUint16(10, true).toString() }));
      });
      alert('✅ เชื่อมต่อเครื่องวัดน้ำตาลสำเร็จ!');
      updateDeviceName('sugar', device.name || 'Yuwell Glucose');
    } catch (error) { 
      console.error("Sugar Error:", error); 
      alert('❌ ยกเลิกหรืออุปกรณ์อาจใช้โปรโตคอลเฉพาะตัว'); 
    }
  };

  const connectBluetoothBP = async () => {
    try {
      // ล็อกเป้าหมายชื่อ Yuwell BP-YE680B
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ namePrefix: 'Yuwell BP' }], 
        optionalServices: ['blood_pressure'] 
      });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('blood_pressure');
      const characteristic = await service?.getCharacteristic('blood_pressure_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        setVitals(prev => ({ ...prev, sysDia: `${value.getUint16(1, true)}/${value.getUint16(3, true)}` }));
      });
      alert('✅ เชื่อมต่อเครื่องวัดความดันสำเร็จ!');
      updateDeviceName('bp', device.name || 'Yuwell BP');
    } catch (error) { 
      console.error("BP Error:", error); 
      alert('❌ ยกเลิกหรืออุปกรณ์อาจใช้โปรโตคอลเฉพาะตัว'); 
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogo(reader.result as string); 
        localStorage.setItem('custom_logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) { alert("⚠️ ไฟล์วิดีโอใหญ่เกินไป (แนะนำไม่เกิน 5-6MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomVideo(reader.result as string);
        try { localStorage.setItem('custom_video', reader.result as string); } 
        catch (err) { alert("⚠️ ไฟล์ใหญ่เกินความจุถาวรของบราวเซอร์ แต่จะแสดงผลให้เห็นชั่วคราวครับ"); }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('config_host', config.host);
    localStorage.setItem('config_port', config.port);
    localStorage.setItem('config_user', config.user);
    localStorage.setItem('config_password', config.password);
    localStorage.setItem('config_token', config.nhsoToken);
    localStorage.setItem('config_hospName', config.hospName);
    alert('✅ บันทึกการตั้งค่าเรียบร้อยแล้ว');
    setShowSettings(false);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === "Admin00000") {
      setShowSettings(true); setShowPasswordModal(false); setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  const handleVitalChange = (field: string, value: string) => {
    setVitals(prev => {
      let finalValue = value;

      // 🛑 โลจิกจัดการช่องความดันโลหิต (sysDia) แบบอัตโนมัติ
      if (field === 'sysDia') {
        // 1. อนุญาตให้พิมพ์ได้เฉพาะตัวเลขและเครื่องหมาย / เท่านั้น
        finalValue = finalValue.replace(/[^\d/]/g, '');
        
        // 2. เช็คว่าคนไข้กำลัง "ลบข้อมูล" อยู่หรือไม่ (เพื่อไม่ให้ / เด้งกลับมาตอนกด Backspace)
        const isDeleting = prev.sysDia !== '---' && finalValue.length < prev.sysDia.length;
        
        if (!isDeleting) {
          // 3. ถ้าพิมพ์ตัวเลขครบ 3 หลักและยังไม่มี / ให้เติม / อัตโนมัติ
          if (finalValue.length === 3 && !finalValue.includes('/')) {
            finalValue += '/';
          }
        }
        
        // 4. ป้องกันการเผลอพิมพ์เครื่องหมาย / ซ้ำซ้อน (เช่น 120//80)
        if (finalValue.split('/').length > 2) {
          finalValue = prev.sysDia;
        }
      }

      const newVitals = { ...prev, [field]: finalValue };

      // ส่วนคำนวณ BMI อัตโนมัติ (คงไว้เหมือนเดิม)
      if (field === 'height' || field === 'weight') {
        const h = parseFloat(field === 'height' ? finalValue : prev.height) / 100;
        const w = parseFloat(field === 'weight' ? finalValue : prev.weight);
        if (h > 0 && w > 0) newVitals.bmi = (w / (h * h)).toFixed(2);
        else newVitals.bmi = '---';
      }
      
      return newVitals;
    });
  };

  const sendToJHCISQueue = () => {
    if (!patient?.cid) {
      alert("⚠️ ไม่พบข้อมูลบัตรประชาชน กรุณาเสียบบัตรใหม่อีกครั้ง");
      return;
    }
    setShowConfirmQueueModal(true);
  };

  const confirmSendToJHCISQueue = async () => {
    setShowConfirmQueueModal(false); 
    setIsSubmitting(true); 

    const payload = {
      cid: patient.cid,
      weight: vitals.weight === '' || vitals.weight === '---' ? 0 : parseFloat(vitals.weight),
      height: vitals.height === '' || vitals.height === '---' ? 0 : parseFloat(vitals.height),
      // ... (ดึง vitals อื่นๆ ให้ครบเหมือนโค้ดเดิมของคุณ)
      sysDia: vitals.sysDia === '---' ? '' : vitals.sysDia, 
      pulse: vitals.pulse === '' || vitals.pulse === '---' ? 0 : parseInt(vitals.pulse),
    };
    
    try {
      const response = await axios.post(`${API_BASE_URL}/jhcis-api/queue`, payload, {
        headers: { 'x-api-key': API_KEY },
        timeout: 5000 
      });

      if (response.data || response.status === 200) {
        speak('บันทึกข้อมูลและจัดคิวเข้าสู่ระบบสำเร็จ ขอบคุณที่ใช้บริการค่ะ');
        setNotifyModal({ show: true, isSuccess: true, title: 'จัดคิวสำเร็จ!', message: 'ส่งข้อมูลผู้ป่วยเข้าสู่ระบบ JHCIS เรียบร้อยแล้ว' });
        setTimeout(() => {
          setNotifyModal(prev => ({ ...prev, show: false }));
          handleLogout();
        }, 3000);
      }
    } catch (error) {
      // 🛑 OFFLINE FIRST: ถ้ายิง JHCIS ไม่เข้า (เน็ตหลุด/เซิร์ฟเวอร์ดับ) ให้เซฟลง Kiosk ทันที
      const savedOffline = JSON.parse(localStorage.getItem('offline_queue') || '[]');
      savedOffline.push({ ...payload, name: `${patient.fname} ${patient.lname}`, timestamp: new Date().toLocaleString('th-TH') });
      localStorage.setItem('offline_queue', JSON.stringify(savedOffline));
      setOfflineQueue(savedOffline); // อัปเดตหน้า Admin

      speak('การเชื่อมต่อขัดข้อง แต่ระบบได้บันทึกข้อมูลสำรองไว้ในเครื่องแล้วค่ะ ไม่ต้องกังวลนะคะ');
      setNotifyModal({ 
        show: true, 
        isSuccess: true, // ให้เป็นสีเขียวเพราะเซฟลงเครื่องสำเร็จ
        title: 'บันทึกออฟไลน์สำเร็จ (เน็ตขัดข้อง)', 
        message: 'ระบบเก็บข้อมูลของท่านไว้ใน Kiosk อย่างปลอดภัยแล้ว เจ้าหน้าที่จะซิงค์เข้าระบบให้ภายหลังครับ' 
      });
      setTimeout(() => {
        setNotifyModal(prev => ({ ...prev, show: false }));
        handleLogout();
      }, 4000);
    } finally {
      setIsSubmitting(false); 
    }
  };

  // 🎙️ ฟังก์ชันให้ระบบพูดออกเสียงภาษาไทย
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // ล้างคิวเสียงเก่าก่อน
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH'; // บังคับเสียงภาษาไทย
      utterance.rate = 1.0;     // ความเร็วปกติ
      window.speechSynthesis.speak(utterance);
    }
  };

  // ⏱️ ระบบรักษาความปลอดภัย Auto-Logout 10 นาที (600,000 ms)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isLoggedIn) {
          speak('หมดเวลาทำรายการ ระบบได้ล้างข้อมูลของคุณเพื่อความปลอดภัยแล้วค่ะ');
          handleLogout();
        }
      }, 600000); // 10 นาทีเป๊ะ
    };

    // ดักจับว่าคนไข้ยังจิ้มหน้าจออยู่ไหม
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer(); // เริ่มนับเวลา

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeoutId);
    };
  }, [isLoggedIn]);

  const analyzeHealth = () => {
    let alerts = [];
    let isEmergency = false;
    if (vitals.height !== '---' && vitals.weight !== '---') {
      const h = parseFloat(vitals.height) / 100;
      const w = parseFloat(vitals.weight);
      if (h > 0 && w > 0) {
        const bmi = (w / (h * h)).toFixed(2);
        if (Number(bmi) >= 30) alerts.push({ icon: 'fa-solid fa-triangle-exclamation', title: `โรคอ้วนระดับ 2 (BMI: ${bmi})`, desc: 'เสี่ยงโรคแทรกซ้อนสูงมาก แนะนำให้พบแพทย์และปรับพฤติกรรมด่วน', color: '#dc2626' });
        else if (Number(bmi) >= 25) alerts.push({ icon: 'fa-solid fa-circle-exclamation', title: `โรคอ้วนระดับ 1 (BMI: ${bmi})`, desc: 'ควรเริ่มควบคุมอาหารและออกกำลังกาย', color: '#ea580c' });
        else if (Number(bmi) >= 23) alerts.push({ icon: 'fa-solid fa-bell', title: `น้ำหนักเกิน (BMI: ${bmi})`, desc: 'ควรระวังเรื่องอาหารการกิน', color: '#ca8a04' });
        else if (Number(bmi) >= 18.5) alerts.push({ icon: 'fa-solid fa-circle-check', title: `น้ำหนักปกติ (BMI: ${bmi})`, desc: 'รักษาสุขภาพได้ดีมากครับ', color: '#16a34a' });
        else alerts.push({ icon: 'fa-solid fa-circle-info', title: `น้ำหนักต่ำกว่าเกณฑ์ (BMI: ${bmi})`, desc: 'ควรทานอาหารที่มีประโยชน์เพิ่มขึ้น', color: '#2563eb' });
      }
    }
    if (vitals.sysDia !== '---') {
      const [sys, dia] = vitals.sysDia.split('/').map(Number);
      if (sys >= 180 || dia >= 120) {
        isEmergency = true;
        alerts.push({ icon: 'fa-solid fa-heart-crack', title: 'ความดันโลหิตสูงวิกฤต!', desc: 'อันตราย! เสี่ยงหลอดเลือดสมองแตก กรุณานั่งพัก ติดต่อเจ้าหน้าที่ทันที หรือโทร 1669', color: '#dc2626', isCrit: true });
      } else if (sys >= 140 || dia >= 90) {
        alerts.push({ icon: 'fa-solid fa-heart-circle-exclamation', title: 'ความดันโลหิตสูง', desc: 'ควรพบแพทย์เพื่อประเมินอาการอย่างละเอียด', color: '#ea580c' });
      } else if (sys <= 90 || dia <= 60) {
        alerts.push({ icon: 'fa-solid fa-heart-circle-minus', title: 'ความดันโลหิตต่ำ', desc: 'อาจมีอาการหน้ามืด วิงเวียน ควรพักผ่อนและดื่มน้ำให้เพียงพอ', color: '#2563eb' });
      } else {
        alerts.push({ icon: 'fa-solid fa-heart-circle-check', title: 'ความดันโลหิตปกติ', desc: 'อยู่ในเกณฑ์ที่ดีครับ', color: '#16a34a' });
      }
    }
    return { alerts, isEmergency };
  };

  const healthAnalysis = analyzeHealth();

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', position: 'fixed', top: 0, left: 0, margin: 0, padding: 0 }}>
      
      <header className="header-bg" style={{ position: 'relative', zIndex: 5 }}>
        <div className="header-logo"><img src={customLogo} alt="โลโก้หน่วยงาน" /></div>
        <h1 className="aurora-text">Mini Health Station</h1>
        <p>{config.hospName}</p>
      </header>
{showSettings ? (
        <main className="dashboard-screen" style={{ textAlign: 'left', padding: '40px', flex: 1, overflowY: 'auto', paddingBottom: '15vh' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
            
            {/* 🟢 ปุ่มสลับแท็บ Settings / Admin (แทรกตรงนี้) */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #EEE', paddingBottom: '10px' }}>
              <button onClick={() => setAdminTab('settings')} style={{ flex: 1, padding: '10px', background: adminTab === 'settings' ? '#007AFF' : '#f1f5f9', color: adminTab === 'settings' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ ตั้งค่าระบบ</button>
              <button onClick={() => setAdminTab('data')} style={{ flex: 1, padding: '10px', background: adminTab === 'data' ? '#10b981' : '#f1f5f9', color: adminTab === 'data' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📊 ข้อมูลค้างส่ง (Offline)</button>
            </div>

            {adminTab === 'settings' ? (
              /* 🟢 แท็บ 1: ข้อมูลการตั้งค่าเดิมทั้งหมด */
              <>
                <h2 style={{ color: '#007AFF', marginBottom: '20px', borderBottom: '2px solid #EEE', paddingBottom: '10px' }}> ตั้งค่าระบบ (Settings)</h2>
                <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}> เปลี่ยนรูปโลโก้หน่วยงาน</label><input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'block', width: '100%', padding: '10px', background: '#F2F2F7', borderRadius: '8px' }} /></div>
                <div style={{ marginBottom: '20px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}> เปลี่ยนวิดีโอพื้นหลังหน้าแรก (MP4 เท่านั้น)</label><input type="file" accept="video/mp4" onChange={handleVideoUpload} style={{ display: 'block', width: '100%', padding: '10px', background: '#F2F2F7', borderRadius: '8px' }} /><small style={{ color: '#666' }}>* แนะนำไฟล์ความละเอียดพอดีและขนาดไม่เกิน 5MB</small></div>
                <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ชื่อหน่วยงาน/โรงพยาบาล</label><input type="text" value={config.hospName} onChange={(e) => setConfig({...config, hospName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Host IP (JHCIS API)</label><input type="text" value={config.host} onChange={(e) => setConfig({...config, host: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                  <div><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Port</label><input type="text" value={config.port} onChange={(e) => setConfig({...config, port: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Username (DB)</label><input type="text" value={config.user} onChange={(e) => setConfig({...config, user: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                  <div><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password (DB)</label><input type="password" value={config.password} onChange={(e) => setConfig({...config, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                </div>
                <div style={{ marginBottom: '30px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>NHSO Token (สำหรับขอ Authen)</label><input type="text" value={config.nhsoToken} onChange={(e) => setConfig({...config, nhsoToken: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button onClick={() => setShowSettings(false)} style={{ padding: '12px 30px', background: '#8E8E93', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>ยกเลิก</button>
                  <button onClick={saveConfig} style={{ padding: '12px 30px', background: '#34C759', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>💾 บันทึกและเชื่อมต่อ</button>
                </div>
              </>
            ) : (
              /* 🟢 แท็บ 2: หน้าจอ Admin ลับ สำหรับดูข้อมูล Offline */
              <div>
                <h3 style={{ color: '#10b981', marginTop: '0' }}>รายการคิวที่ค้างส่งเข้าระบบ JHCIS ({offlineQueue.length} รายการ)</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {offlineQueue.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>ไม่มีข้อมูลค้างส่ง</p> : 
                    offlineQueue.map((q, idx) => (
                      <div key={idx} style={{ background: 'white', padding: '12px', marginBottom: '10px', borderRadius: '6px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <strong style={{ fontSize: '16px' }}>{q.name}</strong> <span style={{ color: '#64748b' }}>(CID: {q.cid})</span><br/>
                        <div style={{ color: '#475569', fontSize: '14px', marginTop: '5px' }}>ความดัน: <span style={{ fontWeight: 'bold' }}>{q.sysDia}</span> | น้ำหนัก: <span style={{ fontWeight: 'bold' }}>{q.weight}</span></div>
                        <small style={{ color: '#94a3b8', display: 'block', marginTop: '5px' }}>บันทึกเวลา: {q.timestamp}</small>
                      </div>
                    ))
                  }
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', justifyContent: 'space-between' }}>
                  <button onClick={() => { if(window.confirm('ต้องการลบข้อมูลค้างส่งทั้งหมดใช่หรือไม่?')) { localStorage.setItem('offline_queue', '[]'); setOfflineQueue([]); } }} style={{ padding: '12px 20px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>ลบทิ้งทั้งหมด</button>
                  <button onClick={() => alert("ระบบซิงค์จะทยอยส่งข้อมูลอัตโนมัติเมื่อเซิร์ฟเวอร์ออนไลน์ครับ")} style={{ padding: '12px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🔄 ซิงค์ขึ้น JHCIS</button>
                </div>
              </div>
            )}
            
          </div>
        </main>
      ) : !isLoggedIn ? (
        
        <main className="home-screen" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <video key={customVideo} autoPlay loop playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4 }}><source src={customVideo} type="video/mp4" /></video>
          
          <div onClick={handleManualRead} style={{ display: 'flex', justifyContent: 'center', margin: '30px 0', cursor: 'pointer', position: 'relative', zIndex: 1 }}>
            <img src="/nick.png" alt="กรุณาสอดบัตรประชาชน" style={{ maxWidth: '600px', transition: 'transform 0.2s', filter: 'drop-shadow(0 15px 20px rgba(0,0,0,0.2))' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
          </div>
          
          <div className="instruction-text" style={{ position: 'relative', zIndex: 1, textShadow: '0 2px 4px rgba(255,255,255,0.9)' }}>
            {loading ? 'กำลังดึงข้อมูลและรูปถ่าย...' : 'กรุณาสอดบัตรประชาชน เพื่อเข้ารับบริการ'}
          </div>
          
          {/* 🟢 โซนปุ่มหน้าแรก (จัดเรียงแนวตั้งตามดีไซน์ใหม่) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', position: 'relative', zIndex: 1, marginTop: '20px', width: '90%', maxWidth: '600px' }}>
            
            {/* 🎯 ปุ่มไม่มีบัตร (สไตล์แคปซูลยาว สีฟ้าน้ำทะเลตาม Reference) */}
            <button 
              onClick={() => { setShowManualIdModal(true); setManualIdInput(''); setManualIdError(''); }}
              style={{ 
                width: '100%', 
                padding: '18px', 
                background: '#4bc0c8', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                boxShadow: '0 6px 15px rgba(75, 192, 200, 0.4)', 
                fontSize: '24px',
                letterSpacing: '1px',
                transition: 'transform 0.2s, background 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.background = '#3ba2aa';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#4bc0c8';
              }}
            >
              ไม่มีบัตรประชาชนแตะที่ปุ่มนี้
            </button>

          </div>
        </main>

      ) : (
        <main className="dashboard-screen" style={{ flex: 1, overflowY: 'auto', paddingBottom: '15vh' }}>
          {/* 🟢 ปุ่มย้อนกลับ มุมซ้ายบน (Floating Button) */}
          <button 
            onClick={handleLogout}
            style={{
              position: 'fixed',
              top: '25px',
              left: '25px',
              zIndex: 100,
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#0284c7', // สีฟ้าคุมโทนกับปุ่มด้านล่าง
              border: 'none',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.08)', // เงาบางๆ ให้ปุ่มลอยขึ้นมา
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <i className="fa-solid fa-chevron-left" style={{ fontSize: '16px' }}></i> กลับหน้าแรก
          </button>

          <div className="patient-header-card">
            <h2>ยินดีต้อนรับ คุณ{patient?.fname || 'สิรภพ'} {patient?.lname || 'แก้วทิพย์'}</h2>
            <div className="realtime-clock">{formatThaiDateTime(currentTime)}</div>
            <p className="instruction-subtext">กรุณาเลือกรายการที่ท่านต้องการตรวจวัด</p>
          </div>
          
          <div className="photo-container">
            {/* 🌟 สร้าง Wrapper กรอบจำกัดพื้นที่ เพื่อล็อกปุ่มให้อยู่มุมขวาล่างของรูปเสมอ */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              
              {/* ระบบจะเช็คว่ามีรูปจาก JHCIS ไหม ถ้ามีให้แสดงรูปจริง ถ้าไม่มีให้แสดงไอคอนสีเทา */}
              {patientImage ? (
                <img 
                  src={patientImage} 
                  alt="รูปผู้ป่วยจาก JHCIS" 
                  className="patient-photo-real" 
                />
              ) : (
                <div className="patient-photo-placeholder">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="80px" height="80px">
                     <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                   </svg>
                </div>
              )}

              {/* 🌟 ปุ่มกล้องแบบวงกลมมุมขวาล่าง (ใช้ FontAwesome) */}
              <label 
                style={{
                  position: 'absolute',
                  bottom: '-10px',  // ขยับลงมาเหลื่อมกรอบรูปล่างนิดนึง
                  right: '-15px',   // ขยับไปทางขวาให้ลอยเด่นออกมา
                  width: '45px',
                  height: '45px',
                  backgroundColor: '#2563eb', // สีฟ้า Enterprise
                  color: 'white',
                  borderRadius: '50%',        // ทำให้เป็นวงกลม
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25)', // เงาให้ปุ่มลอยขึ้นมา
                  border: '3px solid white',  // ขอบขาวตัดกับรูปให้ดูพรีเมียม
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  zIndex: 15
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                title="ถ่ายรูปใหม่"
              >
                {/* ถ้ากำลังอัปโหลดให้หมุนๆ ถ้าปกติให้โชว์รูปกล้อง */}
                {isUploadingPhoto ? (
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '18px' }}></i>
                ) : (
                  <i className="fa-solid fa-camera" style={{ fontSize: '18px' }}></i>
                )}
                
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user" 
                  style={{ display: 'none' }} 
                  onChange={handleCapturePhoto}
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>
          </div>

          <div className="device-buttons">
            <button className="btn-device" onClick={connectBluetoothO2} style={{ border: '2px solid #3b82f6' }}>
              อ๊อกซิเจนในเลือด <i className="fa-regular fa-hand-point-up" style={{ color: 'rgb(255, 212, 59)', marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={connectBluetoothWeight} style={{ border: '2px solid #3b82f6' }}>
              ชั่งน้ำหนัก <i className="fa-solid fa-weight-scale" style={{ color: 'rgb(99, 230, 190)', marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={connectBluetoothTemp} style={{ border: '2px solid #3b82f6' }}>
              วัดอุณหภูมิ <i className="fa-solid fa-temperature-low" style={{ color: 'rgb(248, 126, 0)',marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={connectBluetoothBP} style={{ border: '2px solid #3b82f6' }}>
              วัดความดันฯ <i className="fa-solid fa-gauge-high" style={{ color: 'rgb(116, 192, 252)', marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={connectBluetoothSugar} style={{ border: '2px solid #3b82f6' }}>
              น้ำตาลในเลือด <i className="fa-solid fa-droplet" style={{ color: 'rgb(244, 30, 30)', marginLeft: '8px' }}></i>
            </button>
          </div>

          <div className="vitals-container">
            <div className="vitals-grid">
              {[
                { id: 'height', label: 'ส่วนสูง', unit: 'เซนติเมตร', val: vitals.height },
                { id: 'weight', label: 'น้ำหนัก', unit: 'กิโลกรัม', val: vitals.weight },
                { id: 'waist', label: 'รอบเอว', unit: 'เซนติเมตร', val: vitals.waist },
                { id: 'bmi', label: 'ดัชนีมวลกาย', unit: 'กิโลกรัม/เมตร²', val: vitals.bmi },
                { id: 'temp', label: 'อุณหภูมิ', unit: 'องศาเซลเซียส', val: vitals.temp },
                { id: 'spo2', label: 'O₂ sat', unit: '%', val: vitals.spo2 },
                { id: 'sysDia', label: 'ความดันโลหิต', unit: 'มิลลิเมตร/ปรอท', val: vitals.sysDia },
                { id: 'pulse', label: 'ชีพจร', unit: 'ครั้ง/นาที', val: vitals.pulse },
                { id: 'sugar', label: 'น้ำตาลในเลือด', unit: 'มิลลิกรัม/เดซิลิตร', val: vitals.sugar },
              ].map((item, idx) => (
                <div className="vital-cell" key={idx}>
                  <div className="vital-label">{item.label}<br/><small>{item.unit}</small></div>
                  <div className="vital-value-box" style={{ padding: 0, display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={item.val === '---' ? '' : item.val} 
                      onChange={(e) => handleVitalChange(item.id, e.target.value)}
                      onBlur={(e) => { if (e.target.value.trim() === '') handleVitalChange(item.id, '---'); }}
                      placeholder="---"
                      style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', textAlign: 'center', fontSize: '26px', fontWeight: 'bold', color: '#1f2937', outline: 'none' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="assessment-section" style={{ position: 'relative', zIndex: 20, padding: '20px', background: 'white', borderRadius: '15px', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'left' }}>
            <div className="assessment-title" style={{ fontSize: '20px', fontWeight: 'bold', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px', color: '#1F2937' }}>
              <i className="fa-solid fa-stethoscope" style={{ color: '#44bbf3', marginRight: '8px' }}></i> ผลการประเมินภาวะสุขภาพ
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="assessment-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                <i className="fa-solid fa-notes-medical" style={{ fontSize: '32px', color: '#64748b' }}></i>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#475569', fontSize: '16px' }}>โรคประจำตัว</h4>
                  <p style={{ margin: 0, color: patient?.chronic === 'ไม่มีโรคประจำตัว' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '16px' }}>{patient?.chronic || 'กำลังตรวจสอบประวัติ...'}</p>
                </div>
              </div>

              {healthAnalysis.alerts.map((alert, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', background: `${alert.color}15`, borderRadius: '10px' }}>
                  <i className={alert.icon} style={{ fontSize: '32px', color: alert.color, marginTop: '2px' }}></i>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: alert.color, fontSize: '16px' }}>{alert.title}</h4>
                    <p style={{ margin: 0, color: '#374151', fontSize: '15px', fontWeight: alert.isCrit ? 'bold' : 'normal' }}>{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>

              

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '25px' }}>
  <div style={{ display: 'flex', gap: '15px' }}>
    {healthAnalysis.isEmergency && (
      <a href="tel:1669" style={{ flex: 1, padding: '15px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)' }}>
        <i className="fa-solid fa-truck-medical" style={{ fontSize: '24px' }}></i> โทรเรียก 1669 ทันที!
      </a>
    )}
    
    <button 
      onClick={() => setShowTelemedModal(true)}
      style={{ flex: 2, padding: '15px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(2, 132, 199, 0.3)' }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <i className="fa-solid fa-video" style={{ fontSize: '24px' }}></i> ปรึกษาแพทย์ออนไลน์ (Telemedicine)
    </button>
  </div>

  <button 
    onClick={sendToJHCISQueue}
    style={{ width: '100%', padding: '18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}
    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
  >
    <i className="fa-solid fa-server" style={{ fontSize: '24px' }}></i> บันทึกข้อมูลและจัดคิวลง JHCIS
  </button>
</div>
</div>
</main>
)}

      {/* 🟢 Footer แบบทะลุคลิกได้ */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: '15vh', backgroundImage: "url('/footer.png')", backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10, pointerEvents: 'none' }}></div>

      {/* 🟢 โซนปุ่มไอคอนมุมซ้ายล่าง */}
      <div className="bottom-icons" style={{ position: 'fixed', bottom: '20px', left: '25px', display: 'flex', gap: '20px', zIndex: 100 }}>
        <div onClick={() => setShowBluetoothModal(true)} title="จัดการ Bluetooth" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(116, 192, 252)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>
        </div>
        <div onClick={() => { if (showSettings) { setShowSettings(false); } else { setShowPasswordModal(true); setPasswordInput(''); setPasswordError(false); } }} title="ตั้งค่าระบบ" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(116, 192, 252)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
        </div>
      </div>

      <button 
    onClick={async () => {
      setShowAiModal(true);
      setAiLoading(true);
      speak('กำลังส่งข้อมูลให้เอไอประเมิน กรุณารอสักครู่นะคะ');
      try {
        // ยิง API ไปให้ Node.js ประมวลผล
        const res = await axios.post(`${API_BASE_URL}/jhcis-api/ai-analyze`, { vitals }, { headers: { 'x-api-key': API_KEY } });
        setAiResponse(res.data.message);
        speak(res.data.message); // ให้ AI อ่านผลลัพธ์ให้ฟัง!
      } catch (e) {
        setAiResponse("การเชื่อมต่อ AI ขัดข้อง กรุณาปรึกษาเจ้าหน้าที่ค่ะ");
      }
      setAiLoading(false);
    }}
    style={{ width: '100%', padding: '18px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}
  >
    <i className="fa-solid fa-robot" style={{ fontSize: '24px' }}></i> ให้ AI พยาบาลอัจฉริยะวิเคราะห์สุขภาพ
  </button>

      {/* ======================= โซนหน้าต่าง Modal ทั้งหมด ======================= */}

      {/* 🟢 Modal แจ้งผลวิเคราะห์ AI */}
      {showAiModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 99999, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '25px', padding: '40px 30px', width: '90%', maxWidth: '500px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', borderTop: '8px solid #8b5cf6' }}>
            
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px auto', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-robot" style={{ fontSize: '40px', color: '#8b5cf6' }}></i>
            </div>
            
            <h2 style={{ margin: '0 0 15px 0', color: '#1F2937', fontSize: '24px' }}>AI พยาบาลประเมินผล</h2>
            
            {aiLoading ? (
               <div style={{ padding: '20px' }}>
                 <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '30px', color: '#8b5cf6', marginBottom: '15px' }}></i>
                 <p style={{ color: '#6B7280', fontSize: '18px' }}>กำลังวิเคราะห์ข้อมูลสุขภาพของคุณ...</p>
               </div>
            ) : (
               <p style={{ margin: '0 0 25px 0', color: '#374151', fontSize: '18px', lineHeight: '1.6', textAlign: 'left', background: '#F3F4F6', padding: '15px', borderRadius: '12px' }}>
                 {aiResponse}
               </p>
            )}

            <button 
              onClick={() => {
                setShowAiModal(false);
                window.speechSynthesis.cancel(); // ปิดเสียง AI ถ้ากดยกเลิก
              }} 
              style={{ width: '100%', padding: '15px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)' }}
            >
              รับทราบ
            </button>
            
          </div>
        </div>
      )}

      {/* 🟢 Modal ใหม่: กรอกเลขบัตรประชาชนด้วยมือ */}
      {showManualIdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 2000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '35px', color: '#3B82F6' }}></i>
            </div>
            
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#1F2937' }}>ค้นหาประวัติผู้ป่วย</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#6B7280' }}>กรุณากรอกเลขประจำตัวประชาชน 13 หลัก</p>
            
            <input 
              type="tel" 
              maxLength={13}
              autoFocus 
              value={manualIdInput} 
              onChange={(e) => { 
                setManualIdInput(e.target.value.replace(/[^0-9]/g, '')); 
                setManualIdError(''); 
              }} 
              onKeyDown={(e) => { if (e.key === 'Enter') processManualId(); }} 
              style={{ 
                width: '100%', padding: '15px', borderRadius: '12px', 
                border: manualIdError ? '2px solid #EF4444' : '2px solid #D1D5DB', 
                fontSize: '24px', textAlign: 'center', letterSpacing: '2px', 
                boxSizing: 'border-box', outline: 'none', marginBottom: '8px', 
                color: '#1F2937', fontWeight: 'bold' 
              }} 
              placeholder="●●●●●●●●●●●●●"
            />
            
            <div style={{ minHeight: '24px', color: '#EF4444', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>
              {manualIdError}
            </div>
            
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button 
                onClick={() => setShowManualIdModal(false)} 
                style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={processManualId} 
                disabled={loading}
                style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#3B82F6', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'กำลังค้นหา...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Modal ยืนยันการจัดคิว JHCIS */}
      {showConfirmQueueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-clipboard-check" style={{ fontSize: '35px', color: '#10B981' }}></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#1F2937' }}>ยืนยันการบันทึกข้อมูล</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '16px', color: '#4B5563', lineHeight: '1.5' }}>ต้องการบันทึกข้อมูลและส่งเข้าระบบ<br/><strong>JHCIS</strong> ใช่หรือไม่?</p>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button onClick={() => setShowConfirmQueueModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={confirmSendToJHCISQueue} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}>ตกลง</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. หน้าจอ Loading (หมุนๆ) ตอนเซฟข้อมูล */}
      {isSubmitting && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 99999, backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '50px', marginBottom: '20px', color: '#3b82f6' }}></i>
          <h2 style={{ letterSpacing: '1px' }}>กำลังส่งข้อมูลเข้า JHCIS...</h2>
        </div>
      )}

      {/* 3. Pop-up แจ้งผลการส่งข้อมูล */}
      {notifyModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 999999, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '25px', padding: '40px 30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', borderTop: `8px solid ${notifyModal.isSuccess ? '#10B981' : '#EF4444'}` }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px auto', backgroundColor: notifyModal.isSuccess ? '#D1FAE5' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fa-solid ${notifyModal.isSuccess ? 'fa-check' : 'fa-xmark'}`} style={{ fontSize: '40px', color: notifyModal.isSuccess ? '#10B981' : '#EF4444' }}></i>
            </div>
            <h2 style={{ margin: '0 0 10px 0', color: '#1F2937', fontSize: '24px' }}>{notifyModal.title}</h2>
            <p style={{ margin: '0 0 25px 0', color: '#6B7280', fontSize: '16px', lineHeight: '1.5' }}>{notifyModal.message}</p>
            {!notifyModal.isSuccess && (
              <button onClick={() => setNotifyModal(prev => ({ ...prev, show: false }))} style={{ width: '100%', padding: '15px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)' }}>รับทราบและปิดหน้าต่าง</button>
            )}
          </div>
        </div>
      )}

      {/* 4. Modal ตั้งค่า Bluetooth */}
      {showBluetoothModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 3000, backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px', textAlign: 'center', color: 'white' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>อุปกรณ์ที่เชื่อมต่อ Mini Health Station</h2>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>{config.hospName}</p>
            </div>
            
            {/* รายการอุปกรณ์ */}
            <div style={{ padding: '20px', maxHeight: '50vh', overflowY: 'auto', background: '#f8fafc' }}>
              {[
                { key: 'weight', image: '/scale.jpg', label: 'เครื่องชั่งน้ำหนัก (SCALE)', dev: devices.weight, action: connectBluetoothWeight },
                { key: 'temp', image: '/temp.png', label: 'เครื่องวัดอุณหภูมิ (Thermometer)', dev: devices.temp, action: connectBluetoothTemp },
                { key: 'bp', image: '/bp.jpg', label: 'เครื่องวัดความดัน (BP Monitor)', dev: devices.bp, action: connectBluetoothBP },
                { key: 'sugar', image: '/sugar.png', label: 'เครื่องวัดน้ำตาล (Glucose)', dev: devices.sugar, action: connectBluetoothSugar },
                { key: 'o2', image: '/o2.png', label: 'เครื่องวัดออกซิเจน (Oximeter)', dev: devices.o2, action: connectBluetoothO2 }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                  
                  {/* 🖼️ เปลี่ยนกรอบ Emoji เป็นกรอบรูปภาพจริง */}
                  <div style={{ marginRight: '15px', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <img src={item.image} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                  </div>
                  
                  {/* ข้อความชื่ออุปกรณ์ */}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: item.dev ? '#10b981' : '#94a3b8', marginTop: '3px' }}>
                      {item.dev ? `Device Name :: ${item.dev}` : 'ยังไม่ได้จับคู่อุปกรณ์'}
                    </div>
                  </div>
                  
                  {/* 🔘 สวิตช์เปิด-ปิด (Toggle Switch) สไตล์ iOS */}
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: '10px' }}>
                    <input 
                      type="checkbox" 
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      checked={item.dev !== ''} 
                      onChange={(e) => {
                        if (e.target.checked) item.action();
                        else updateDeviceName(item.key, '');
                      }}
                    />
                    <div style={{ width: '52px', height: '30px', backgroundColor: item.dev !== '' ? '#3b82f6' : '#cbd5e1', borderRadius: '32px', transition: 'background-color 0.3s ease', position: 'relative', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div style={{ position: 'absolute', top: '3px', left: item.dev !== '' ? '25px' : '3px', width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                    </div>
                  </label>

                </div>
              ))}
            </div>
            
            {/* Footer ย้อนกลับ */}
            <div style={{ padding: '15px 20px', background: '#f1f5f9', display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setShowBluetoothModal(false)} style={{ background: '#64748b', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                &lt;&lt; ย้อนกลับ
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 5. Modal วิดีโอคอล Telemedicine */}
      {showTelemedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 3000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90vw', height: '85vh', background: '#1e293b', borderRadius: '25px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', border: '1px solid #334155' }}>
            <div style={{ padding: '18px 25px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                <i className="fa-solid fa-circle" style={{ color: '#ef4444', fontSize: '12px', animation: 'blink 1s infinite' }}></i>
                <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>ระบบแพทย์ทางไกล รพ.สต.ทับพริก (Telemedicine Station)</span>
              </div>
              <button onClick={() => setShowTelemedModal(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-phone-slash"></i> วางสาย / กลับหน้าหลัก
              </button>
            </div>
            <iframe src="https://meet.jit.si/ThapPhrikHealthStationTelemedRoom#config.disableDeepLinking=true&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.TOOLBAR_BUTTONS=['microphone','camera','fullscreen','hangup']" allow="camera; microphone; fullscreen; display-capture; autoplay" style={{ width: '100%', flex: 1, border: 'none', background: '#0f172a' }}></iframe>
          </div>
        </div>
      )}

      {/* 6. Modal แจ้งเตือนความดันวิกฤต 1669 */}
      {showEmergencyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(220, 38, 38, 0.85)', zIndex: 9999, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '25px', padding: '40px', width: '90%', maxWidth: '500px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '5px solid #f87171' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '80px', color: '#dc2626', marginBottom: '15px' }}></i>
            <h1 style={{ color: '#dc2626', fontSize: '32px', margin: '0 0 10px 0' }}>อันตราย! ความดันสูงวิกฤต</h1>
            <p style={{ fontSize: '20px', color: '#1f2937', marginBottom: '30px', fontWeight: 'bold', lineHeight: '1.5' }}>ค่าความดันของคุณคือ <span style={{ color: '#dc2626', fontSize: '28px' }}>{vitals.sysDia}</span> <br/>มีความเสี่ยงต่อภาวะเส้นเลือดในสมองแตก!<br/>กรุณานั่งพักและติดต่อเจ้าหน้าที่ทันที</p>
            <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
              <a href="tel:1669" style={{ width: '100%', padding: '18px', background: '#dc2626', color: 'white', borderRadius: '15px', textDecoration: 'none', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><i className="fa-solid fa-phone-volume"></i> โทรสายด่วน 1669</a>
              <button onClick={() => setShowEmergencyModal(false)} style={{ width: '100%', padding: '15px', background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '15px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>รับทราบและปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal รหัสผ่าน */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="#F43F5E"><path d="M12 2C9.24 2 7 4.24 7 7V9H6C4.9 9 4 9.9 4 11V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V11C20 9.9 19.1 9 18 9H17V7C17 4.24 14.76 2 12 2ZM9 7C9 5.34 10.34 4 12 4C13.66 4 15 5.34 15 7V9H9V7ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17Z"/></svg></div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1F2937' }}>ตั้งค่าระบบ Kiosk</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6B7280' }}>กรุณาใส่รหัสผ่านเพื่อเข้าถึงข้อมูล</p>
            <input type="password" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }} onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: passwordError ? '2px solid #F43F5E' : '1px solid #D1D5DB', fontSize: '24px', textAlign: 'center', letterSpacing: '5px', boxSizing: 'border-box', outline: 'none', marginBottom: '8px' }} />
            <div style={{ height: '20px', color: '#F43F5E', fontSize: '13px', marginBottom: '10px' }}>{passwordError ? 'รหัสผ่านไม่ถูกต้อง!' : ''}</div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#F3F4F6', color: '#374151', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handlePasswordSubmit} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#4F46E5', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;