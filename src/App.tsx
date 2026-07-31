import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// 🛡️ God-Tier Security: ควรย้าย Key ไว้ในไฟล์ .env (เช่น VITE_API_KEY) เพื่อไม่ให้หลุดตอน Build
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.miniheealthstation.com';
const API_KEY = import.meta.env.VITE_API_KEY || 'ThapPhrik_Secret_Key_9988';
// 🛡️ ตั้งรหัสผ่าน Admin สำหรับ Kiosk ไว้ที่ตัวแปร (หรือ .env) ไม่ฝังตรงๆ ในเงื่อนไข
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || 'Admin00000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 🟢 State Management
  const [adminTab, setAdminTab] = useState<'settings' | 'data'>('settings');
  const [offlineQueue, setOfflineQueue] = useState<any[]>(JSON.parse(localStorage.getItem('offline_queue') || '[]'));
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // 🟢 Modals
  const [showTelemedModal, setShowTelemedModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showConfirmQueueModal, setShowConfirmQueueModal] = useState(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showManualIdModal, setShowManualIdModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifyModal, setNotifyModal] = useState({ show: false, isSuccess: true, title: '', message: '' });
  const [guideModal, setGuideModal] = useState<{show: boolean, type: string, title: string, gifUrl: string, desc: string, action: Function | null}>({
    show: false, type: '', title: '', gifUrl: '', desc: '', action: null
  });

  const [manualIdInput, setManualIdInput] = useState('');
  const [manualIdError, setManualIdError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);

  // 🧹 ใช้งาน useRef เพื่อเก็บอุปกรณ์ Bluetooth ป้องกัน Phantom Listener Bug
  const connectedBleDevices = useRef<BluetoothDevice[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<{ [key: string]: string }>({});

  const [customLogo, setCustomLogo] = useState(localStorage.getItem('custom_logo') || '/TK.png');
  const [customVideo, setCustomVideo] = useState(localStorage.getItem('custom_video') || '/bg-video.mp4');

  const [devices, setDevices] = useState({
    weight: localStorage.getItem('dev_weight') || '',
    temp: localStorage.getItem('dev_temp') || '',
    bp: localStorage.getItem('dev_bp') || '',
    sugar: localStorage.getItem('dev_sugar') || '',
    o2: localStorage.getItem('dev_o2') || ''
  });

  // 🛡️ นำ DB Credential ออกจาก UI ป้องกันช่องโหว่ร้ายแรง
  const [config, setConfig] = useState({
    nhsoToken: localStorage.getItem('config_token') || '',
    hospName: localStorage.getItem('config_hospName') || 'โรงพยาบาลส่งเสริมสุขภาพตำบลทับพริก [02506]'
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const initialVitals = { height: '---', weight: '---', waist: '---', bmi: '---', temp: '---', spo2: '---', sysDia: '---', pulse: '---', sugar: '---' };
  const [vitals, setVitals] = useState(initialVitals);

  // ==========================================
  // 🧠 สถาปัตยกรรมป้องกัน AI DoS (Debounce 3 วินาที)
  // ==========================================
  useEffect(() => {
    // ถ้ายกเลิก/ยังไม่มีค่า ห้ามเรียก AI
    if (!isLoggedIn || (vitals.sysDia === '---' && vitals.weight === '---' && vitals.sugar === '---')) return;

    setAiLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/jhcis-api/ai-analyze`, { vitals }, { headers: { 'x-api-key': API_KEY } });
        setAiResponse(res.data.message);
        speak(res.data.message); 
      } catch (e) {
        setAiResponse("ระบบผู้ช่วยแพทย์ติดภารกิจชั่วคราว");
      } finally {
        setAiLoading(false);
      }
    }, 3000); // ⏱️ รอให้ตัวเลขสายบลูทูธนิ่ง 3 วินาที ค่อยยิง API 

    return () => clearTimeout(timeoutId);
  }, [vitals.sysDia, vitals.weight, vitals.sugar, isLoggedIn]);

  // 🚨 ระบบตรวจสอบความดันวิกฤต (เฝ้าระวังแบบ Real-time)
  useEffect(() => {
    if (vitals.sysDia !== '---') {
      const [sys, dia] = vitals.sysDia.split('/').map(Number);
      if (sys >= 180 || dia >= 120) {
        setShowEmergencyModal(true);
        speak('อันตราย ความดันโลหิตของคุณสูงถึงขั้นวิกฤต กรุณานั่งพัก และแจ้งเจ้าหน้าที่ทันทีค่ะ'); 
      } else {
        setShowEmergencyModal(false);
      }
    }
  }, [vitals.sysDia]);

  // ==========================================
  // 🧹 คลีนอัพและเคลียร์ State (แก้บั๊กข้อมูลคนไข้ปนกัน)
  // ==========================================
  const handleLogout = () => {
    // 1. ตัดสายอุปกรณ์บลูทูธที่ค้างอยู่ ป้องกัน Phantom Notification
    connectedBleDevices.current.forEach(device => {
       if (device.gatt?.connected) device.gatt.disconnect();
    });
    connectedBleDevices.current = [];

    // 2. เคลียร์ State ป้องกัน Data Leak
    setIsLoggedIn(false);
    setPatient(null);
    setPatientPhoto(null);
    setPatientImage(null); 
    setIsTestingMode(false);
    setVitals(initialVitals);
    setAiResponse('');
  };

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 >= 5) {
      setShowSettings(true);    
      setAdminTab('data');      
      setAdminClicks(0);
      speak("เข้าสู่โหมดผู้ดูแลระบบ");
    }
  };

  const fetchPatientPhoto = async (cid: string) => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_BASE_URL}/jhcis-api/photo/${cid}?t=${timestamp}`, {
        method: 'GET', headers: { 'x-api-key': API_KEY }
      });
      if (response.ok) {
        const data = await response.json();
        setPatientImage(data.success && data.image ? `data:image/jpeg;base64,${data.image}` : null);
      } else setPatientImage(null); 
    } catch (error) { setPatientImage(null); }
  };

  const handleCapturePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setPatientImage(compressedBase64); 
        
        const currentCid = patient?.cid;
        if (!currentCid) return;

        try {
          setIsUploadingPhoto(true);
          const response = await fetch(`${API_BASE_URL}/jhcis-api/upload-photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ cid: currentCid, image: compressedBase64 })
          });
          const data = await response.json();
          if (data.success) alert('📸 บันทึกรูปภาพลงฐานข้อมูลสำเร็จ!');
          else alert(`❌ บันทึกรูปไม่สำเร็จ: ${data.message}`);
        } catch (error: any) {
          alert(`❌ การเชื่อมต่อล้มเหลว: ${error.message}`);
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

  // 🎯 God-Tier Data Integrity: รวมเหลือฟังก์ชันเดียว และล้าง Vitals ทันทีเมื่อเรียกใช้
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

      // 🧹 ล้างกระดาน: ป้องกันข้อมูลคนไข้เก่าปะปน
      setVitals(initialVitals);
      setAiResponse('');

      try {
        const jhcisResponse = await axios.get(`${API_BASE_URL}/jhcis-api/patient/${cid}`, { headers: { 'x-api-key': API_KEY }, timeout: 4000 });
        if (jhcisResponse.data.success) {
          setPatient({ ...jhcisResponse.data.data, cid: cid }); 
        } else {
          setPatient({ cid: cid, fname: cardData.fname, lname: cardData.lname, chronic: 'ไม่มีประวัติในระบบ' });
        }
      } catch (dbError) {
        setPatient({ cid: cid, fname: cardData.fname, lname: cardData.lname, chronic: 'ไม่สามารถดึงข้อมูลโรคได้' });
      }

      axios.post('http://localhost:8189/api/nhso-authen', { pid: cid, claimType: "PG0060001", mobile: "0000000000", correlationId: "MiniHealthStation-001" }).catch(() => {});

      await fetchPatientPhoto(cid); 
      setIsLoggedIn(true);
    } catch (error) {
      alert("ระบบประมวลผลขัดข้อง");
    } finally {
      setLoading(false);
    }
  };

  const processManualId = async () => {
    if (manualIdInput.length !== 13) { setManualIdError('กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก'); return; }
    setLoading(true); setManualIdError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/jhcis-api/patient/${manualIdInput}`, { headers: { 'x-api-key': API_KEY }, timeout: 5000 });
      if (response.data.success) {
        // 🧹 ล้างกระดาน Vitals (Cross-Patient Contamination Prevention)
        setVitals(initialVitals);
        setAiResponse('');
        setPatient({ ...response.data.data, cid: manualIdInput });
        await fetchPatientPhoto(manualIdInput); 
        setIsTestingMode(true); 
        setIsLoggedIn(true);
        setShowManualIdModal(false); 
        setManualIdInput(''); 
      }
    } catch (err: any) {
      setManualIdError(err.response?.status === 404 ? 'ไม่พบข้อมูลในระบบ JHCIS' : 'การเชื่อมต่อขัดข้อง');
    } finally { setLoading(false); }
  };

  const handleManualRead = async () => {
    setLoading(true);
    try {
      // ⚠️ บราวเซอร์อาจแจ้งเตือน Mixed Content (HTTPS to HTTP) ให้ยอมรับที่หน้าเบราว์เซอร์
      const response = await axios.get('http://localhost:8189/api/smartcard/read?readImageFlag=true');
      if (response.data && response.data.pid) processCardData(response.data);
      else alert('กรุณาสอดบัตรประชาชนให้แน่น แล้วคลิกอีกครั้งครับ');
    } catch (e) { alert('ไม่สามารถเชื่อมต่อเครื่องอ่านบัตรได้'); } 
    finally { setLoading(false); }
  };

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

  // ==========================================
  // 🚀 สถาปัตยกรรม Bluetooth API
  // ==========================================
  const trackDevice = (device: BluetoothDevice) => {
    if (!connectedBleDevices.current.includes(device)) connectedBleDevices.current.push(device);
  };

  const connectBluetoothO2 = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['pulse_oximeter'] });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('pulse_oximeter');
      const characteristic = await service?.getCharacteristic('plx_continuous_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        if (!isLoggedIn) return; // 🛡️ ป้องกัน Phantom
        const value = event.target.value;
        setVitals(prev => ({ ...prev, spo2: value.getUint8(1).toString(), pulse: value.getUint8(3).toString() }));
      });
      trackDevice(device);
      updateDeviceName('o2', device.name || 'Yuwell Oximeter');
      alert('✅ เชื่อมต่อสำเร็จ!');
    } catch (error) { alert('❌ ยกเลิกหรือเชื่อมต่อไม่สำเร็จ'); }
  };

  const connectBluetoothWeight = async () => {
    let heartbeatInterval: NodeJS.Timeout | null = null; 
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [0xA602] });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService(0xA602);
      const characteristics = await service?.getCharacteristics();
      trackDevice(device);

      const mainWritePipe = characteristics?.find(c => c.properties.write || c.properties.writeWithoutResponse);
      const notifyPipes = characteristics?.filter(c => c.properties.notify || c.properties.indicate) || [];

      const processMedicalData = async (rawData: Uint8Array) => {
        if (!isLoggedIn) return; // 🛡️ ป้องกัน Phantom
        const hexStr = Array.from(rawData).map(b => b.toString(16).padStart(2, '0')).join(' ');
        if (hexStr.includes("00 00 00 00 00 00 00 00") || hexStr.includes("10 0a 00 07 00 00")) return;
        if (rawData.length >= 3 && rawData[0] === 0x00 && rawData[1] === 0x01) {
          injectProfile(mainWritePipe); return;
        }

        let extractedWeight = 0;
        if (rawData.length >= 12 && rawData[0] === 0x10) {
           if (rawData[1] === 0x11 || rawData.length >= 19) extractedWeight = ((rawData[10] << 8) | rawData[11]) * 0.01;
           else if (rawData[1] === 0x0a) extractedWeight = ((rawData[4] << 8) | rawData[5]) * 0.01;
        }

        if (extractedWeight > 5.0 && extractedWeight < 300.0) {
           const finalWeight = extractedWeight.toFixed(2);
           setVitals(prev => {
              if (prev.weight === finalWeight) return prev; 
              const h = parseFloat(prev.height) / 100;
              return { ...prev, weight: finalWeight, bmi: h > 0 ? (extractedWeight / (h * h)).toFixed(2) : '---' };
           });
        }
      };

      const injectProfile = async (pipe: BluetoothRemoteGATTCharacteristic | undefined) => {
        if (!pipe) return;
        const profilePayload = new Uint8Array([0xFE, 0x01, 0x01, 0x1E, 0xAA, 0x3E, 0x00, 0x00]);
        try {
          if (pipe.properties.writeWithoutResponse) await pipe.writeValueWithoutResponse(profilePayload);
          else await pipe.writeValue(profilePayload);
        } catch (e) { }
      };

      for (const char of notifyPipes) {
        try {
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (e: any) => processMedicalData(new Uint8Array(e.target.value.buffer)));
        } catch (e) {}
      }

      if (mainWritePipe) {
        const bootSequence = [ new Uint8Array([0xFD, 0x37]), new Uint8Array([0x01, 0x00]) ];
        for (const cmd of bootSequence) {
           try {
             if (mainWritePipe.properties.writeWithoutResponse) await mainWritePipe.writeValueWithoutResponse(cmd);
             else await mainWritePipe.writeValue(cmd);
           } catch(e) { }
        }
        await injectProfile(mainWritePipe);
        heartbeatInterval = setInterval(async () => {
            try {
              const ping = new Uint8Array([0x00]); 
              if (mainWritePipe.properties.writeWithoutResponse) await mainWritePipe.writeValueWithoutResponse(ping);
              else await mainWritePipe.writeValue(ping);
            } catch(e) {}
         }, 1000); 
      }
      device.addEventListener('gattserverdisconnected', () => { if (heartbeatInterval) clearInterval(heartbeatInterval); });
      updateDeviceName('weight', device.name || 'ALLWELL Scale');
      alert(`✅ เชื่อมต่อเครื่องชั่งสำเร็จ!`);

    } catch (error) { if (heartbeatInterval) clearInterval(heartbeatInterval); }
  };

  const connectBluetoothTemp = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'Yuwell HT' }], optionalServices: ['health_thermometer'] });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('health_thermometer');
      const characteristic = await service?.getCharacteristic('temperature_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        if (!isLoggedIn) return; // 🛡️ ป้องกัน Phantom
        const value = event.target.value;
        const mantissa = value.getUint8(1) | (value.getUint8(2) << 8) | (value.getUint8(3) << 16);
        const exponent = value.getInt8(4);
        setVitals(prev => ({ ...prev, temp: (mantissa * Math.pow(10, exponent)).toFixed(1) }));
      });
      trackDevice(device);
      updateDeviceName('temp', device.name || 'Yuwell Temp');
      alert('✅ เชื่อมต่อเครื่องวัดอุณหภูมิสำเร็จ!');
    } catch (error) { alert('❌ ยกเลิกหรือเชื่อมต่อไม่สำเร็จ'); }
  };

  const connectBluetoothSugar = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'Yuwell Glucose' }], optionalServices: ['glucose'] });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('glucose');
      const characteristic = await service?.getCharacteristic('glucose_measurement');
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        if (!isLoggedIn) return; // 🛡️ ป้องกัน Phantom
        const value = event.target.value;
        setVitals(prev => ({ ...prev, sugar: value.getUint16(10, true).toString() }));
      });
      trackDevice(device);
      updateDeviceName('sugar', device.name || 'Yuwell Glucose');
      alert('✅ เชื่อมต่อเครื่องวัดน้ำตาลสำเร็จ!');
    } catch (error) { alert('❌ ยกเลิกหรือเชื่อมต่อไม่สำเร็จ'); }
  };

  const parseBPData = (dataView: DataView) => {
    let offset = 0;
    const flags = dataView.getUint8(offset++);
    const isKpa = (flags & 0x01) !== 0; 
    const hasTimestamp = (flags & 0x02) !== 0; 
    const hasPulseRate = (flags & 0x04) !== 0; 

    const readSfloat = (view: DataView, pos: number) => {
      const raw = view.getUint16(pos, true); 
      let exponent = raw >> 12;              
      if (exponent >= 8) exponent = -((~exponent & 0x0F) + 1);
      return (raw & 0x0FFF) * Math.pow(10, exponent);
    };

    const sys = readSfloat(dataView, offset); offset += 2;
    const dia = readSfloat(dataView, offset); offset += 2;
    offset += 2; 
    if (hasTimestamp) offset += 7; 
    return { sys, dia, pulse: hasPulseRate ? readSfloat(dataView, offset) : 0, isKpa };
  };

  const connectBluetoothBP = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['blood_pressure'] });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('blood_pressure');
      const characteristic = await service?.getCharacteristic('blood_pressure_measurement');

      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        if (!isLoggedIn) return; // 🛡️ ป้องกัน Phantom
        const bpData = parseBPData(new DataView(event.target.value.buffer));
        const finalSys = bpData.isKpa ? (bpData.sys * 7.50062).toFixed(0) : bpData.sys.toFixed(0);
        const finalDia = bpData.isKpa ? (bpData.dia * 7.50062).toFixed(0) : bpData.dia.toFixed(0);
        
        setVitals(prev => ({ ...prev, sysDia: `${finalSys}/${finalDia}`, pulse: bpData.pulse.toFixed(0) }));
      });

      trackDevice(device);
      updateDeviceName('bp', device.name || 'YUWELL BP'); 
      alert(`✅ จับคู่อุปกรณ์สำเร็จ!`);
    } catch (error) { console.error("BLE Error (BP):", error); }
  };

  // 🤖 3. [God-Tier] Aggressive Polling Daemon (บอทตามล่าข้อมูลความดัน 24 ชม.)
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isConnecting = false;

    const huntForBP = async () => {
      if (!isLoggedIn || isConnecting) return;
      try {
        if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return;
        const devices = await navigator.bluetooth.getDevices();
        const bpDevice = devices.find(d => d.name && d.name.includes('YUWELL'));
        
        if (!bpDevice || bpDevice.gatt?.connected) return;

        isConnecting = true;
        const server = await bpDevice.gatt?.connect();
        const service = await server?.getPrimaryService('blood_pressure');
        const characteristic = await service?.getCharacteristic('blood_pressure_measurement');
        
        await characteristic?.startNotifications();
        characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
          if (!isLoggedIn) return; 
          const bpData = parseBPData(new DataView(event.target.value.buffer));
          const finalSys = bpData.isKpa ? (bpData.sys * 7.50062).toFixed(0) : bpData.sys.toFixed(0);
          const finalDia = bpData.isKpa ? (bpData.dia * 7.50062).toFixed(0) : bpData.dia.toFixed(0);
          const finalPulse = bpData.pulse.toFixed(0);

          setVitals(prev => ({ ...prev, sysDia: `${finalSys}/${finalDia}`, pulse: finalPulse }));
          speak(`วัดความดันเสร็จสิ้น ความดันโลหิต ${finalSys} ตัวล่าง ${finalDia} ชีพจร ${finalPulse} ครั้งต่อนาทีค่ะ`);
        });

        bpDevice.addEventListener('gattserverdisconnected', () => { isConnecting = false; }, { once: true });
        trackDevice(bpDevice);

      } catch (error) { isConnecting = false; }
    };

    if (isLoggedIn) pollInterval = setInterval(huntForBP, 3000);
    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [isLoggedIn]);

  // ==========================================
  // ⚙️ Settings / UI Helpers
  // ==========================================
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
      if (file.size > 5 * 1024 * 1024) { alert("⚠️ ขนาดไฟล์เกิน 5MB ป้องกันระบบ Crash"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomVideo(reader.result as string);
        try { localStorage.setItem('custom_video', reader.result as string); } 
        catch (err) { alert("⚠️ พื้นที่ในบราวเซอร์ไม่พอจัดเก็บวิดีโอ (Storage Quota Exceeded)"); }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('config_token', config.nhsoToken);
    localStorage.setItem('config_hospName', config.hospName);
    alert('✅ บันทึกการตั้งค่าเรียบร้อยแล้ว');
    setShowSettings(false);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PIN) {
      setShowSettings(true); setShowPasswordModal(false); setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  const handleVitalChange = (field: string, value: string) => {
    setVitals(prev => {
      let finalValue = value;
      if (field === 'sysDia') {
        finalValue = finalValue.replace(/[^\d/]/g, '');
        const isDeleting = prev.sysDia !== '---' && finalValue.length < prev.sysDia.length;
        if (!isDeleting && finalValue.length === 3 && !finalValue.includes('/')) finalValue += '/';
        if (finalValue.split('/').length > 2) finalValue = prev.sysDia;
      }

      const newVitals = { ...prev, [field]: finalValue };
      if (field === 'height' || field === 'weight') {
        const h = parseFloat(field === 'height' ? finalValue : prev.height) / 100;
        const w = parseFloat(field === 'weight' ? finalValue : prev.weight);
        newVitals.bmi = (h > 0 && w > 0) ? (w / (h * h)).toFixed(2) : '---';
      }
      return newVitals;
    });
  };

  const sendToJHCISQueue = () => {
    if (!patient?.cid) { alert("⚠️ ไม่พบข้อมูลบัตรประชาชน กรุณาเสียบบัตรใหม่อีกครั้ง"); return; }
    setShowConfirmQueueModal(true);
  };

  const confirmSendToJHCISQueue = async () => {
    setShowConfirmQueueModal(false); 
    setIsSubmitting(true); 

    const payload = {
      cid: patient.cid,
      weight: vitals.weight === '' || vitals.weight === '---' ? 0 : parseFloat(vitals.weight),
      height: vitals.height === '' || vitals.height === '---' ? 0 : parseFloat(vitals.height),
      sysDia: vitals.sysDia === '---' ? '' : vitals.sysDia, 
      pulse: vitals.pulse === '' || vitals.pulse === '---' ? 0 : parseInt(vitals.pulse),
    };
    
    try {
      const response = await axios.post(`${API_BASE_URL}/jhcis-api/queue`, payload, { headers: { 'x-api-key': API_KEY }, timeout: 5000 });
      if (response.data || response.status === 200) {
        speak('บันทึกข้อมูลและจัดคิวเข้าสู่ระบบสำเร็จ ขอบคุณที่ใช้บริการค่ะ');
        setNotifyModal({ show: true, isSuccess: true, title: 'จัดคิวสำเร็จ!', message: 'ส่งข้อมูลผู้ป่วยเข้าสู่ระบบ JHCIS เรียบร้อยแล้ว' });
        setTimeout(() => setNotifyModal(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      const savedOffline = JSON.parse(localStorage.getItem('offline_queue') || '[]');
      savedOffline.push({ ...payload, name: `${patient.fname} ${patient.lname}`, timestamp: new Date().toLocaleString('th-TH') });
      localStorage.setItem('offline_queue', JSON.stringify(savedOffline));
      setOfflineQueue(savedOffline); 

      speak('การเชื่อมต่อขัดข้อง แต่ระบบได้บันทึกข้อมูลสำรองไว้ในเครื่องแล้วค่ะ ไม่ต้องกังวลนะคะ');
      setNotifyModal({ show: true, isSuccess: true, title: 'บันทึกออฟไลน์สำเร็จ (เน็ตขัดข้อง)', message: 'ระบบเก็บข้อมูลของท่านไว้ใน Kiosk อย่างปลอดภัยแล้ว' });
      setTimeout(() => setNotifyModal(prev => ({ ...prev, show: false })), 4000);
    } finally { setIsSubmitting(false); }
  };

  const openGuideModal = (type: string) => {
    let title = '', gifUrl = '', desc = '', action = null;
    switch(type) {
      case 'bp': title = 'วิธีวัดความดันโลหิต'; gifUrl = '/guide-bp.gif'; desc = 'สอดแขนเข้าไปในอุโมงค์ นั่งหลังตรง แล้วอยู่นิ่งๆ ค่ะ'; action = connectBluetoothBP; break;
      case 'o2': title = 'วิธีวัดออกซิเจนปลายนิ้ว'; gifUrl = '/guide-o2.gif'; desc = 'สอดนิ้วชี้เข้าไปในเครื่องให้สุด แล้วอยู่นิ่งๆ ค่ะ'; action = connectBluetoothO2; break;
      case 'weight': title = 'วิธีชั่งน้ำหนัก'; gifUrl = '/guide-weight.gif'; desc = 'ถอดรองเท้า แล้วก้าวขึ้นยืนบนเครื่องชั่งน้ำหนักค่ะ'; action = connectBluetoothWeight; break;
      case 'temp': title = 'วิธีวัดอุณหภูมิ'; gifUrl = '/guide-temp.gif'; desc = 'นำเครื่องจ่อหน้าผาก แล้วกดปุ่มวัดค่ะ'; action = connectBluetoothTemp; break;
      case 'sugar': title = 'วิธีวัดน้ำตาลในเลือด'; gifUrl = '/guide-sugar.gif'; desc = 'เจาะปลายนิ้วด้านข้าง แล้วบีบเลือดลงบนแผ่นตรวจค่ะ'; action = connectBluetoothSugar; break;
    }
    setGuideModal({ show: true, type, title, gifUrl, desc, action });
    speak(desc);
  };

  const handleStartDeviceConnection = async () => {
    if (guideModal.action) { setGuideModal({ ...guideModal, show: false }); await guideModal.action(); }
  };

  const b64toBlob = (b64Data: string, contentType = 'audio/wav', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const speak = async (text: string) => {
    if (!text) return;
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    try {
      let audioUrl = audioCacheRef.current[text];
      if (!audioUrl) {
        const response = await axios.post(`${API_BASE_URL}/jhcis-api/tts`, { text }, { headers: { 'x-api-key': API_KEY } });
        if (response.data.success && response.data.audioContent) {
          audioUrl = URL.createObjectURL(b64toBlob(response.data.audioContent, 'audio/mp3'));
          audioCacheRef.current[text] = audioUrl; 
        }
      }
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.15; 
        currentAudioRef.current = audio;
        audio.play().catch(e => console.log("Audio play blocked:", e));
      }
    } catch (error) { console.error("TTS Error:", error); }
  };

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isLoggedIn) { speak('หมดเวลาทำรายการ ระบบได้ล้างข้อมูลเพื่อความปลอดภัยแล้วค่ะ'); handleLogout(); }
      }, 600000); 
    };
    window.addEventListener('mousemove', resetTimer); window.addEventListener('touchstart', resetTimer); window.addEventListener('keydown', resetTimer);
    resetTimer(); 
    return () => {
      window.removeEventListener('mousemove', resetTimer); window.removeEventListener('touchstart', resetTimer); window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeoutId);
    };
  }, [isLoggedIn]);

  const analyzeHealth = () => {
    let alerts = [];
    let isEmergency = false;
    if (vitals.height !== '---' && vitals.weight !== '---') {
      const h = parseFloat(vitals.height) / 100, w = parseFloat(vitals.weight);
      if (h > 0 && w > 0) {
        const bmi = (w / (h * h)).toFixed(2);
        if (Number(bmi) >= 30) alerts.push({ icon: 'fa-solid fa-triangle-exclamation', title: `โรคอ้วนระดับ 2 (BMI: ${bmi})`, desc: 'เสี่ยงโรคแทรกซ้อนสูงมาก', color: '#dc2626' });
        else if (Number(bmi) >= 25) alerts.push({ icon: 'fa-solid fa-circle-exclamation', title: `โรคอ้วนระดับ 1 (BMI: ${bmi})`, desc: 'ควรควบคุมอาหาร', color: '#ea580c' });
        else if (Number(bmi) >= 23) alerts.push({ icon: 'fa-solid fa-bell', title: `น้ำหนักเกิน (BMI: ${bmi})`, desc: 'ควรระวังเรื่องอาหาร', color: '#ca8a04' });
        else if (Number(bmi) >= 18.5) alerts.push({ icon: 'fa-solid fa-circle-check', title: `น้ำหนักปกติ (BMI: ${bmi})`, desc: 'รักษาสุขภาพได้ดีมากครับ', color: '#16a34a' });
        else alerts.push({ icon: 'fa-solid fa-circle-info', title: `ต่ำกว่าเกณฑ์ (BMI: ${bmi})`, desc: 'ควรทานอาหารเพิ่ม', color: '#2563eb' });
      }
    }
    if (vitals.sysDia !== '---') {
      const [sys, dia] = vitals.sysDia.split('/').map(Number);
      if (sys >= 180 || dia >= 120) {
        isEmergency = true;
        alerts.push({ icon: 'fa-solid fa-heart-crack', title: 'ความดันสูงวิกฤต!', desc: 'เสี่ยงหลอดเลือดสมองแตก โทร 1669 ทันที', color: '#dc2626', isCrit: true });
      } else if (sys >= 140 || dia >= 90) alerts.push({ icon: 'fa-solid fa-heart-circle-exclamation', title: 'ความดันสูง', desc: 'ควรพบแพทย์ประเมิน', color: '#ea580c' });
      else if (sys <= 90 || dia <= 60) alerts.push({ icon: 'fa-solid fa-heart-circle-minus', title: 'ความดันต่ำ', desc: 'อาจมีอาการหน้ามืด ควรพักผ่อน', color: '#2563eb' });
      else alerts.push({ icon: 'fa-solid fa-heart-circle-check', title: 'ความดันปกติ', desc: 'อยู่ในเกณฑ์ที่ดีครับ', color: '#16a34a' });
    }
    return { alerts, isEmergency };
  };

  const healthAnalysis = analyzeHealth();

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', position: 'fixed', top: 0, left: 0, margin: 0, padding: 0 }}>
      
      <header className="header-bg" style={{ position: 'relative', zIndex: 5 }}>
        <div className="header-logo">
           <img src={customLogo} alt="โลโก้หน่วยงาน" onClick={handleLogoClick} />
        </div>
        <h1 className="aurora-text">Mini Health Station</h1>
        <p>{config.hospName}</p>
      </header>

      {/* ปุ่มกลับหน้าแรกที่มุมบนซ้าย */}
      {isLoggedIn && !showSettings && (
        <button 
          onClick={handleLogout}
          style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 9999, padding: '12px 24px', backgroundColor: 'white', color: '#0284c7', border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'all 0.2s ease-in-out' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'white'; }}
        >
          <i className="fa-solid fa-chevron-left" style={{ fontSize: '16px' }}></i> กลับหน้าแรก
        </button>
      )}

      {showSettings ? (
        <main className="dashboard-screen" style={{ textAlign: 'left', padding: '40px', flex: 1, overflowY: 'auto', paddingBottom: '15vh' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #EEE', paddingBottom: '10px' }}>
              <button onClick={() => setAdminTab('settings')} style={{ flex: 1, padding: '10px', background: adminTab === 'settings' ? '#007AFF' : '#f1f5f9', color: adminTab === 'settings' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ ตั้งค่าระบบ</button>
              <button onClick={() => setAdminTab('data')} style={{ flex: 1, padding: '10px', background: adminTab === 'data' ? '#10b981' : '#f1f5f9', color: adminTab === 'data' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📊 ข้อมูลค้างส่ง (Offline)</button>
            </div>

            {adminTab === 'settings' ? (
              <>
                <h2 style={{ color: '#007AFF', marginBottom: '20px', borderBottom: '2px solid #EEE', paddingBottom: '10px' }}> ตั้งค่าระบบ (Settings)</h2>
                <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}> เปลี่ยนรูปโลโก้</label><input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'block', width: '100%', padding: '10px', background: '#F2F2F7', borderRadius: '8px' }} /></div>
                <div style={{ marginBottom: '20px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}> เปลี่ยนวิดีโอพื้นหลัง (ไม่เกิน 5MB)</label><input type="file" accept="video/mp4" onChange={handleVideoUpload} style={{ display: 'block', width: '100%', padding: '10px', background: '#F2F2F7', borderRadius: '8px' }} /></div>
                <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ชื่อหน่วยงาน</label><input type="text" value={config.hospName} onChange={(e) => setConfig({...config, hospName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                <div style={{ marginBottom: '30px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>NHSO Token</label><input type="text" value={config.nhsoToken} onChange={(e) => setConfig({...config, nhsoToken: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px' }} /></div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button onClick={() => setShowSettings(false)} style={{ padding: '12px 30px', background: '#8E8E93', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>ยกเลิก</button>
                  <button onClick={saveConfig} style={{ padding: '12px 30px', background: '#34C759', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>💾 บันทึก</button>
                </div>
              </>
            ) : (
              <div>
                <h3 style={{ color: '#10b981', marginTop: '0' }}>ข้อมูลค้างส่ง ({offlineQueue.length})</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {offlineQueue.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>ไม่มีค้างส่ง</p> : 
                    offlineQueue.map((q, idx) => (
                      <div key={idx} style={{ background: 'white', padding: '12px', marginBottom: '10px', borderRadius: '6px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <strong>{q.name}</strong> <span style={{ color: '#64748b' }}>(CID: {q.cid})</span><br/>
                        <div style={{ color: '#475569', fontSize: '14px', marginTop: '5px' }}>ความดัน: <b>{q.sysDia}</b> | น้ำหนัก: <b>{q.weight}</b></div>
                        <small style={{ color: '#94a3b8', display: 'block', marginTop: '5px' }}>{q.timestamp}</small>
                      </div>
                    ))
                  }
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', justifyContent: 'space-between' }}>
                  <button onClick={() => { if(window.confirm('ลบข้อมูลค้างส่งทั้งหมด?')) { localStorage.setItem('offline_queue', '[]'); setOfflineQueue([]); } }} style={{ padding: '12px 20px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>ลบทิ้งทั้งหมด</button>
                  <button onClick={() => alert("ระบบจะซิงค์อัตโนมัติ")} style={{ padding: '12px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🔄 ซิงค์ขึ้น JHCIS</button>
                </div>
              </div>
            )}
          </div>
        </main>
      ) : !isLoggedIn ? (
        <main className="home-screen" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <video key={customVideo} autoPlay loop playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4 }}><source src={customVideo} type="video/mp4" /></video>
          
          <div onClick={handleManualRead} style={{ display: 'flex', justifyContent: 'center', margin: '30px 0', cursor: 'pointer', position: 'relative', zIndex: 1 }}>
            <img src="/nick.png" alt="กรุณาสอดบัตร" style={{ maxWidth: '600px', transition: 'transform 0.2s', filter: 'drop-shadow(0 15px 20px rgba(0,0,0,0.2))' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
          </div>
          
          <div className="instruction-text" style={{ position: 'relative', zIndex: 1, textShadow: '0 2px 4px rgba(255,255,255,0.9)' }}>
            {loading ? 'กำลังดึงข้อมูลและรูปถ่าย...' : 'กรุณาสอดบัตรประชาชน เพื่อเข้ารับบริการ'}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', position: 'relative', zIndex: 1, marginTop: '20px', width: '90%', maxWidth: '600px' }}>
            <button 
              onClick={() => { setShowManualIdModal(true); setManualIdInput(''); setManualIdError(''); }}
              style={{ width: '100%', padding: '18px', background: '#4bc0c8', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 6px 15px rgba(75, 192, 200, 0.4)', fontSize: '24px', letterSpacing: '1px', transition: 'transform 0.2s, background 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#3ba2aa'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#4bc0c8'; }}
            >
              ไม่มีบัตรประชาชนแตะที่ปุ่มนี้
            </button>
          </div>
        </main>
      ) : (
        <main className="dashboard-screen" style={{ flex: 1, overflowY: 'auto', paddingBottom: '15vh' }}>
          
          <div className="patient-header-card">
            <h2>ยินดีต้อนรับ คุณ{patient?.fname || 'สิรภพ'} {patient?.lname || 'แก้วทิพย์'}</h2>
            <div className="realtime-clock">{formatThaiDateTime(currentTime)}</div>
            <p className="instruction-subtext">กรุณาเลือกรายการที่ต้องการตรวจวัด</p>
          </div>
          
          <div className="photo-container">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {patientImage ? (
                <img src={patientImage} alt="รูปผู้ป่วย" className="patient-photo-real" />
              ) : (
                <div className="patient-photo-placeholder">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="80px" height="80px"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
              )}
              <label 
                style={{ position: 'absolute', bottom: '-10px', right: '-15px', width: '45px', height: '45px', backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isUploadingPhoto ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.25)', border: '3px solid white', transition: 'transform 0.2s ease', zIndex: 15 }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = '#2563eb'; }}
              >
                {isUploadingPhoto ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '18px' }}></i> : <i className="fa-solid fa-camera" style={{ fontSize: '18px' }}></i>}
                <input type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleCapturePhoto} disabled={isUploadingPhoto} />
              </label>
            </div>
          </div>

          <div className="device-buttons">
            <button className="btn-device" onClick={() => openGuideModal('o2')} style={{ border: '2px solid #3b82f6' }}>ออกซิเจน <i className="fa-regular fa-hand-point-up" style={{ color: '#ffd43b', marginLeft: '8px' }}></i></button>
            <button className="btn-device" onClick={() => openGuideModal('weight')} style={{ border: '2px solid #3b82f6' }}>น้ำหนัก <i className="fa-solid fa-weight-scale" style={{ color: '#63e6be', marginLeft: '8px' }}></i></button>
            <button className="btn-device" onClick={() => openGuideModal('temp')} style={{ border: '2px solid #3b82f6' }}>อุณหภูมิ <i className="fa-solid fa-temperature-low" style={{ color: '#f87e00',marginLeft: '8px' }}></i></button>
            <button className="btn-device" onClick={() => openGuideModal('bp')} style={{ border: '2px solid #3b82f6' }}>ความดัน <i className="fa-solid fa-gauge-high" style={{ color: '#74c0fc', marginLeft: '8px' }}></i></button>
            <button className="btn-device" onClick={() => openGuideModal('sugar')} style={{ border: '2px solid #3b82f6' }}>น้ำตาล <i className="fa-solid fa-droplet" style={{ color: '#f41e1e', marginLeft: '8px' }}></i></button>
          </div>

          <div className="vitals-container">
            <div className="vitals-grid">
              {[
                { id: 'height', label: 'ส่วนสูง', unit: 'เซนติเมตร', val: vitals.height },
                { id: 'weight', label: 'น้ำหนัก', unit: 'กิโลกรัม', val: vitals.weight },
                { id: 'waist', label: 'รอบเอว', unit: 'เซนติเมตร', val: vitals.waist },
                { id: 'bmi', label: 'BMI', unit: 'กก/ม²', val: vitals.bmi },
                { id: 'temp', label: 'อุณหภูมิ', unit: '°C', val: vitals.temp },
                { id: 'spo2', label: 'O₂ sat', unit: '%', val: vitals.spo2 },
                { id: 'sysDia', label: 'ความดัน', unit: 'mmHg', val: vitals.sysDia },
                { id: 'pulse', label: 'ชีพจร', unit: 'ครั้ง/นาที', val: vitals.pulse },
                { id: 'sugar', label: 'น้ำตาล', unit: 'mg/dL', val: vitals.sugar },
              ].map((item, idx) => (
                <div className="vital-cell" key={idx}>
                  <div className="vital-label">{item.label}<br/><small>{item.unit}</small></div>
                  <div className="vital-value-box" style={{ padding: 0, display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text" value={item.val === '---' ? '' : item.val} 
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
                  <p style={{ margin: 0, color: patient?.chronic === 'ไม่มีประวัติในระบบ' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '16px' }}>{patient?.chronic || 'กำลังตรวจสอบ...'}</p>
                </div>
              </div>

              {(vitals.sysDia !== '---' || vitals.weight !== '---' || vitals.sugar !== '---') && (
                <div className="assessment-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                  {aiLoading ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#74c0fc', marginTop: '2px' }}></i> : <i className="fa-solid fa-user-doctor" style={{ fontSize: '32px', color: '#74c0fc', marginTop: '2px' }}></i>}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#475569', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI ประเมินว่า:</h4>
                    {aiLoading ? <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontStyle: 'italic' }}>กำลังวิเคราะห์...</p> : <p style={{ margin: 0, color: '#334155', fontSize: '15px', fontWeight: 'bold' }}>{aiResponse || "รอวิเคราะห์"}</p>}
                  </div>
                </div>
              )}

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
              
              {healthAnalysis.isEmergency && (
                <a href="tel:1669" style={{ width: '100%', padding: '15px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)', animation: 'pulse 2s infinite' }}>
                  <i className="fa-solid fa-truck-medical" style={{ fontSize: '24px' }}></i> โทรเรียก 1669 ทันที!
                </a>
              )}
              
              <button 
                onClick={sendToJHCISQueue}
                style={{ width: '100%', padding: '18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-server" style={{ fontSize: '24px' }}></i> บันทึกข้อมูลและจัดคิวลง JHCIS
              </button>

              <button 
                onClick={() => setShowTelemedModal(true)}
                style={{ width: '100%', padding: '15px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(2, 132, 199, 0.3)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-video" style={{ fontSize: '24px' }}></i> ปรึกษาแพทย์ออนไลน์
              </button>

              {/* 🔄 เปิด Modal แบบ Seamless UX ตามภาพ */}
              <button 
                onClick={() => { setShowManualIdModal(true); setManualIdInput(''); setManualIdError(''); }}
                style={{ width: '100%', padding: '15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(100, 116, 139, 0.3)', marginTop: '10px' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-user-plus" style={{ fontSize: '24px' }}></i> ค้นหาผู้ป่วยรายใหม่
              </button>

            </div>
          </div>
        </main>
      )}

      {/* 🟢 Background & Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: '15vh', backgroundImage: "url('/footer.png')", backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10, pointerEvents: 'none' }}></div>
      <div className="bottom-icons" style={{ position: 'fixed', bottom: '20px', left: '25px', display: 'flex', gap: '20px', zIndex: 100 }}>
        <div onClick={() => setShowBluetoothModal(true)} title="Bluetooth" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#74c0fc" strokeWidth="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>
        </div>
        <div onClick={() => { if (showSettings) setShowSettings(false); else { setShowPasswordModal(true); setPasswordInput(''); setPasswordError(false); } }} title="ตั้งค่า" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#74c0fc" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
        </div>
      </div>

      {/* ======================= Modals ======================= */}
      {/* 🟢 ค้นหาผู้ป่วย UI ตามที่ขอ */}
      {showManualIdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 2000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '35px', color: '#3B82F6' }}></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#1F2937' }}>ค้นหาประวัติผู้ป่วย</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#6B7280' }}>กรุณากรอกเลขประจำตัวประชาชน 13 หลัก</p>
            <input type="tel" maxLength={13} autoFocus value={manualIdInput} onChange={(e) => { setManualIdInput(e.target.value.replace(/[^0-9]/g, '')); setManualIdError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') processManualId(); }} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: manualIdError ? '2px solid #EF4444' : '2px solid #D1D5DB', fontSize: '24px', textAlign: 'center', letterSpacing: '2px', outline: 'none', marginBottom: '8px', color: '#1F2937', fontWeight: 'bold' }} placeholder="●●●●●●●●●●●●●" />
            <div style={{ minHeight: '24px', color: '#EF4444', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>{manualIdError}</div>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button onClick={() => setShowManualIdModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={processManualId} disabled={loading} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#3B82F6', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'กำลังค้นหา...' : 'ยืนยัน'}</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmQueueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-clipboard-check" style={{ fontSize: '35px', color: '#10B981' }}></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#1F2937' }}>ยืนยันการบันทึกข้อมูล</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '16px', color: '#4B5563' }}>ส่งข้อมูลเข้าระบบ JHCIS ใช่หรือไม่?</p>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button onClick={() => setShowConfirmQueueModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={confirmSendToJHCISQueue} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>ตกลง</button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 99999, backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '50px', marginBottom: '20px', color: '#3b82f6' }}></i>
          <h2>กำลังส่งข้อมูลเข้า JHCIS...</h2>
        </div>
      )}

      {notifyModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 999999, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '25px', padding: '40px 30px', width: '90%', maxWidth: '400px', textAlign: 'center', borderTop: `8px solid ${notifyModal.isSuccess ? '#10B981' : '#EF4444'}` }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px auto', backgroundColor: notifyModal.isSuccess ? '#D1FAE5' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fa-solid ${notifyModal.isSuccess ? 'fa-check' : 'fa-xmark'}`} style={{ fontSize: '40px', color: notifyModal.isSuccess ? '#10B981' : '#EF4444' }}></i>
            </div>
            <h2 style={{ margin: '0 0 10px 0', color: '#1F2937' }}>{notifyModal.title}</h2>
            <p style={{ margin: '0 0 25px 0', color: '#6B7280' }}>{notifyModal.message}</p>
          </div>
        </div>
      )}

      {showBluetoothModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px', textAlign: 'center', color: 'white' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>จัดการอุปกรณ์บลูทูธ</h2>
            </div>
            <div style={{ padding: '20px', maxHeight: '50vh', overflowY: 'auto', background: '#f8fafc' }}>
              {[
                { key: 'weight', image: '/scale.jpg', label: 'เครื่องชั่งน้ำหนัก (SCALE)', dev: devices.weight, action: connectBluetoothWeight },
                { key: 'temp', image: '/temp.png', label: 'เครื่องวัดอุณหภูมิ (Thermometer)', dev: devices.temp, action: connectBluetoothTemp },
                { key: 'bp', image: '/bp.jpg', label: 'เครื่องวัดความดัน (BP Monitor)', dev: devices.bp, action: connectBluetoothBP },
                { key: 'sugar', image: '/sugar.png', label: 'เครื่องวัดน้ำตาล (Glucose)', dev: devices.sugar, action: connectBluetoothSugar },
                { key: 'o2', image: '/o2.png', label: 'เครื่องวัดออกซิเจน (Oximeter)', dev: devices.o2, action: connectBluetoothO2 }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                  <img src={item.image} alt={item.label} style={{ width: '40px', height: '40px', objectFit: 'contain', marginRight: '15px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: item.dev ? '#10b981' : '#94a3b8' }}>{item.dev || 'ไม่ได้เชื่อมต่อ'}</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ display: 'none' }} checked={item.dev !== ''} onChange={(e) => e.target.checked ? item.action() : updateDeviceName(item.key, '')} />
                    <div style={{ width: '52px', height: '30px', backgroundColor: item.dev ? '#3b82f6' : '#cbd5e1', borderRadius: '32px', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '3px', left: item.dev ? '25px' : '3px', width: '24px', height: '24px', background: 'white', borderRadius: '50%', transition: 'left 0.3s' }}></div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div style={{ padding: '15px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setShowBluetoothModal(false)} style={{ background: '#64748b', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '25px', cursor: 'pointer' }}>&lt;&lt; ย้อนกลับ</button>
            </div>
          </div>
        </div>
      )}

      {showTelemedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90vw', height: '85vh', background: '#1e293b', borderRadius: '25px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 25px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-circle" style={{ color: '#ef4444', animation: 'blink 1s infinite' }}></i>Telemedicine Room</div>
              <button onClick={() => setShowTelemedModal(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer' }}>วางสาย</button>
            </div>
            <iframe src="https://meet.jit.si/ThapPhrikHealthStationTelemedRoom#config.disableDeepLinking=true&interfaceConfig.TOOLBAR_BUTTONS=['microphone','camera','hangup']" allow="camera; microphone" style={{ flex: 1, border: 'none' }}></iframe>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '300px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>รหัสผ่านผู้ดูแลระบบ</h3>
            <input type="password" value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }} onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()} style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '20px', borderRadius: '10px', border: passwordError ? '2px solid red' : '1px solid #ccc' }} />
            <div style={{ color: 'red', minHeight: '20px', margin: '10px 0' }}>{passwordError && 'รหัสผิดพลาด'}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none' }}>ยกเลิก</button>
              <button onClick={handlePasswordSubmit} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none' }}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {guideModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '25px', padding: '35px', maxWidth: '500px', textAlign: 'center' }}>
            <button onClick={() => { if(currentAudioRef.current){currentAudioRef.current.pause(); currentAudioRef.current=null;} setGuideModal({ ...guideModal, show: false }); }} style={{ float: 'right', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            <h2>{guideModal.title}</h2>
            <img src={guideModal.gifUrl} style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', margin: '20px 0' }} />
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{guideModal.desc}</p>
            <button onClick={handleStartDeviceConnection} style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontSize: '20px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '15px' }}>เริ่มเชื่อมต่อ</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;