import { useState, useCallback } from 'react';

// ประกาศ UUID ตามมาตรฐานสากลขององค์กร Bluetooth SIG
const WEIGHT_SCALE_SERVICE = 0x181D; // หรือ 'weight_scale'
const WEIGHT_MEASUREMENT_CHAR = 0x2A9D;

export const useBluetoothScale = () => {
  const [weight, setWeight] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [device, setDevice] = useState(null);

  // ฟังก์ชันถอดรหัส Byte (Data Parsing) ที่รับมาจากเครื่องชั่ง
  const parseWeightData = (dataView) => {
    try {
      // โครงสร้างมาตรฐาน BLE Weight Scale (Byte 0 คือ Flags, Byte 1-2 คือค่าน้ำหนัก)
      const flags = dataView.getUint8(0);
      const isImperial = flags & 0x01; // เช็คว่าเป็นหน่วย ปอนด์ หรือ กิโลกรัม
      
      // อ่านค่าน้ำหนัก (ใช้ Little Endian 16-bit integer)
      let rawWeight = dataView.getUint16(1, true); 
      
      // ตัวคูณความละเอียด (Resolution) มักจะเป็นทศนิยม 2 ตำแหน่ง
      let finalWeight = rawWeight * 0.005; // *หมายเหตุ: ค่าตัวคูณนี้ขึ้นอยู่กับสเปคของเครื่องชั่งแต่ละยี่ห้อ

      return {
        value: finalWeight.toFixed(2),
        unit: isImperial ? 'lbs' : 'kg'
      };
    } catch (err) {
      console.error("Data Parsing Error:", err);
      return null;
    }
  };

  const connectToScale = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // 1. ตรวจสอบว่าเบราว์เซอร์รองรับ Web Bluetooth หรือไม่ (Edge Case)
      if (!navigator.bluetooth) {
        throw new Error("เบราว์เซอร์นี้ไม่รองรับการเชื่อมต่อ Bluetooth (กรุณาใช้ Chrome หรือ Edge)");
      }

      // 2. เรียกหน้าต่างค้นหาอุปกรณ์
      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [WEIGHT_SCALE_SERVICE] }],
        optionalServices: ['battery_service'] // ขอเผื่อดูแบตเตอรี่ได้ด้วย
      });

      // 3. เชื่อมต่อ GATT Server
      const server = await bleDevice.gatt.connect();
      
      // 4. เข้าถึง Service และ Characteristic
      const service = await server.getPrimaryService(WEIGHT_SCALE_SERVICE);
      const characteristic = await service.getCharacteristic(WEIGHT_MEASUREMENT_CHAR);

      // 5. สั่งเปิดระบบรับข้อมูลแบบ Real-time (Notifications)
      await characteristic.startNotifications();

      // 6. ดักจับเหตุการณ์เมื่อค่าน้ำหนักเปลี่ยน (คนไข้ขึ้นชั่ง)
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const dataView = event.target.value;
        const parsedData = parseWeightData(dataView);
        if (parsedData) {
          setWeight(parsedData.value);
        }
      });

      // ดักจับกรณีเครื่องชั่งตัดการเชื่อมต่อ
      bleDevice.addEventListener('gattserverdisconnected', () => {
        setError("เครื่องชั่งถูกตัดการเชื่อมต่อ");
        setDevice(null);
      });

      setDevice(bleDevice);

    } catch (err) {
      console.error("Bluetooth Error:", err);
      setError(err.message || "ไม่สามารถเชื่อมต่อเครื่องชั่งได้");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
  };

  return { weight, isConnecting, error, connectToScale, disconnect, isConnected: !!device };
};