import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { StaffClinicalWorkspace } from './StaffClinicalWorkspace';
import Swal from 'sweetalert2';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';



const API_BASE_URL = 'https://api.miniheealthstation.com';
const API_KEY = 'ThapPhrik_Secret_Key_9988';

// 🦸‍♂️ Component พิเศษ: ดึงชื่อจาก CID สดๆ บนหน้าเว็บ (แก้อาการ Backend ส่งคำว่า "ผู้ป่วย" มาให้)
const PatientNameResolver = ({ cid, defaultName }: { cid: string, defaultName: string }) => {
  const [name, setName] = useState<string>('กำลังค้นหา...');

  useEffect(() => {
    if (!cid) {
      setName(defaultName || 'ไม่ทราบชื่อ');
      return;
    }
    
    // ถ้า Backend หายดื้อ ส่งชื่อจริงมาให้แล้ว (ไม่ใช่คำว่า ผู้ป่วย) ให้ใช้เลยทันทีเพื่อความเร็ว
    if (defaultName && defaultName !== 'ผู้ป่วย' && defaultName !== 'ไม่ทราบชื่อในระบบ') {
        setName(defaultName);
        return;
    }

    // วิ่งไปขอชื่อ-นามสกุล จาก API ประวัติคนไข้ที่เรามีอยู่แล้ว
    axios.get(`${API_BASE_URL}/jhcis-api/patient/${cid}`, { headers: { 'x-api-key': API_KEY } })
      .then(res => {
        if (res.data.success && res.data.data) {
           setName(`${res.data.data.fname} ${res.data.data.lname}`);
        } else {
           setName(`ไม่มีประวัติ (CID: ${cid})`);
        }
      })
      .catch(() => {
         setName(`ไม่พบข้อมูล (CID: ${cid})`);
      });
  }, [cid, defaultName]);

  return <span style={{ color: name.includes('กำลังค้นหา') ? '#94a3b8' : 'inherit' }}>{name}</span>;
};

// 📋 ข้อความสำเร็จรูปตั้งต้นสำหรับช่อง อาการสำคัญ (symptoms)
const DEFAULT_SYMPTOMS_PRESETS: string[] = [
  'ตรวจภาวะโภชนาการเด็ก 0-72 เดือน ไตรมาส1/2570',
  'ตรวจภาวะโภชนาการเด็ก 6-14 ปี',
  'การตรวจคัดกรอง ncd เหล้า บุหรี่ ตรวจคัดกรองสุขภาพช่องปาก คัดกรองมะเร็งช่องปาก',
  'คัดกรอง ncd เหล้า บุหรี่ ปี67',
  'คัดกรองมะเร็งลำไส้ใหญ่ 2564',
  'ฉีดยา Hema-plus ผู้ป่วยล้างไต ที่บ้าน',
  'วัคซีน HPV ในเด็กผู้หญิง ปีงบ2569',
  'วัคซีน HPV2 ในเด็กผู้หญิง ปีงบ 2569',
  'เบาหวานความดัน เพื่อไปรับบริการตรวจ LAB ที่โรงพยาบาลอรัญประเทศ',
  'Telemedicine ผู้ป่วยความดันโลหิตกลุ่มสีเขียว',
  'การตรวจคัดกรองCVD risk 2569',
  'การตรวจคัดกรองNCD  เหล้า บุหรี่ ปี2570',
  'การตรวจคัดกรองมะเร็งเต้านม ปี 2569',
  'การตรวจวัดความดันโลหิต ใน ผู้ป่วย เบาหวาน ความดันโลหิตสูง',
  'การรับบริการคลินิก เบาหวาน ความดันโลหิตสูง',
  'คัดกรองภาวะซึมเศร้า ปี 2569',
  'คัดกรองมะเร็งลำไส้ใหญ่',
  'จ่ายยาเม็ดเสริมธาตุเหล็ก',
  'ฉีดยา / รับยาจิตเวช',
  'ฉีดยา จิตเวช FLUPHENAZINE 25 mg IM q 1 month',
  'ฉีดวัคซีน ไข้หวัดใหญ่ 2009',
  'ฉีดวัคซีน ไข้หวัดใหญ่ 4 สายพันธุ์ ปี 2569',
  'ฉีดวัคซีนนักเรียนชั้น ป.6 dT',
  'ฉีดวัคซีนนักเรียนชั้น ป.6 dT และ วัคซีน HPV2 ในเด็กผู้หญิง',
  'ดูแลทารกแรกเกิดครั้งที่',
  'ตรวจ EKG ในกลุ่มผู้ป่วย เบาหวาน ความดันโลหิต ใน คลินิก รพ.สต.ทับพริก',
  'ตรวจ Hct.',
  'ตรวจLAB ประจำปี ชุดใหญ่ ที่รพ.อรัญประเทศ',
  'ตรวจกระตุ้น พัฒนาการ DSPM ครั้งที่ 2',
  'ตรวจคัดกรองด้วยตนเอง HPV Self-sampling',
  'ตรวจคัดกรองมะเร็งลำไส้ (FIT TEST)',
  'ตรวจคัดกรองสุขภาพช่องปากคัดกรองมะเร็งช่องปากปี 2569',
  'ตรวจคัดกรองไวรัสตับอักเสบบี+ไวรัสตับอักเสบซี',
  'ตรวจน้ำตาลในเลือดกลุ่มปรับเปลี่ยนพฤติกรรม NCD',
  'ตรวจพัฒนาการแบบ DSPM  อายุ  18  เดือน',
  'ตรวจพัฒนาการแบบ DSPM  อายุ  30  เดือน',
  'ตรวจพัฒนาการแบบ DSPM  อายุ  42  เดือน',
  'ตรวจพัฒนาการแบบ DSPM  อายุ  60  เดือน',
  'ตรวจพัฒนาการแบบ DSPM  อายุ  9  เดือน',
  'ตรวจภาวะแทรกซ้อนทางไต ผู้ป่วยความดันโลหิตสูง',
  'ตรวจภาวะโภชนาการเด็ก 0-72 เดือน ไตรมาส4/2566',
  'ตรวจภาวะโภชนาการเด็กอายุ 6-18 ปี',
  'ตรวจรักษาผู้ป่วยเบาหวาน ความดันโลหิตสูง  ด้วยวิธี  Informed consent for Telemedicine โดยนายแพทย์ ราเชษฐ์ เชิงพนม',
  'ตรวจวัดความดันโลหิตที่บ้านโดย อสม.',
  'ตรวจสุขภาพช่องปาก นักเรียน ปี 2567',
  'ตรวจสุขภาพช่องปาก เคลือบฟลูออไรด์  ประจำปี 2569',
  'ตรวจสุขภาพช่องปากประจำปี 2569',
  'ตรวจสุขภาพช่องปากเด็กก่อนวัยเรียน',
  'ตรวจสุขภาพช่องปากในหญิงตั้งครรภ์',
  'ตรวจสุขภาพพระสงฆ์ 2567',
  'ตรวจเฝ้าระวังภาวะแทรกซ้อนตา ไต เท้า ผู้ป่วยเบาหวาน',
  'ตรวจเลือดประจำปีผู้ป่วย DM  HT 2567',
  'ตรวจและรับยาความดันโลหิตสูง',
  'ตรวจและรับยาเบาหวาน',
  'ตัวร้อน มีไข้สูง อาเจียน เป็นมาแล้ว 1 วัน',
  'ตัวร้อน มีไข้สูง เป็นมาแล้ว 1 วัน',
  'ติดตามนมแม่ 6 เดือน',
  'ติดตามผลเลือด DM remission รอบ 2',
  'ติดตามผู้ดื่มสุรา',
  'ติดตามผู้ป่วยความดันโลหิตสูงเสี่ยง เบาหวาน',
  'ติดตามผู้สูบบุหรี่',
  'ติดตามอาการผู้ป่วยข้อเข่าเสื่อม',
  'ติดตามเยี่ยมบ้าน ผู้ที่ตรวจคัดกรองมะเร็งปากมดลูก ที่มีผล ผิดปกติ Type 16  18',
  'ทับหม้อเกลือ',
  'ประเมินภาวะโภชนาการ เด็กวัยเรียน',
  'ผู้ป่วย NCD กลุ่มสีเขียว รับบริการที่ health station ประจำหมูบ้าน โดย อสม.',
  'ผู้ป่วยจิตเวช โครงการยาใจใกล้บ้าน',
  'ผู้ป่วยเข้าร่วมโครงการ DM remission',
  'ฟันผุเหลือแต่รากฟัน',
  'รับบริการตรวจคัดกรอง เฝ้าระวัง และแก้ไขภาวะ สายตาผิดปกติในนักเรียนชั้น ป.1',
  'รับบริการที่ health station ประจำหมู่บ้าน',
  'วันที่ 20 10/10/69 ตรวจคัดกรอง NCD',
  'วันนี้มารับบริการวางแผนครอบครัว',
  'วันนี้มารับบริการสร้างเสริมภูมิคุ้มกันโรค',
  'ส่งเสริมด้านการแพทย์แผนไทย',
  'หญิงวัยเจริญพันธ์ เข้าโครงการแก้มแดง ใสไม่ซีด เสริมด้วยธาตุเหล็ก และกรดโฟลิก',
  'อนามัยนักเรียน4-ตรวจโภชนาการฯ',
  'อบสมุนไพร',
  'เยี่ยมตรวจสุขภาพเด็ก กลุ่มปกติ',
  'เยี่ยมบ้านผู้ป่วย palliative care',
  'เยี่ยมบ้านผู้ป่วยโรควัณโรค',
  'เยี่ยมบ้านผู้ป่วยโรคเรื้อรัง',
  'เยี่ยมบ้านผู้พิการ',
  'เยี่ยมบ้านเด็กทารกหลังคลอด ครั้งที่',
  'เยี่ยมผู้ป่วยโรคหลอดเลือดสมอง',
  'เยี่ยมมารดาหลังคลอด ครั้งที่',
  'ให้บริการจ่ายยาน้ำเสริมธาตุเหล็ก',
  'ให้บริการจ่ายยาเสริมธาตุเหล็กในเด็กอายุ6-12ปี',
  'ให้บริการวัคซีนใน นักเรียน ชั้น ประถมศึกษาปีที่ 6'
];

// 📋 ข้อความสำเร็จรูปตั้งต้นสำหรับช่อง อาการร่วม / ประวัติเจ็บป่วย (symptomsco)
const DEFAULT_SYMPTOMSCO_PRESETS: string[] = [
  'ตรวจภาวะโภชนาการเด็ก 0-72 เดือน ไตรมาส 1/2570',
  'FLUPHENNAZINE INJ(FENDEC) 25MG/1ML IM q 1 month',
  'PARA      LMP    X    day   Last    ปี',
  'VA ตาขวา =    ตาซ้าย  =   IOP  ตาขวา =  ตาซ้าย =',
  'กลุ่มเสี่ยง 608',
  'การคัดกรอง 2 Q ปกติ',
  'การตรวจเต้านมทั้ง 2 ข้าง ด้วยตนเอง ไม่พบอาการผิดปกติ',
  'กินยาต่อเนื่องสม่ำ เสมอ',
  'คัดกรองผลปกติ',
  'คัดกรองสารเคมีในเกษตรกร',
  'คัดกรองเหล้า',
  'คัดกรองเหล้า บุหรี่',
  'คัดกรองโรคจิตและพฤติกรรม',
  'จ่าย Ferrous fumarate 200 mg  tablet สัปดาห์ละ 1 เม็ด 6-12 ปี',
  'จ่าย Ferrous fumarate 200 mg  tablet สัปดาห์ละ 1 เม็ด13-44 ปี',
  'ฉีด คอตีบ บาดทะยัก',
  'ฉีดวัคซีนนักเรียนในเด็ก ป.6',
  'ฉีดวัคซีนไข้หวัดใหญ่',
  'ตรวจ EKG ปี 2569',
  'ตรวจกระตุ้นพัฒนาการ อายุ   เดือน สมวัย',
  'ตรวจคัดกรอง NCD โดย อสม.',
  'ตรวจคัดกรองโรคทางNCD  ยังไม่ป่วยเป็น เบาหวาน',
  'ตรวจภาวะโภชนาการ 0-72 เดือน',
  'ตรวจเหา ในโรงเรียน',
  'ติดตามผู้ดื่มสุรา',
  'ติดตามผู้สูบบุหรี่',
  'ทาฟลูออไรด์วานิช  ปี 63',
  'ทารกดูดนมได้ดี ไม่มีสำรอก ขับถ่าย ปกติ',
  'ทารกดูดนมได้ดีไม่มีสำรอก ท้องอืดเล็กน้อย สะดือหลุดแล้ว แห้งสะอาดดีไม่มีหนอง ขับถ่าย ปกติ',
  'ปฎิเสธโรคประจำตัวและการแพ้ยา',
  'ประเมินตามแบบสอบถาม',
  'ปวดมากช่วงเช้า',
  'ผลการตรวจ FIT Test Negative',
  'ผลการตรวจ FIT Test Positive',
  'ผลการตรวจ ตาปกติ',
  'ผลการตรวจการได้ยินปกติ',
  'ผลการตรวจจอประสาทตา ผล NO DL',
  'ผลปกติทั้ง 2 ข้าง',
  'ผู้ป่วย ADL=0 รับประทานอาหารได้น้อย',
  'ผู้ป่วย ในคลินิกเบาหวาน  รพ.สต.ทับพริก',
  'พัฒนาการ 18 เดือน  สมวัย',
  'พัฒนาการ 30 เดือน  สมวัย',
  'พัฒนาการ 42 เดือน  สมวัย',
  'พัฒนาการ 60 เดือน  สมวัย',
  'พัฒนาการ 9 เดือน  สมวัย',
  'พัฒนาการสมวัย หลังกระตุ้น 2-4 weeks',
  'พัฒนาการไม่สมวัย กระตุ้น 2-4 weeks',
  'ฟังผลเลือดประจำปี โดยนายแพทย์ราเชษฐ์  เชิงพนม (รพ.อรัญประเทศ)',
  'มารดาหลังคลอด ไม่มีซึมเศร้า ช่วยเหลือตนเอง ปวดแผล C/S เล็กน้อย',
  'มารดาหลังคลอดพูดคุยรู้เรื่องดี ไม่มีซึมเศร้าหลังคลอด  รับประทานอาหารได้ ขับถ่ายปกติ กินยาเสริมไอโอดีนทุกวัน',
  'รับบริการ วัคซีนสร้างเสริมภูมิคุ้มกันโรค  MMR 9 เดือน',
  'รับบริการตรวจและรับยาเบาหวาน',
  'รับบริการยาคุมชนิดฉีด',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค dt ครั้งที่ 1',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค dT ประถมศึกษาปีที่ 6',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค IPV+DTP-HB-HIB+Rota ครั้งที่ 2',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค IPV+DTPHB +Hib +Rota ครั้งที่ 1',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTP กระตุ้น ครั้งที่ 1     MMR 2',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTP กระตุ้น ครั้งที่ 1+MMR2',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTP-HB-Hib+IPV  ครั้งที่ 2',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTPHB  ครั้งที่ 1',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTPHB  ครั้งที่ 3',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTPHB -Hib ครั้งที่ 3',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค OPV+DTPกระตุ้น ครั้งที่ 2',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรค ไข้หวัดใหญ่',
  'รับบริการวัคซีนสร้างสร้างภูมิคุ้มกันโรคHPV ประถมศึกษาปีที่ 5',
  'รับบริการวัคซีนสร้างเสริมภูมิคุ้มกันโรค JE Live ครั้งที่ 1',
  'รับบริการวัคซีนสร้างเสริมภูมิคุ้มกันโรคอายุ 2 ขวบครึ่ง JE Live ครั้งที่ 2',
  'รับยา ความดันโลหิตสูง',
  'รับยาความดันโลหิตสูง',
  'รับยาคุมกำเนิดชนิดเม็ด',
  'รับยาจิตเวช จากรพ.อรัญประเทศ',
  'ล้างแผลกดทับที่ก้น',
  'วัดความดันโลหิต',
  'สรุปการประเมินความเสี่ยงในการท างานของเกษตรกรจากการสัมผัสสารเคมีกำจัดศัตรูพืช มีความเสี่ยง ต่ำ',
  'สรุปการประเมินความเสี่ยงในการท างานของเกษตรกรจากการสัมผัสสารเคมีกำจัดศัตรูพืช มีความเสี่ยงสูง',
  'สอนแปรงฟัน ทาฟลูออไรค์วานิช ปี65',
  'ส่งเสริมด้านการแพทย์แผนไทยและแพทย์ทางเลือก',
  'หญิงวัยเจริญพันธุ์ เข้าสู่โครงการหญิงไทยแก้มแดง ไม่ซีด เสริมด้วยธาตุเหล็กและกรดโฟลิค',
  'อาการทั่วไปปกติ',
  'เกิดก่อน ปี พ.ศ.2535',
  'แจ้งผลการตรวจ  HPV Self-sampling',
  'แผลแห้งดีไม่มีหนอง',
  'โภชนาการ 6-14 ปี',
  'ได้รับผลการตรวจPAP SMEAR เมื่อวันที่ 11 ก.พ.2564 จาก GM Laboratory',
  'ไม่มีประวัติแพ้ไข่ ไม่มีไข้',
  'ไม่มีปัญหาด้านการรับประทานอาหาร',
  'ไม่มีผลข้างเคียงหลังจากได้รับวัคซีนไข้หวัดใหญ่',
  'ไม่มีภาวะซึมเศร้า',
  'ไม่มีอาการบวมแดงร้อน',
  'ไม่มีเดินเซ ปากเบี้ยว พูดคุยรู้เรื่องชัดเจน'
];

function App() {
  // 🦸‍♂️ State สำหรับระบบ อสม.
  const [currentVhv, setCurrentVhv] = useState<{cid: string, name: string} | null>(null);
  // 🌟 เช็คสิทธิ์เจ้าหน้าที่
  const isStaffLoggedIn = Boolean(currentVhv && ['3251000441639', '1259700107058', '1279800022828'].includes(currentVhv.cid));

  // 📝 State เก็บข้อความที่เจ้าหน้าที่พิมพ์/เลือกเอง
  const [customSymptoms, setCustomSymptoms] = useState<string>('');
  const [customSymptomsco, setCustomSymptomsco] = useState<string>('');

  // 📋 คลังข้อความสำเร็จรูปช่อง อาการสำคัญ (symptoms)
  const [symptomsPresets, setSymptomsPresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jhcis_symptoms_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SYMPTOMS_PRESETS;
  });

  // 📋 คลังข้อความสำเร็จรูปช่อง อาการร่วม (symptomsco)
  const [symptomscoPresets, setSymptomscoPresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jhcis_symptomsco_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SYMPTOMSCO_PRESETS;
  });

  // 🪟 State ควบคุมหน้าต่าง Popup ข้อความสำเร็จรูป
  const [presetModalTarget, setPresetModalTarget] = useState<'symptoms' | 'symptomsco' | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [newPresetInput, setNewPresetInput] = useState('');

  // กดเลือกข้อความ -> เอาไปต่อท้ายในช่องที่เปิดอยู่
  const handleSelectPreset = (text: string) => {
    if (presetModalTarget === 'symptoms') {
      setCustomSymptoms(prev => (prev.trim() ? `${prev.trim()} ${text}` : text));
    } else if (presetModalTarget === 'symptomsco') {
      setCustomSymptomsco(prev => (prev.trim() ? `${prev.trim()} ${text}` : text));
    }
  };

  // เพิ่มข้อความสำเร็จรูปใหม่ด้วยตัวเอง
  const handleAddPreset = () => {
    const trimmed = newPresetInput.trim();
    if (!trimmed || !presetModalTarget) return;

    const isCC = presetModalTarget === 'symptoms';
    const currentList = isCC ? symptomsPresets : symptomscoPresets;

    if (currentList.includes(trimmed)) {
      Swal.fire({ title: 'มีข้อความนี้อยู่แล้ว', icon: 'info', timer: 1200, showConfirmButton: false });
      return;
    }

    const updated = [trimmed, ...currentList];
    if (isCC) {
      setSymptomsPresets(updated);
      localStorage.setItem('jhcis_symptoms_presets', JSON.stringify(updated));
    } else {
      setSymptomscoPresets(updated);
      localStorage.setItem('jhcis_symptomsco_presets', JSON.stringify(updated));
    }
    setNewPresetInput('');
  };

  // ลบข้อความสำเร็จรูป
  const handleDeletePreset = (textToDelete: string) => {
    if (!presetModalTarget) return;
    const isCC = presetModalTarget === 'symptoms';
    const currentList = isCC ? symptomsPresets : symptomscoPresets;
    const updated = currentList.filter(item => item !== textToDelete);

    if (isCC) {
      setSymptomsPresets(updated);
      localStorage.setItem('jhcis_symptoms_presets', JSON.stringify(updated));
    } else {
      setSymptomscoPresets(updated);
      localStorage.setItem('jhcis_symptomsco_presets', JSON.stringify(updated));
    }
  };

  // 🩺 State สำหรับโซนวินิจฉัย (ICD-10) และ ยา-เวชภัณฑ์-หัตถการ (เฉพาะเจ้าหน้าที่)
  const [diagNote, setDiagNote] = useState<string>('');
  const [icd10List, setIcd10List] = useState<{ diagcode: string; diseasename: string; dxtype: string; conti: string; appointDate: string }[]>([]);
  const [icdSearch, setIcdSearch] = useState<string>('');
  const [icdResults, setIcdResults] = useState<any[]>([]);

  const [timeService, setTimeService] = useState<'1' | '2'>('1');
  const [foodAllergy, setFoodAllergy] = useState<string>('');
  const [drugAllergies, setDrugAllergies] = useState<any[]>([]);
  const [drugCategory, setDrugCategory] = useState<'all' | 'herb' | 'service' | 'dental' | 'adp'>('all');
  const [drugSearch, setDrugSearch] = useState<string>('');
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [drugList, setDrugList] = useState<{ drugcode: string; drugname: string; unit: number; realprice: number; costprice: number; dose: string; recorder: string }[]>([]);
  const [activeVisitNo, setActiveVisitNo] = useState<number | null>(null);
  const [queueRefreshTrigger, setQueueRefreshTrigger] = useState<number>(0);

  // ฟังก์ชันล้างข้อมูลโซนแพทย์เมื่อเปลี่ยนคนไข้
  const resetClinicalOrderFields = () => {
    setActiveVisitNo(null);
    setDiagNote('');
    setIcd10List([]);
    setIcdSearch('');
    setIcdResults([]);
    setTimeService('1');
    setFoodAllergy('');
    setDrugAllergies([]);
    setDrugCategory('all');
    setDrugSearch('');
    setDrugResults([]);
    setDrugList([]);
  };

  // โหลดเคสเมื่อเจ้าหน้าที่คลิกคนไข้จากแถบคิวตรวจวันนี้ด้านซ้าย (JHCIS)
  const handleSelectQueuePatient = async (queueRow: any) => {
    setLoading(true);
    try {
      setActiveVisitNo(queueRow.visitno);
      const [patRes, detailRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/jhcis-api/patient/${queueRow.cid}`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        axios.get(`${API_BASE_URL}/jhcis-api/visit-detail/${queueRow.visitno}`, { headers: { 'x-api-key': API_KEY } })
      ]);

      if (patRes?.data?.success) {
        setPatient({ ...patRes.data.data, cid: queueRow.cid });
      } else {
        setPatient({
          cid: queueRow.cid,
          fname: queueRow.fname,
          lname: queueRow.lname,
          sex: queueRow.sex,
          age_months: queueRow.age_months,
          chronic: 'กำลังตรวจสอบประวัติ...'
        });
      }

      if (detailRes.data?.success) {
        const v = detailRes.data.visit;
        const w = Number(v.weight) || 0;
        const h = Number(v.height) || 0;
        const bmiVal = w > 0 && h > 0 ? (w / Math.pow(h / 100, 2)).toFixed(2) : '---';

        let parsedSugar = '---';
        let parsedFasting = '';
        if (v.vitalcheck && typeof v.vitalcheck === 'string') {
          const dtxMatch = v.vitalcheck.match(/DTX:\s*([\d.]+)/i);
          if (dtxMatch) parsedSugar = dtxMatch[1];
          if (v.vitalcheck.includes('ไม่งดน้ำ-อาหาร')) parsedFasting = 'ไม่งดน้ำ-อาหาร';
          else if (v.vitalcheck.includes('งดน้ำ-อาหาร')) parsedFasting = 'งดน้ำ-อาหาร';
        }

        setVitals({
          weight: w > 0 ? String(w) : '---',
          height: h > 0 ? String(h) : '---',
          waist: Number(v.waist) > 0 ? String(v.waist) : '---',
          bmi: bmiVal,
          temp: Number(v.temperature) > 0 ? String(v.temperature) : '---',
          spo2: '---',
          sysDia: v.pressure ? String(v.pressure) : '---',
          pulse: Number(v.pulse) > 0 ? String(v.pulse) : '---',
          sugar: parsedSugar,
          headCircum: '---'
        });

        setSugarFasting(parsedFasting);
        setCustomSymptoms(v.symptoms || '');
        setCustomSymptomsco(v.symptomsco || '');
        setDiagNote(v.diagnote || '');
        setTimeService(v.timeservice === '2' ? '2' : '1');
        setDrugAllergies(detailRes.data.allergies || []);

        const ppList: string[] = Array.isArray(detailRes.data.specialpp) ? detailRes.data.specialpp : [];
        if (ppList.includes('1B52')) setSmokeStatus('ไม่สูบ');
        else if (ppList.includes('1B51')) setSmokeStatus('เคยสูบแต่เลิกแล้ว');
        else if (ppList.some(c => c.startsWith('1B50'))) {
          setSmokeStatus('ยังสูบอยู่');
          const amt = ppList.find(c => ['1B501', '1B502', '1B503', '1B509'].includes(c));
          if (amt) setSmokeAmount(amt);
          const wake = ppList.find(c => ['1B504', '1B505', '1B506'].includes(c));
          setSmokeWake(wake || '');
          setSmokeAdvice(ppList.includes('1B530') ? '1B530' : '');
        } else {
          setSmokeStatus('');
        }

        if (ppList.includes('1B600')) setAlcoholStatus('ไม่ดื่ม');
        else if (ppList.includes('1B601')) setAlcoholStatus('เคยดื่มแต่เลิกแล้ว');
        else if (ppList.includes('1B609')) {
          setAlcoholStatus('ยังดื่มอยู่');
          setAlcoholAdvice(ppList.includes('1B611') ? '1B611' : '');
        } else {
          setAlcoholStatus('');
        }

        setIcd10List(
          (detailRes.data.diags || []).map((d: any) => ({
            diagcode: d.diagcode,
            diseasename: d.diseasename || '',
            dxtype: d.dxtype || '01',
            conti: d.conti || '0',
            appointDate: ''
          }))
        );

        setDrugList(
          (detailRes.data.drugs || []).map((d: any) => ({
            drugcode: d.drugcode,
            drugname: d.drugname,
            unit: Number(d.unit) || 1,
            realprice: Number(d.realprice) || 0,
            costprice: Number(d.costprice) || 0,
            dose: d.dose || '',
            recorder: currentVhv?.name || 'เจ้าหน้าที่'
          }))
        );
      }

      await fetchPatientPhoto(queueRow.cid);
      setIsLoggedIn(true);
    } catch (e) {
      Swal.fire('ไม่สามารถโหลดข้อมูลคิวได้', 'กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล JHCIS', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ค้นหา ICD-10 แบบ Real-time
  const handleSearchIcd10 = async (keyword: string) => {
    setIcdSearch(keyword);
    if (keyword.trim().length < 2) { setIcdResults([]); return; }
    try {
      const res = await axios.get(`${API_BASE_URL}/jhcis-api/search-icd10?q=${encodeURIComponent(keyword.trim())}`, {
        headers: { 'x-api-key': API_KEY }
      });
      if (res.data.success) setIcdResults(res.data.data || []);
    } catch (e) {}
  };

  // เพิ่มรหัส ICD-10 ลงตาราง
  const handleAddIcd10 = (row: any) => {
    if (icd10List.some(x => x.diagcode === row.diseasecode)) return;
    setIcd10List(prev => [
      ...prev,
      {
        diagcode: row.diseasecode,
        diseasename: row.diseasenamethai || row.diseasename || '',
        dxtype: prev.length === 0 ? '01' : '02',
        conti: '0',
        appointDate: ''
      }
    ]);
    setIcdSearch('');
    setIcdResults([]);
  };

  // ค้นหายา / สมุนไพร / หัตถการ / ทันตกรรม / ADP
  const handleSearchDrug = async (keyword: string, cat = drugCategory) => {
    setDrugSearch(keyword);
    if (keyword.trim().length < 1 && cat === 'all') { setDrugResults([]); return; }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/jhcis-api/search-drug?q=${encodeURIComponent(keyword.trim())}&category=${cat}`,
        { headers: { 'x-api-key': API_KEY } }
      );
      if (res.data.success) setDrugResults(res.data.data || []);
    } catch (e) {}
  };

  // เพิ่มยา/หัตถการลงตาราง
  const handleAddDrug = (row: any) => {
    setDrugList(prev => [
      ...prev,
      {
        drugcode: row.drugcode,
        drugname: row.drugname,
        unit: 1,
        realprice: Number(row.realprice) || 0,
        costprice: Number(row.costprice) || 0,
        dose: '',
        recorder: currentVhv?.name || 'เจ้าหน้าที่'
      }
    ]);
    setDrugSearch('');
    setDrugResults([]);
  };

  // ปุ่ม Re Med. ดึงยาและโรคครั้งล่าสุดของคนไข้คนนี้จาก JHCIS
  const handleReMed = async () => {
    if (!patient?.cid) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/jhcis-api/re-med/${patient.cid}`, {
        headers: { 'x-api-key': API_KEY }
      });
      if (res.data.success) {
        if (res.data.allergies?.length > 0) setDrugAllergies(res.data.allergies);
        if (res.data.diagnote && !diagNote) setDiagNote(res.data.diagnote);
        if (res.data.diags?.length > 0) {
          setIcd10List(res.data.diags.map((d: any) => ({
            diagcode: d.diagcode,
            diseasename: d.diseasename || '',
            dxtype: d.dxtype || '01',
            conti: '1',
            appointDate: ''
          })));
        }
        if (res.data.drugs?.length > 0) {
          setDrugList(res.data.drugs.map((d: any) => ({
            drugcode: d.drugcode,
            drugname: d.drugname,
            unit: Number(d.unit) || 1,
            realprice: Number(d.realprice) || 0,
            costprice: Number(d.costprice) || 0,
            dose: d.dose || '',
            recorder: currentVhv?.name || 'เจ้าหน้าที่'
          })));
          Swal.fire({ title: 'ดึงรายการยาครั้งก่อนสำเร็จ', text: `พบรายการยา ${res.data.drugs.length} รายการ`, icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire({ title: 'ไม่พบประวัติจ่ายยาก่อนหน้า', icon: 'info', timer: 1500, showConfirmButton: false });
        }
      }
    } catch (e) {
      Swal.fire('ไม่สามารถดึงข้อมูล Re Med. ได้', 'กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล JHCIS', 'error');
    }
  };
  
    
  const [showVhvLoginModal, setShowVhvLoginModal] = useState(false);
  const [vhvIdInput, setVhvIdInput] = useState('');
  const [vhvLoginError, setVhvLoginError] = useState('');
  const [vhvStatsData, setVhvStatsData] = useState<any[]>([]);

  // 🩺 State สำหรับเลือกประเภทบริการ: 'health_station' (ค่าเริ่มต้น) หรือ 'screening' (คัดกรอง)
  const [serviceType, setServiceType] = useState<'health_station' | 'screening'>('health_station');

  const [smokeStatus, setSmokeStatus] = useState<string>('');
  const [alcoholStatus, setAlcoholStatus] = useState<string>('');
  const [alcoholAdvice, setAlcoholAdvice] = useState<string>(''); // 👈 เพิ่ม state เก็บคำแนะนำสุรา
 // 🩺 State ย่อยสำหรับบุหรี่
  const [smokeAmount, setSmokeAmount] = useState<string>('1B509'); // ค่าเริ่มต้นคือ 1B509 (สูบแต่ไม่ระบุมวน)
  const [smokeWake, setSmokeWake] = useState<string>(''); // 👈 ตัวแปรใหม่สำหรับข้อ 2
  const [smokeAdvice, setSmokeAdvice] = useState<string>(''); // 👈 🚨 เติมบรรทัดนี้กลับคืนมาตรงนี้ครับ
  const [sugarFasting, setSugarFasting] = useState<string>(''); // 👈 State เก็บสถานะเจาะน้ำตาล

  // 👈 ฟังก์ชันเด้ง Popup เลือกสถานะน้ำตาล (ปรับให้แก้ไขได้)
  const handleSugarClick = async (inputElement: HTMLInputElement | null = null) => {
    // 🚨 ลบเงื่อนไข if (sugarFasting) return; ออก เพื่อให้เรียก Popup ซ้ำได้
    
    const { value: fastingOption } = await Swal.fire({
      title: 'ประเมินก่อนเจาะน้ำตาล',
      html: '<p style="color:#64748b;">กรุณาระบุสภาวะของคนไข้ก่อนเจาะเลือดค่ะ</p>',
      icon: 'question',
      input: 'radio',
      inputValue: sugarFasting, // 👈 ให้ Popup จำค่าเดิมที่เคยเลือกไว้
      inputOptions: {
        'งดน้ำ-อาหาร': 'งดน้ำ - อาหารฯ',
        'ไม่งดน้ำ-อาหาร': 'ไม่งดน้ำ - อาหารฯ'
      },
      inputValidator: (value) => {
        if (!value) return 'กรุณาเลือกตัวเลือกก่อนค่ะ!'
      },
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#3b82f6',
      showCancelButton: !!sugarFasting, // 👈 ถ้าเคยเลือกค่าไปแล้ว ให้มีปุ่มยกเลิกได้
      cancelButtonText: 'ยกเลิก',
      allowOutsideClick: false
    });

    if (fastingOption) {
      setSugarFasting(fastingOption);
      if (inputElement) setTimeout(() => inputElement.focus(), 100); // พิมพ์ค่าต่อได้เลย
    }
  };

  // 🦸‍♂️ State สำหรับดูรายละเอียดผลงาน อสม.
  const [showVhvDetailsModal, setShowVhvDetailsModal] = useState(false);
  const [selectedVhvName, setSelectedVhvName] = useState('');
  const [vhvPatientLogs, setVhvPatientLogs] = useState<any[]>([]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [adminTab, setAdminTab] = useState<'settings' | 'data' | 'analytics' | 'vhv' | 'bp'>('settings');
  const [analyticsData, setAnalyticsData] = useState<any>(null); 

  const [bpDate, setBpDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [bpData, setBpData] = useState<any[]>([]);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedBpRecord, setSelectedBpRecord] = useState<any>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [referStatus, setReferStatus] = useState(''); // 👈 เพิ่มตัวแปรเก็บสถานะ Refer

  // โหลดประวัติแพ้ยาอัตโนมัติเมื่อเจ้าหน้าที่เปิดผู้ป่วยรายใหม่
  useEffect(() => {
    if (isStaffLoggedIn && patient?.cid && !activeVisitNo) {
      axios
        .get(`${API_BASE_URL}/jhcis-api/re-med/${patient.cid}`, { headers: { 'x-api-key': API_KEY } })
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.allergies)) {
            setDrugAllergies(res.data.allergies);
          }
        })
        .catch(() => {});
    }
  }, [isStaffLoggedIn, patient?.cid, activeVisitNo]);

  // ฟังก์ชันดึงข้อมูลความดัน
  const fetchBPData = async (dateStr: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/jhcis-api/bp-monitor?date=${dateStr}`, { headers: { 'x-api-key': API_KEY } });
      if (res.data.success) setBpData(res.data.data);
    } catch (e) { console.error("Fetch BP Error"); }
  };
  

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

  // 🟢 State สำหรับหน้าต่างแนะนำการใช้งาน (Visual Guide)
  const [guideModal, setGuideModal] = useState<{show: boolean, type: string, title: string, gifUrl: string, desc: string, action: Function | null}>({
    show: false, type: '', title: '', gifUrl: '', desc: '', action: null
  });

  // 🦸‍♂️ ฟังก์ชันดึงรายละเอียด อสม. (God-Tier Cache Busting)
  const fetchVhvDetails = async (vhvCid: string, vhvName: string) => {
      try {
          console.log("กำลังดึงข้อมูลของ อสม. รหัส:", vhvCid);
          
          // 🛡️ เทคนิค Cache Busting: แนบเวลาเสี้ยววินาทีไปกับ URL 
          const timestamp = new Date().getTime();
          const res = await axios.get(`${API_BASE_URL}/jhcis-api/vhv-logs/${vhvCid}?t=${timestamp}`, { 
              headers: { 'x-api-key': API_KEY } 
          });
          
          if(res.data.success) {
              setVhvPatientLogs(res.data.data);
              setSelectedVhvName(vhvName);
              setShowVhvDetailsModal(true);
          }
      } catch(e: any) {
          console.error("Drill-down Error:", e);
          const errorMsg = e.response?.data?.message || e.message;
          alert(`ไม่สามารถดึงข้อมูลได้ สาเหตุ: ${errorMsg}`);
      }
  };

  // พจนานุกรมแปลรหัส JHCIS เป็นข้อความ
const NUTRITION_DICT: any = {
  nlevel: { '1': 'น้ำหนักมาก', '2': 'น้ำหนักค่อนข้างมาก', '3': 'นน.ตามเกณฑ์', '4': 'น้ำหนักค่อนข้างน้อย', '5': 'น้ำหนักน้อย', '99': 'นน.สูงเกิน กองโภช.แปลผลไม่ได้' },
  nlevel2: { '1': 'สูง', '2': 'ค่อนข้างสูง', '3': 'สูงตามเกณฑ์', '4': 'ค่อนข้างเตี้ย', '5': 'เตี้ย', '99': 'สูงตามเกณฑ์' },
  nlevel3: { '1': 'อ้วน', '2': 'เริ่มอ้วน', '3': 'ท้วม', '4': 'สมส่วน', '5': 'ค่อนข้างผอม', '6': 'ผอม', '99': 'สมส่วน' },
  growdevelop: { '1': 'สมวัย / ปกติ', '2': 'สงสัยล่าช้า', '3': 'ล่าช้า' }
};

  // 🟢 ฟังก์ชันเปิดหน้าต่าง Guide
  const openGuideModal = (type: string) => {
    let title = ''; let gifUrl = ''; let desc = ''; let action = null;

    switch(type) {
      case 'bp':
        title = 'วิธีวัดความดันโลหิต';
        gifUrl = '/guide-bp.gif';
        desc = 'สอดแขนเข้าไปในอุโมงค์ให้พอดีกับข้อพับ วางแขนราบบนโต๊ะ นั่งหลังตรง แล้วอยู่นิ่งๆ นะคะ';
        action = connectBluetoothBP;
        break;
      case 'o2':
        title = 'วิธีวัดออกซิเจนปลายนิ้ว';
        gifUrl = '/guide-o2.gif';
        desc = 'สอดนิ้วชี้เข้าไปในเครื่องให้สุด วางมือราบกับโต๊ะ แล้วอยู่นิ่งๆ ห้ามขยับนิ้วค่ะ';
        action = connectBluetoothO2;
        break;
      case 'weight':
        title = 'วิธีชั่งน้ำหนัก';
        gifUrl = '/guide-weight.gif';
        desc = 'ถอดรองเท้า แล้วก้าวขึ้นยืนบนเครื่องชั่งน้ำหนักให้เต็มเท้าทั้งสองข้างค่ะ';
        action = connectBluetoothWeight;
        break;
      case 'temp':
        title = 'วิธีวัดอุณหภูมิ';
        gifUrl = '/guide-temp.gif';
        desc = 'นำเครื่องวัดจ่อที่บริเวณหน้าผาก ห่างประมาณ 3 เซนติเมตร แล้วกดปุ่มวัดค่ะ';
        action = connectBluetoothTemp;
        break;
      case 'sugar':
        title = 'วิธีวัดน้ำตาลในเลือด';
        gifUrl = '/guide-sugar.gif';
        desc = 'เปลี่ยนเข็มใหม่ทุกครั้ง เจาะที่ปลายนิ้วด้านข้าง แล้วบีบเลือดลงบนแผ่นตรวจค่ะ';
        action = connectBluetoothSugar;
        break;
    }

    setGuideModal({ show: true, type, title, gifUrl, desc, action });
    speak(desc);
  };

  const handleStartDeviceConnection = async () => {
    if (guideModal.action) {
      setGuideModal({ ...guideModal, show: false });
      await guideModal.action(); 
    }
  };
  
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

  // ==========================================
  // 🕵️‍♂️ ทางเข้าลับหน้า Admin (กดโลโก้ 5 ครั้ง)
  // ==========================================
  const [adminClicks, setAdminClicks] = useState(0);

  const handleLogoClick = () => {
    setAdminClicks(prev => prev + 1);
    if (adminClicks + 1 >= 5) {
      setShowSettings(true);    
      setAdminTab('data');      
      setAdminClicks(0);
      speak("เข้าสู่โหมดผู้ดูแลระบบ");
    }
  };
  
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

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [vitals, setVitals] = useState({
    height: '---', weight: '---', waist: '---',
    bmi: '---', temp: '---', spo2: '---',
    sysDia: '---', pulse: '---', sugar: '---',
    headCircum: '---' // 👈 เพิ่มตัวแปรเส้นรอบศีรษะ
  });

  const [childDev, setChildDev] = useState({
    nlevel: '3',       // 3 = นน.ตามเกณฑ์
    nlevel2: '3',      // 3 = สูงตามเกณฑ์
    nlevel3: '4',      // 4 = สมส่วน
    growdevelop: '1'   // 1 = สมวัย
  });

  // 👇👇👇👇 [ก๊อปปี้ก้อนนี้มาวางแทรกตรงนี้ได้เลยครับ] 👇👇👇👇
  // 🧠 สมองกลประเมินโภชนาการเด็ก (จำลองกราฟกรมอนามัย และดักบั๊กของ JHCIS)
  useEffect(() => {
    if (patient?.age_months !== undefined && patient?.age_months <= 60) {
      const w = parseFloat(vitals.weight);
      const h = parseFloat(vitals.height);
      const age = patient.age_months;

      if (w > 0 && h > 0) {
        
        // 🚨 ดักจับเคสหลุดกราฟ (เช่น เด็ก 3 ขวบ หนัก 50 กก.) ให้โชว์ข้อความเดียวกับ JHCIS
        if (w >= 35 || h >= 130 || w <= 2 || h <= 40) {
            setChildDev(prev => ({ ...prev, nlevel: '99', nlevel2: '99', nlevel3: '99' }));
            return;
        }

        let n1 = '3', n2 = '3', n3 = '4';
        
        // 1. ประเมิน นน./ส่วนสูง (nlevel3) อิงตาม BMI เด็ก
        const bmi = w / Math.pow(h / 100, 2);
        if (bmi > 18.5) n3 = '1';      // อ้วน
        else if (bmi > 17.5) n3 = '2'; // เริ่มอ้วน
        else if (bmi > 16.5) n3 = '3'; // ท้วม
        else if (bmi < 13.5) n3 = '6'; // ผอม
        else if (bmi < 14.5) n3 = '5'; // ค่อนข้างผอม
        
        // 2. ประเมิน นน./อายุ (nlevel)
        const avgW = (age * 0.25) + 3; // สูตรค่าเฉลี่ย นน.
        if (w > avgW * 1.3) n1 = '1';
        else if (w > avgW * 1.15) n1 = '2';
        else if (w < avgW * 0.7) n1 = '5';
        else if (w < avgW * 0.85) n1 = '4';

        // 3. ประเมิน ส่วนสูง/อายุ (nlevel2)
        const avgH = (age * 0.8) + 50; // สูตรค่าเฉลี่ย ส่วนสูง
        if (h > avgH * 1.1) n2 = '1';
        else if (h > avgH * 1.05) n2 = '2';
        else if (h < avgH * 0.9) n2 = '5';
        else if (h < avgH * 0.95) n2 = '4';

        setChildDev(prev => ({ ...prev, nlevel: n1, nlevel2: n2, nlevel3: n3 }));
      }
    }
  }, [vitals.weight, vitals.height, patient?.age_months]);
  // 👆👆👆👆 [สิ้นสุดโค้ดที่ต้องแทรก] 👆👆👆👆


  // 🧠 ให้ AI ทำงานอัตโนมัติ (โค้ดเดิมของคุณสิรภพ จะอยู่ต่อจากตรงนี้ครับ)
  useEffect(() => {
    if (vitals.sysDia !== '---' || vitals.weight !== '---' || vitals.sugar !== '---') {
      const fetchAI = async () => {
        setAiLoading(true);
        try {
          const res = await axios.post(`${API_BASE_URL}/jhcis-api/ai-analyze`, { vitals }, { headers: { 'x-api-key': API_KEY } });
          setAiResponse(res.data.message);
          speak(res.data.message); 
        } catch (e) {
          setAiResponse("ไม่สามารถเชื่อมต่อระบบ AI ได้ในขณะนี้");
        }
        setAiLoading(false);
      };
      
      const timeoutId = setTimeout(() => {
        fetchAI();
      }, 2000); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [vitals.sysDia, vitals.weight, vitals.sugar]);

  // 🚨 ระบบตรวจสอบความดันวิกฤตและเด้งแจ้งเตือนเต็มหน้าจอแบบอัตโนมัติ
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

  // 1. เพิ่ม State สำหรับเก็บรูปภาพคนไข้ (Base64)
  const [patientImage, setPatientImage] = useState<string | null>(null);
  
  const fetchPatientPhoto = async (cid: string) => {
    try {
      const timestamp = new Date().getTime();
      const photoUrl = `${API_BASE_URL}/jhcis-api/photo/${cid}?t=${timestamp}`;
      
      const response = await fetch(photoUrl, {
        method: 'GET',
        headers: { 'x-api-key': API_KEY }
      });
      
      if (response.ok) {
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
            alert('📸 บันทึกรูปภาพลงฐานข้อมูลสำเร็จ!');
          } else {
            alert(`❌ บันทึกรูปไม่สำเร็จ: ${data.message}`);
          }
        } catch (error: any) {
          console.error("อัปโหลดรูปไม่สำเร็จ:", error);
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

      // ... โค้ดเดิมข้างบน ...
      setVitals({ height: '---', weight: '---', waist: '---', bmi: '---', temp: '---', spo2: '---', sysDia: '---', pulse: '---', sugar: '---', headCircum: '---' });
      setAiResponse('');
      
      // แก้เป็นแบบนี้ทั้ง 3 จุดเลยครับ
setSmokeStatus(''); setAlcoholStatus(''); setSmokeAmount('1B509'); setSmokeWake(''); setSmokeAdvice(''); setAlcoholAdvice(''); setSugarFasting(''); setCustomSymptoms(''); setCustomSymptomsco(''); resetClinicalOrderFields();

      try {
        const jhcisResponse = await axios.get(`${API_BASE_URL}/jhcis-api/patient/${cid}`, {
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

      axios.post('http://localhost:8189/api/nhso-authen', {
          pid: cid, claimType: "PG0060001", mobile: "0000000000", correlationId: "MiniHealthStation-001"
      }).catch(() => {});

      await fetchPatientPhoto(cid); 
      setIsLoggedIn(true);
    } catch (error) {
      alert("ระบบประมวลผลขัดข้อง");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (currentVhv) axios.post(`${API_BASE_URL}/jhcis-api/vhv-heartbeat`, { cid: currentVhv.cid, status: 'offline' }, { headers: { 'x-api-key': API_KEY } }).catch(()=>{});
    setIsLoggedIn(false);
    setPatient(null);
    setPatientPhoto(null);
    setPatientImage(null); 
    setIsTestingMode(false);
    setVitals({ height: '---', weight: '---', waist: '---', bmi: '---', temp: '---', spo2: '---', sysDia: '---', pulse: '---', sugar: '---', headCircum: '---' });
    setSmokeStatus(''); setAlcoholStatus(''); setSmokeAmount('1B509'); setSmokeWake(''); setSmokeAdvice(''); setAlcoholAdvice(''); setSugarFasting(''); setCustomSymptoms(''); setCustomSymptomsco(''); resetClinicalOrderFields();
  };

  const processManualId = async (overrideCid?: string) => {
    const targetCid = typeof overrideCid === 'string' ? overrideCid : manualIdInput;
    if (targetCid.length !== 13) {
      setManualIdError('กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก');
      return;
    }
    
    setLoading(true);
    setManualIdError('');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/jhcis-api/patient/${targetCid}`, { 
        headers: { 'x-api-key': API_KEY }, 
        timeout: 5000 
      });
      
      if (response.data.success) {
        setVitals({ height: '---', weight: '---', waist: '---', bmi: '---', temp: '---', spo2: '---', sysDia: '---', pulse: '---', sugar: '---', headCircum: '---' });
        setAiResponse('');
        setSmokeStatus(''); setAlcoholStatus(''); setSmokeAmount('1B509'); setSmokeWake(''); setSmokeAdvice(''); setAlcoholAdvice(''); setSugarFasting(''); setCustomSymptoms(''); setCustomSymptomsco(''); resetClinicalOrderFields();

        setPatient({ ...response.data.data, cid: targetCid });
        await fetchPatientPhoto(targetCid); 
        setIsTestingMode(true); 
        setIsLoggedIn(true);
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

  // 💳 กดที่รูปหน้าจอเพื่อสั่งอ่านบัตรจากแอป JHCIS Card Bridge (Port 8189)
  const handleManualRead = async () => {
    if (!currentVhv) {
        Swal.fire({
            title: 'แจ้งเตือน',
            text: 'กรุณาลงชื่อเข้าปฏิบัติงาน อสม. ก่อนสอดบัตรหรือค้นหาประวัติคนไข้ค่ะ',
            icon: 'warning',
            confirmButtonText: '<i class="fa-solid fa-user-nurse"></i> ลงชื่อ อสม.',
            confirmButtonColor: '#8b5cf6',
            showCancelButton: true,
            cancelButtonText: 'ปิด'
        }).then((result) => {
            if (result.isConfirmed) {
                setShowVhvLoginModal(true);
                setVhvIdInput('');
                setVhvLoginError('');
            }
        });
        return;
    }

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8189/api/smartcard/read?readImageFlag=true', { timeout: 4000 });
      if (response.data && response.data.pid) {
        await processCardData(response.data);
      } else {
        Swal.fire('ไม่พบบัตรประชาชน', 'กรุณาสอดบัตรประชาชนให้แน่น แล้วแตะอีกครั้งครับ', 'warning');
      }
    } catch (e) {
      Swal.fire(
        'ไม่สามารถติดต่อเครื่องอ่านบัตรได้',
        'กรุณาเปิดแอป JHCIS Card Bridge บนแท็บเล็ตทิ้งไว้เบื้องหลัง แล้วเสียบสายเครื่องอ่านบัตรใหม่อีกครั้งครับ',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔄 ระบบตรวจจับบัตรประชาชน (อ่านเฉพาะตอนอยู่หน้าแรก เมื่อเข้าหน้าคัดกรองแล้วถอดบัตรออกได้ทันที)
  useEffect(() => {
    let checkCardInterval: NodeJS.Timeout;
    
    // เช็คบัตรเฉพาะตอนที่ยังไม่ได้เข้าหน้าคนไข้ (!isLoggedIn)
    if (!isLoggedIn && !loading && !showSettings && !isSubmitting && !showManualIdModal) {
      checkCardInterval = setInterval(async () => {
        if (!currentVhv) return;

        try {
          const response = await axios.get('http://localhost:8189/api/smartcard/read?readImageFlag=true', { timeout: 2500 });
          if (response.data && response.data.pid) {
            setIsTestingMode(false);
            processCardData(response.data);
          }
        } catch (e) {
          // กรณีไม่ได้เสียบบัตร ไม่ต้องทำอะไร
        }
      }, 2500);
    }
    
    return () => clearInterval(checkCardInterval);
  }, [isLoggedIn, loading, showSettings, isSubmitting, showManualIdModal, currentVhv]);

  const connectBluetoothO2 = async () => {
    try {
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
    let heartbeatInterval: NodeJS.Timeout | null = null; 

    try {
      const device = await navigator.bluetooth.requestDevice({ 
        acceptAllDevices: true, 
        optionalServices: [0xA602] 
      });
      
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService(0xA602);
      const characteristics = await service?.getCharacteristics();

      console.clear();
      console.log("🏥 [Health Tech Architect] สถาปัตยกรรม Full-Bridge Protocol ทำงาน!");

      const mainWritePipe = characteristics?.find(c => c.properties.write || c.properties.writeWithoutResponse);
      const notifyPipes = characteristics?.filter(c => c.properties.notify || c.properties.indicate) || [];

      const processMedicalData = async (rawData: Uint8Array) => {
        const hexStr = Array.from(rawData).map(b => b.toString(16).padStart(2, '0')).join(' ');

        if (hexStr.includes("00 00 00 00 00 00 00 00") || hexStr.includes("10 0a 00 07 00 00")) return;

        if (rawData.length >= 3 && rawData[0] === 0x00 && rawData[1] === 0x01) {
          injectProfile(mainWritePipe);
          return;
        }

        let extractedWeight = 0;

        if (rawData.length >= 12 && rawData[0] === 0x10) {
           if (rawData[1] === 0x11 || rawData.length >= 19) {
              extractedWeight = ((rawData[10] << 8) | rawData[11]) * 0.01;
           } 
           else if (rawData[1] === 0x0a) {
              extractedWeight = ((rawData[4] << 8) | rawData[5]) * 0.01;
           }
        }

        if (extractedWeight > 5.0 && extractedWeight < 300.0) {
           const finalWeight = extractedWeight.toFixed(2);
           
           setVitals(prev => {
              if (prev.weight === finalWeight) return prev; 
              const h = parseFloat(prev.height) / 100;
              return { 
                ...prev, 
                weight: finalWeight, 
                bmi: h > 0 ? (extractedWeight / (h * h)).toFixed(2) : '---' 
              };
           });
        }
      };

      const injectProfile = async (pipe: BluetoothRemoteGATTCharacteristic | undefined) => {
        if (!pipe) return;
        const profilePayload = new Uint8Array([0xFE, 0x01, 0x01, 0x1E, 0xAA, 0x3E, 0x00, 0x00]);
        try {
          if (pipe.properties.writeWithoutResponse) await pipe.writeValueWithoutResponse(profilePayload);
          else await pipe.writeValue(profilePayload);
        } catch (e) {}
      };

      for (const char of notifyPipes) {
        try {
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (e: any) => {
            processMedicalData(new Uint8Array(e.target.value.buffer));
          });
        } catch (e) {}
      }

      if (mainWritePipe) {
        const bootSequence = [
          new Uint8Array([0xFD, 0x37]), 
          new Uint8Array([0x01, 0x00])  
        ];
        
        for (const cmd of bootSequence) {
           try {
             if (mainWritePipe.properties.writeWithoutResponse) await mainWritePipe.writeValueWithoutResponse(cmd);
             else await mainWritePipe.writeValue(cmd);
           } catch(e) { }
        }
        
        await injectProfile(mainWritePipe);
      }

      if (mainWritePipe) {
         heartbeatInterval = setInterval(async () => {
            try {
              const ping = new Uint8Array([0x00]); 
              if (mainWritePipe.properties.writeWithoutResponse) await mainWritePipe.writeValueWithoutResponse(ping);
              else await mainWritePipe.writeValue(ping);
            } catch(e) {}
         }, 1000); 
      }

      device.addEventListener('gattserverdisconnected', () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      });

      alert(`✅ เชื่อมต่อเครื่องชั่งน้ำหนักสำเร็จ!`);
      updateDeviceName('weight', device.name || 'ALLWELL Scale');

    } catch (error) {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      console.error("BLE Error:", error);
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
        const mantissa = value.getUint8(1) | (value.getUint8(2) << 8) | (value.getUint8(3) << 16);
        const exponent = value.getInt8(4);
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

  const parseBPData = (dataView: DataView) => {
    let offset = 0;
    const flags = dataView.getUint8(offset++);
    const isKpa = (flags & 0x01) !== 0; 
    const hasTimestamp = (flags & 0x02) !== 0; 
    const hasPulseRate = (flags & 0x04) !== 0; 

    const readSfloat = (view: DataView, pos: number) => {
      const raw = view.getUint16(pos, true); 
      const mantissa = raw & 0x0FFF;         
      let exponent = raw >> 12;              
      if (exponent >= 8) exponent = -((~exponent & 0x0F) + 1);
      return mantissa * Math.pow(10, exponent);
    };

    const sys = readSfloat(dataView, offset); offset += 2;
    const dia = readSfloat(dataView, offset); offset += 2;
    offset += 2; 
    if (hasTimestamp) offset += 7; 

    let pulse = 0;
    if (hasPulseRate) {
      pulse = readSfloat(dataView, offset); offset += 2;
    }
    return { sys, dia, pulse, isKpa };
  };

  const connectBluetoothBP = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ 
        acceptAllDevices: true, 
        optionalServices: ['blood_pressure'] 
      });
      
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('blood_pressure');
      const characteristic = await service?.getCharacteristic('blood_pressure_measurement');

      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = new DataView(event.target.value.buffer);
        const bpData = parseBPData(dataView);
        const finalSys = bpData.isKpa ? (bpData.sys * 7.50062).toFixed(0) : bpData.sys.toFixed(0);
        const finalDia = bpData.isKpa ? (bpData.dia * 7.50062).toFixed(0) : bpData.dia.toFixed(0);
        const finalPulse = bpData.pulse.toFixed(0);

        setVitals(prev => ({ ...prev, sysDia: `${finalSys}/${finalDia}`, pulse: finalPulse }));
      });

      alert(`✅ จับคู่อุปกรณ์สำเร็จ!`);
      updateDeviceName('bp', device.name || 'YUWELL BP'); 

    } catch (error) {
      console.error("BLE Error (BP Manual):", error);
    }
  };

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
          const dataView = new DataView(event.target.value.buffer);
          const bpData = parseBPData(dataView);

          const finalSys = bpData.isKpa ? (bpData.sys * 7.50062).toFixed(0) : bpData.sys.toFixed(0);
          const finalDia = bpData.isKpa ? (bpData.dia * 7.50062).toFixed(0) : bpData.dia.toFixed(0);
          const finalPulse = bpData.pulse.toFixed(0);
          const combinedBP = `${finalSys}/${finalDia}`;

          setVitals(prev => ({ 
            ...prev, 
            sysDia: combinedBP, 
            pulse: finalPulse 
          }));
          
          speak(`วัดความดันเสร็จสิ้น ความดันโลหิต ${finalSys} ตัวล่าง ${finalDia} ชีพจร ${finalPulse} ครั้งต่อนาทีค่ะ`);
        });

        bpDevice.addEventListener('gattserverdisconnected', () => {
          isConnecting = false;
        }, { once: true });

      } catch (error) {
        isConnecting = false;
      }
    };

    if (isLoggedIn) {
      pollInterval = setInterval(huntForBP, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isLoggedIn]);

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

      if (field === 'sysDia') {
        finalValue = finalValue.replace(/[^\d/]/g, '');
        const isDeleting = prev.sysDia !== '---' && finalValue.length < prev.sysDia.length;
        if (!isDeleting) {
          if (finalValue.length === 3 && !finalValue.includes('/')) {
            finalValue += '/';
          }
        }
        if (finalValue.split('/').length > 2) {
          finalValue = prev.sysDia;
        }
      }

      const newVitals = { ...prev, [field]: finalValue };

      if (field === 'height' || field === 'weight') {
        const h = parseFloat(field === 'height' ? finalValue : prev.height) / 100;
        const w = parseFloat(field === 'weight' ? finalValue : prev.weight);
        if (h > 0 && w > 0) newVitals.bmi = (w / (h * h)).toFixed(2);
        else newVitals.bmi = '---';
      }
      
      return newVitals;
    });
  };

  const processVhvLogin = async () => {
    if (vhvIdInput.length !== 13) { setVhvLoginError('กรุณากรอกเลขบัตร 13 หลัก'); return; }
    setLoading(true); setVhvLoginError('');
    
    try {
      const response = await fetch('/vhv.json');
      if (!response.ok) throw new Error('File not found');
      
      const vhvList = await response.json();
      
      const foundVhv = vhvList.find((v: any) => {
        const dbCid = String(v.cid || v['เลขประจำตัระชาชน'] || '').trim();
        return dbCid === vhvIdInput.trim();
      });

      if (foundVhv) {
        const trimmedCid = vhvIdInput.trim();
        const vhvName = foundVhv.name || foundVhv['ชื่อ- นามสกุล'] || 'อสม.';
        setCurrentVhv({ cid: trimmedCid, name: vhvName });
        setShowVhvLoginModal(false);
        setVhvIdInput('');

        // 🌟 เช็คว่าเป็นเจ้าหน้าที่ (Staff) หรือไม่
        const staffCids = ['3251000441639', '1259700107058', '1279800022828'];
        const isStaff = staffCids.includes(trimmedCid);
        const roleTitle = isStaff ? 'เจ้าหน้าที่' : 'อสม.';

        // ✅ ถ้าเป็นเจ้าหน้าที่ ให้เด้งเข้าหน้าโต๊ะตรวจ (คิวตรวจวันนี้) ทันที
        if (isStaff) {
          setPatient(null);
          resetClinicalOrderFields();
          setIsLoggedIn(true);
        }

        Swal.fire({
          title: `เข้าสู่ระบบ${roleTitle}`,
          text: `ยินดีต้อนรับ ${roleTitle} ${vhvName}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      
      } else {
        setVhvLoginError('ไม่พบข้อมูล อสม. ท่านนี้ในระบบ (ลองเช็คเลขอีกครั้ง)');
      }
    } catch (err) {
      console.error(err);
      setVhvLoginError('ไม่พบไฟล์ vhv.json ในระบบ กรุณาตรวจสอบโฟลเดอร์ public');
    } finally { 
      setLoading(false); 
    }
  };

  const sendToJHCISQueue = () => {
    if (!patient?.cid) {
      alert("⚠️ ไม่พบข้อมูลบัตรประชาชน กรุณาเสียบบัตรใหม่อีกครั้ง");
      return;
    }

    const ageMonths = Number(patient?.age_months);
    const isAdult = isNaN(ageMonths) || ageMonths > 60;

    // 🚨 1. ตรวจสอบข้อมูลสัญญาณชีพที่บังคับกรอก
    const missingVitals = [];
    
    // บังคับสำหรับทุกคน (น้ำหนัก, ส่วนสูง)
    if (vitals.weight === '---' || vitals.weight === '' || parseFloat(vitals.weight) <= 0) missingVitals.push('น้ำหนัก');
    if (vitals.height === '---' || vitals.height === '' || parseFloat(vitals.height) <= 0) missingVitals.push('ส่วนสูง');
    
    // บังคับเพิ่มเติมสำหรับผู้ใหญ่ (รอบเอว, ความดัน, ชีพจร)
    if (isAdult) {
      if (vitals.waist === '---' || vitals.waist === '' || parseFloat(vitals.waist) <= 0) missingVitals.push('รอบเอว');
      if (vitals.sysDia === '---' || vitals.sysDia === '') missingVitals.push('ความดันโลหิต');
      if (vitals.pulse === '---' || vitals.pulse === '' || parseInt(vitals.pulse) <= 0) missingVitals.push('ชีพจร');
      
      // 🚨 ตรวจสอบว่าถ้าใส่น้ำตาลมาแล้ว ต้องเลือกสถานะงดอาหารด้วย
      const hasSugarValue = vitals.sugar !== '---' && vitals.sugar !== '' && parseFloat(vitals.sugar) > 0;
      if (hasSugarValue && !sugarFasting) {
        missingVitals.push('สภาวะก่อนเจาะน้ำตาล (คลิกที่ช่องน้ำตาล)');
      }
    }

    // ถ้ามีช่องที่ยังไม่ได้กรอก ให้เด้งแจ้งเตือนบอกว่าขาดอะไรบ้าง
    if (missingVitals.length > 0) {
      Swal.fire({
        title: 'ข้อมูลสัญญาณชีพไม่ครบถ้วน!',
        html: `กรุณาวัดหรือกรอกข้อมูลต่อไปนี้ให้ครบก่อนบันทึกค่ะ:<br/><br/><strong style="color:#ef4444; font-size: 18px;">${missingVitals.join(' / ')}</strong>`,
        icon: 'warning',
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#f59e0b'
      });
      return; // หยุดการทำงาน ไม่ให้เด้งหน้าต่างยืนยัน
    }

    // 🚨 2. ตรวจสอบพฤติกรรมเสี่ยง (บุหรี่/สุรา) สำหรับผู้ใหญ่
    if (isAdult) {
      if (!smokeStatus || !alcoholStatus) {
        Swal.fire({
          title: 'ข้อมูลพฤติกรรมไม่ครบถ้วน!',
          text: 'กรุณาระบุ "ประวัติสูบบุหรี่" และ "ประวัติดื่มสุรา" ให้ครบถ้วนก่อนบันทึกข้อมูล',
          icon: 'warning',
          confirmButtonText: 'รับทราบ',
          confirmButtonColor: '#f59e0b'
        });
        return; // หยุดการทำงาน ไม่ให้เด้งหน้าต่างยืนยัน
      }
    }

    // 🚨 3. ถ้าเป็นเจ้าหน้าที่ ให้เช็คว่าพิมพ์อาการสำคัญหรือยัง
    if (isAdult && isStaffLoggedIn && !customSymptoms.trim()) {
      Swal.fire({
        title: 'กรุณาระบุอาการสำคัญ!',
        text: 'กรุณาพิมพ์อาการสำคัญของผู้ป่วยก่อนบันทึกข้อมูลเข้า JHCIS',
        icon: 'warning',
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }
    // ถ้าข้อมูลครบถ้วนทั้งหมด ถึงจะแสดงหน้าต่างยืนยันการบันทึก
    setShowConfirmQueueModal(true);
  };

  const confirmSendToJHCISQueue = async () => {
    setShowConfirmQueueModal(false); 
    setIsSubmitting(true); 

    // คำนวณอายุเป็นปีคร่าวๆ จาก age_months ของคนไข้
    const ageYears = patient?.age_months !== undefined ? Math.floor(patient.age_months / 12) : 0;
    const isFemale = patient?.sex === '2' || patient?.sex === 'หญิง';
    
    // เช็คเงื่อนไขคัดกรองมะเร็งเต้านมตรงนี้เลย (หญิง อายุ 30-70 ปี)
    const needBreastCancerScreening = isFemale && ageYears >= 30 && ageYears <= 70;

    const payload = {
      visitno: isStaffLoggedIn ? activeVisitNo : null,
      cid: patient.cid,
      vhv_cid: currentVhv ? currentVhv.cid : null,
      isStaff: isStaffLoggedIn,
      customSymptoms: isStaffLoggedIn ? customSymptoms.trim() : '',
      customSymptomsco: isStaffLoggedIn ? customSymptomsco.trim() : '',
      serviceType: isStaffLoggedIn ? 'staff_custom' : serviceType,
      ageMonths: patient?.age_months,
      headCircum: vitals.headCircum === '---' ? 0 : parseFloat(vitals.headCircum),
      nlevel: childDev.nlevel,
      nlevel2: childDev.nlevel2,
      nlevel3: childDev.nlevel3,
      growdevelop: childDev.growdevelop,
      diagNote: isStaffLoggedIn ? diagNote.trim() : '',
      timeService: isStaffLoggedIn ? timeService : '1',
      icd10List: isStaffLoggedIn ? icd10List : [],
      drugList: isStaffLoggedIn ? drugList : [],
      smokeStatus: smokeStatus,
      alcoholStatus: alcoholStatus,
      smokeAmount: smokeAmount,
      smokeWake: smokeWake,
      smokeAdvice: smokeAdvice,
      alcoholAdvice: alcoholAdvice,
      sugarFastingStatus: sugarFasting,
      breastCancerScreening: needBreastCancerScreening,
      weight: vitals.weight === '' || vitals.weight === '---' ? 0 : parseFloat(vitals.weight),
      height: vitals.height === '' || vitals.height === '---' ? 0 : parseFloat(vitals.height),
      sysDia: vitals.sysDia === '---' ? '' : vitals.sysDia,
      pulse: vitals.pulse === '' || vitals.pulse === '---' ? 0 : parseInt(vitals.pulse),
      temp: vitals.temp === '' || vitals.temp === '---' ? 0 : parseFloat(vitals.temp),
      waist: vitals.waist === '' || vitals.waist === '---' ? 0 : parseFloat(vitals.waist),
      sugarText: vitals.sugar === '' || vitals.sugar === '---' ? '' : `น้ำตาลในเลือด ${vitals.sugar}`,
      sugar: vitals.sugar === '' || vitals.sugar === '---' ? '' : vitals.sugar
    };
    
    try {
      const response = await axios.post(`${API_BASE_URL}/jhcis-api/queue`, payload, {
        headers: { 'x-api-key': API_KEY },
        timeout: 5000 
      });

      if (response.data || response.status === 200) {
        if (isStaffLoggedIn) {
          setIsSubmitting(false);
          if (response.data?.visitno) setActiveVisitNo(response.data.visitno);
          setQueueRefreshTrigger(prev => prev + 1);
          Swal.fire({
            title: 'บันทึกเข้า JHCIS สำเร็จ!',
            text: `SEQ ${response.data?.visitno || activeVisitNo || ''} บันทึกเรียบร้อยแล้ว`,
            icon: 'success',
            timer: 1600,
            showConfirmButton: false
          });
          return;
        }

        setIsSubmitting(false);
        speak('บันทึกข้อมูลและจัดคิวเข้าสู่ระบบสำเร็จ ขอบคุณที่ใช้บริการค่ะ');
        
        const { value: rating } = await Swal.fire({
            title: 'จัดคิวสำเร็จ!',
            width: '600px',
            html: `
                <p style="margin: 0 0 25px 0; font-size: 18px; color: #4B5563;">การให้บริการในวันนี้เป็นอย่างไรบ้างครับ?</p>
                <style>
                    .kiosk-rating-group { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin: 10px 10px 20px 10px; }
                    .rating-option { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; flex: 1; padding: 10px; border-radius: 15px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                    .rating-option input[type="radio"] { display: none; }
                    .rating-icon { font-size: 55px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); filter: grayscale(80%) opacity(50%); }
                    .rating-label { font-size: 16px; font-weight: bold; color: #9CA3AF; transition: color 0.3s; }
                    .rating-option:nth-child(1) .rating-icon { color: #E53935; }
                    .rating-option:nth-child(2) .rating-icon { color: #FB8C00; }
                    .rating-option:nth-child(3) .rating-icon { color: #FBC02D; }
                    .rating-option:nth-child(4) .rating-icon { color: #7CB342; }
                    .rating-option:nth-child(5) .rating-icon { color: #43A047; }
                    .rating-option:hover .rating-icon { filter: grayscale(0%) opacity(100%); transform: scale(1.1); }
                    .rating-option input[type="radio"]:checked + .rating-icon { filter: grayscale(0%) opacity(100%); transform: scale(1.25); filter: drop-shadow(0px 8px 10px rgba(0,0,0,0.2)); }
                    .rating-option input[type="radio"]:checked ~ .rating-label { color: #1F2937; transform: scale(1.1); }
                </style>
                <div class="kiosk-rating-group">
                    <label class="rating-option"><input type="radio" name="kiosk_score" value="1"><i class="fa-solid fa-face-angry rating-icon"></i><span class="rating-label">แย่มาก</span></label>
                    <label class="rating-option"><input type="radio" name="kiosk_score" value="2"><i class="fa-solid fa-face-frown rating-icon"></i><span class="rating-label">ปรับปรุง</span></label>
                    <label class="rating-option"><input type="radio" name="kiosk_score" value="3"><i class="fa-solid fa-face-meh rating-icon"></i><span class="rating-label">ปานกลาง</span></label>
                    <label class="rating-option"><input type="radio" name="kiosk_score" value="4"><i class="fa-solid fa-face-smile rating-icon"></i><span class="rating-label">ดีมาก</span></label>
                    <label class="rating-option"><input type="radio" name="kiosk_score" value="5"><i class="fa-solid fa-face-laugh-beam rating-icon"></i><span class="rating-label">ดีเยี่ยม</span></label>
                </div>
            `,
            showCancelButton: false,
            confirmButtonText: 'ส่งคะแนน',
            confirmButtonColor: '#10b981',
            allowOutsideClick: false,
            preConfirm: () => {
                const selectedScore = document.querySelector('input[name="kiosk_score"]:checked') as HTMLInputElement;
                if (!selectedScore) {
                    Swal.showValidationMessage('กรุณาเลือกความพึงพอใจอย่างน้อย 1 ระดับครับ');
                    return false;
                }
                return selectedScore.value;
            }
        });

        if (rating) {
            try {
                await axios.post(`${API_BASE_URL}/jhcis-api/rating`, {
                    cid: patient.cid, 
                    visitno: null, 
                    score: parseInt(rating)
                }, { headers: { 'x-api-key': API_KEY } });
            } catch (err) { }
            
            await Swal.fire({
                title: 'ขอบคุณครับ!', text: 'ระบบบันทึกคะแนนของคุณเรียบร้อยแล้ว', icon: 'success', timer: 2000, showConfirmButton: false
            });
            handleLogout();
        }
      } 
    } catch (error) { 
      setIsSubmitting(false);
      
      const savedOffline = JSON.parse(localStorage.getItem('offline_queue') || '[]');
      savedOffline.push({ ...payload, name: `${patient.fname} ${patient.lname}`, timestamp: new Date().toLocaleString('th-TH') });
      localStorage.setItem('offline_queue', JSON.stringify(savedOffline));
      setOfflineQueue(savedOffline); 

      speak('การเชื่อมต่อขัดข้อง แต่ระบบได้บันทึกข้อมูลสำรองไว้ในเครื่องแล้วค่ะ ไม่ต้องกังวลนะคะ');
      setNotifyModal({ 
        show: true, 
        isSuccess: true, 
        title: 'บันทึกออฟไลน์สำเร็จ (เน็ตขัดข้อง)', 
        message: 'ระบบเก็บข้อมูลของท่านไว้ใน Kiosk อย่างปลอดภัยแล้ว เจ้าหน้าที่จะซิงค์เข้าระบบให้ภายหลังครับ' 
      });
      
      setTimeout(() => { 
        setNotifyModal(prev => ({ ...prev, show: false })); 
      }, 4000);
    } 
  };

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<{ [key: string]: string }>({});

  const b64toBlob = (b64Data: string, contentType = 'audio/wav', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const speak = async (text: string) => {
    if (!text) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    try {
      let audioUrl = audioCacheRef.current[text];
      if (!audioUrl) {
        const response = await axios.post(`${API_BASE_URL}/jhcis-api/tts`, { text }, {
          headers: { 'x-api-key': API_KEY }
        });
        if (response.data.success && response.data.audioContent) {
          const audioBlob = b64toBlob(response.data.audioContent, 'audio/mp3');
          audioUrl = URL.createObjectURL(audioBlob);
          audioCacheRef.current[text] = audioUrl; 
        }
      }
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.15; 
        currentAudioRef.current = audio;
        audio.play().catch(e => console.log("Audio play blocked:", e));
      }
    } catch (error) {}
  };

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // ==========================================
  // 🔄 ระบบ Auto-Refresh สำหรับหน้าผลงาน อสม. (Real-time 100%)
  // ==========================================
  useEffect(() => {
    let vhvInterval: NodeJS.Timeout;
    
    if (showSettings && adminTab === 'vhv') {
      // แอบดึงข้อมูลใหม่ทุกๆ 3 วินาที
      vhvInterval = setInterval(() => {
        axios.get(`${API_BASE_URL}/jhcis-api/vhv-stats`, { headers: { 'x-api-key': API_KEY } })
          .then(res => { if(res.data.success) setVhvStatsData(res.data.data); })
          .catch(()=>{});
      }, 3000); 
    }
    
    return () => {
      if (vhvInterval) clearInterval(vhvInterval);
    };
  }, [showSettings, adminTab]);

    useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isLoggedIn) {
          speak('หมดเวลาทำรายการ ระบบได้ล้างข้อมูลของคุณเพื่อความปลอดภัยแล้วค่ะ');
          handleLogout();
        }
      }, 600000); 
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer(); 

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeoutId);
    };
  }, [isLoggedIn]);

  // ==========================================
  // 💓 ระบบส่งสัญญาณชีพจร (Heartbeat) อัปเดตสถานะ Online แบบเสถียร 100%
  // ==========================================
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    
    if (currentVhv) {
      // 1. ฟังก์ชันส่งข้อมูล (ยิงทันที)
      const sendHeartbeat = (status: string) => {
        axios.post(`${API_BASE_URL}/jhcis-api/vhv-heartbeat`, { 
          cid: currentVhv.cid, status: status, apiKey: API_KEY 
        }).catch(()=>{});
      };

      sendHeartbeat('online'); 
      
      // 2. ยิงซ้ำทุกๆ 10 วินาที เพื่อหล่อเลี้ยงสถานะ
      heartbeatInterval = setInterval(() => {
        sendHeartbeat('online');
      }, 10000); 

      // 3. 🚨 เปลี่ยนมาใช้ fetch + keepalive (การันตีส่งข้อมูลออก 100% แม้เบราว์เซอร์จะปิดไปแล้ว)
      const handleUnload = () => {
        fetch(`${API_BASE_URL}/jhcis-api/vhv-heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cid: currentVhv.cid, status: 'offline', apiKey: API_KEY }),
          keepalive: true // 👈 พระเอกอยู่ตรงนี้ครับ!
        }).catch(()=>{});
      };
      
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);

      return () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        window.removeEventListener('beforeunload', handleUnload);
        window.removeEventListener('pagehide', handleUnload);
      };
    }
  }, [currentVhv]);

  
// ==========================================
  // 🧠 สมองกลประเมินสุขภาพ (AI Health Analysis)
  // ==========================================
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


  // 👇 โค้ดเดิมของคุณสิรภพ 👇

 return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', position: 'fixed', top: 0, left: 0, margin: 0, padding: 0 }}>
      
      <header className="header-bg" style={{ position: 'relative', zIndex: 5 }}>
        <div className="header-logo">
           <img src={customLogo} alt="โลโก้หน่วยงาน" onClick={handleLogoClick} />
        </div>
        <h1 className="aurora-text">Mini Health Station</h1>
        <p style={{ marginBottom: '15px' }}>{config.hospName}</p>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '15px' }}>
          {currentVhv ? (
              <div style={{ 
                  /* 🎨 ถ้าเป็นเจ้าหน้าที่ เปลี่ยนเป็นสีม่วง-น้ำเงิน (Premium) */
                  background: isStaffLoggedIn ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : 'linear-gradient(135deg, #10b981, #059669)', 
                  color: 'white', padding: '8px 25px', borderRadius: '50px', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '15px', 
                  boxShadow: isStaffLoggedIn ? '0 4px 15px rgba(59, 130, 246, 0.4)' : '0 4px 15px rgba(16, 185, 129, 0.4)', 
                  border: isStaffLoggedIn ? '2px solid #93c5fd' : '2px solid #34d399' 
              }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    {/* 🟢 บังคับให้เป็นจุดไฟกระพริบสีเขียว Online เสมอ */}
                    <span style={{ 
                        width: '10px', height: '10px', minWidth: '10px', 
                        backgroundColor: '#6ee7b7', 
                        borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite', 
                        boxShadow: '0 0 10px rgba(110, 231, 183, 0.8)' 
                    }}></span>
                    {/* 👨‍⚕️ ถ้าเป็นเจ้าหน้าที่ เปลี่ยนไอคอนเป็นรูปคุณหมอ */}
                    <i className={isStaffLoggedIn ? "fa-solid fa-user-doctor" : "fa-solid fa-user-nurse"}></i> 
                    {isStaffLoggedIn ? 'เจ้าหน้าที่' : 'อสม'}: {currentVhv.name}
                  </span>
                  <button onClick={() => setCurrentVhv(null)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>ออก</button>
              </div>
          ) : (
              <button 
                onClick={() => { setShowVhvLoginModal(true); setVhvIdInput(''); setVhvLoginError(''); }}
                style={{ padding: '10px 30px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)'; }}
              >
                <i className="fa-solid fa-user-nurse"></i> อสม. ลงชื่อเข้าปฏิบัติงาน
              </button>
          )}
        </div>
      </header>

      {/* 🔴 โค้ดเดิม: ปุ่มกลับหน้าแรกของคนไข้ */}
      {isLoggedIn && !showSettings && !isStaffLoggedIn && (
        <button 
          onClick={handleLogout}
          style={{
            position: 'absolute', top: '25px', left: '25px', zIndex: 9999, padding: '12px 24px',
            backgroundColor: 'white', color: '#0284c7', border: 'none', borderRadius: '50px',
            fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'all 0.2s ease-in-out'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'white'; }}
        >
          <i className="fa-solid fa-chevron-left" style={{ fontSize: '16px' }}></i> กลับหน้าแรก
        </button>
      )}

      {/* 🟢 โค้ดใหม่ที่ต้องเพิ่ม: ปุ่มกลับหน้าแรก สำหรับหน้า Admin (ผู้ดูแลระบบ) */}
      {showSettings && (
        <button 
          onClick={() => setShowSettings(false)}
          style={{
            position: 'absolute', top: '25px', left: '25px', zIndex: 9999, padding: '12px 24px',
            backgroundColor: 'white', color: '#dc2626', border: 'none', borderRadius: '50px',
            fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'all 0.2s ease-in-out'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'white'; }}
        >
          <i className="fa-solid fa-right-from-bracket" style={{ fontSize: '16px' }}></i> กลับหน้าแรก
        </button>
      )}

      {showSettings ? (
        <main className="dashboard-screen" style={{ textAlign: 'left', padding: '40px', flex: 1, overflowY: 'auto', paddingBottom: '15vh' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #EEE', paddingBottom: '10px' }}>
              <button onClick={() => setAdminTab('settings')} style={{ flex: 1, padding: '10px', background: adminTab === 'settings' ? '#007AFF' : '#f1f5f9', color: adminTab === 'settings' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>⚙️ ตั้งค่าระบบ</button>
              
              <button onClick={() => setAdminTab('data')} style={{ flex: 1, padding: '10px', background: adminTab === 'data' ? '#f59e0b' : '#f1f5f9', color: adminTab === 'data' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>💾 ข้อมูลค้างส่ง</button>
              
              <button onClick={async () => {
                  setAdminTab('vhv');
                  try {
                      const res = await axios.get(`${API_BASE_URL}/jhcis-api/vhv-stats`, { headers: { 'x-api-key': API_KEY } });
                      if(res.data.success) setVhvStatsData(res.data.data);
                  } catch(e) {}
              }} style={{ flex: 1, padding: '10px', background: adminTab === 'vhv' ? '#10b981' : '#f1f5f9', color: adminTab === 'vhv' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🧑‍⚕️ ผลงาน อสม.</button>
              
              <button onClick={async () => {
                  setAdminTab('analytics');
                  try {
                      const res = await axios.get(`${API_BASE_URL}/jhcis-api/analytics`, { headers: { 'x-api-key': API_KEY } });
                      if(res.data && res.data.success) setAnalyticsData(res.data.data);
                  } catch(e) { console.error('ดึงข้อมูลสถิติไม่สำเร็จ'); }
              }} style={{ flex: 1, padding: '10px', background: adminTab === 'analytics' ? '#8b5cf6' : '#f1f5f9', color: adminTab === 'analytics' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>📈 สถิติงานวิจัย</button>
            
            <button onClick={() => {
                  setAdminTab('bp');
                  fetchBPData(bpDate);
              }} style={{ flex: 1, padding: '10px', background: adminTab === 'bp' ? '#dc2626' : '#f1f5f9', color: adminTab === 'bp' ? 'white' : '#64748b', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                  <i className="fa-solid fa-heart-pulse"></i> เฝ้าระวังความดัน
              </button>
            </div>

            

            {adminTab === 'settings' && (
              <div>
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
              </div>
            )}

            {adminTab === 'data' && (
              <div>
                <h3 style={{ color: '#10b981', marginTop: '0' }}>คิวค้างส่ง ({Array.isArray(offlineQueue) ? offlineQueue.length : 0} รายการ)</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {Array.isArray(offlineQueue) && offlineQueue.length > 0 ? (
                    offlineQueue?.map((q: any, idx: number) => (
                      <div key={idx} style={{ background: 'white', padding: '12px', marginBottom: '10px', borderRadius: '6px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <strong>{q?.name || 'ไม่ระบุชื่อ'}</strong> <span style={{ color: '#64748b' }}>(CID: {q?.cid || '-'})</span><br/>
                        <div style={{ color: '#475569', fontSize: '14px', marginTop: '5px' }}>ความดัน: <span style={{ fontWeight: 'bold' }}>{q?.sysDia || '-'}</span> | น้ำหนัก: <span style={{ fontWeight: 'bold' }}>{q?.weight || '-'}</span></div>
                        <small style={{ color: '#94a3b8', display: 'block', marginTop: '5px' }}>บันทึกเวลา: {q?.timestamp || '-'}</small>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '20px 0' }}>ไม่มีข้อมูล</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', justifyContent: 'space-between' }}>
                  <button onClick={() => { if(window.confirm('ยืนยันลบข้อมูลทั้งหมด?')) { localStorage.setItem('offline_queue', '[]'); setOfflineQueue([]); } }} style={{ padding: '12px 20px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>ลบทิ้งทั้งหมด</button>
                  <button onClick={() => alert("ระบบซิงค์จะทยอยส่งข้อมูลอัตโนมัติเมื่อเซิร์ฟเวอร์ออนไลน์ครับ")} style={{ padding: '12px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🔄 ซิงค์ขึ้น JHCIS</button>
                </div>
              </div>
            )}

            {adminTab === 'vhv' && (
              <div style={{ animation: 'fadeIn 0.5s' }}>
                <h2 style={{ color: '#10b981', margin: '0 0 20px 0', borderBottom: '2px solid #d1fae5', paddingBottom: '10px' }}>
                  <i className="fa-solid fa-medal"></i> ประสิทธิภาพการทำงาน อสม.
                </h2>
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '800px' }}>
                    <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '14px' }}>
                      <tr>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>ชื่อ-สกุล อสม.</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>ตรวจสอบ</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>ผู้ป่วย (คน)</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>น้ำหนัก</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>ส่วนสูง</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>ความดันฯ</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>ชีพจร</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>อุณหภูมิ</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>รอบเอว</th>
                        <th style={{ padding: '15px', borderBottom: '2px solid #e2e8f0' }}>น้ำตาล (DTX)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vhvStatsData.length > 0 ? vhvStatsData.map((vhv: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                          {/* 👇 โค้ดใหม่ที่แก้เงื่อนไขให้รองรับทั้งตัวเลข 1 และ String '1' 👇 */}
                          <td style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#334155', position: 'sticky', left: 0, background: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               {vhv.vhv_name}
                               {/* 🟢 ไอคอนสถานะ Online (ใช้ Number() เพื่อความชัวร์) */}
                               {Number(vhv.is_online) === 1 && (
                                  <span style={{ fontSize: '11px', color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                                    Online
                                  </span>
                               )}
                            </div>
                          </td>

                          <td style={{ padding: '15px' }}>
                             <button 
  onClick={() => {
    const targetCid = vhv.vhv_cid;
    if (!targetCid) {
      alert(`⚠️ [System Audit] หาค่า 'vhv_cid' ไม่เจอ!\n\nข้อมูลที่ได้รับมาคือ:\n${JSON.stringify(vhv, null, 2)}`);
      return; 
    }
    fetchVhvDetails(targetCid, vhv.vhv_name);
  }} 
  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(59,130,246,0.3)', transition: '0.2s' }} 
  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} 
  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
>
  <i className="fa-solid fa-magnifying-glass"></i> ตรวจสอบ
</button>
                          </td>
                          <td style={{ padding: '15px', color: '#3b82f6', fontSize: '18px', fontWeight: 'bold' }}>{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: vhv.weight_recorded < vhv.total_patients ? '#ef4444' : '#10b981', fontWeight: '500' }}>{vhv.weight_recorded}/{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: vhv.height_recorded < vhv.total_patients ? '#ef4444' : '#10b981', fontWeight: '500' }}>{vhv.height_recorded}/{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: vhv.bp_recorded < vhv.total_patients ? '#ef4444' : '#10b981', fontWeight: '500' }}>{vhv.bp_recorded}/{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: vhv.pulse_recorded < vhv.total_patients ? '#ef4444' : '#10b981', fontWeight: '500' }}>{vhv.pulse_recorded}/{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: vhv.temp_recorded < vhv.total_patients ? '#ef4444' : '#10b981', fontWeight: '500' }}>{vhv.temp_recorded}/{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: vhv.waist_recorded < vhv.total_patients ? '#ef4444' : '#10b981', fontWeight: '500' }}>{vhv.waist_recorded}/{vhv.total_patients}</td>
                          <td style={{ padding: '15px', color: '#8b5cf6', fontWeight: 'bold' }}>{vhv.sugar_recorded}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={10} style={{ padding: '30px', color: '#94a3b8' }}>ยังไม่มีข้อมูลการปฏิบัติงานของ อสม.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminTab === 'analytics' && (() => {
              if (!analyticsData) {
                return <div style={{ textAlign: 'center', padding: '40px', color: '#8b5cf6' }}><p>กำลังโหลด...</p></div>;
              }

              

              const ageChartData = [
                { name: '0-15 ปี', value: analyticsData?.ageGroups?.gen1 || 0, fill: '#fde047' },
                { name: '16-35 ปี', value: analyticsData?.ageGroups?.gen2 || 0, fill: '#93c5fd' },
                { name: '36-60 ปี', value: analyticsData?.ageGroups?.gen3 || 0, fill: '#f9a8d4' },
                { name: '60 ปีขึ้นไป', value: analyticsData?.ageGroups?.gen4 || 0, fill: '#fdba74' }
              ];

              return (
                <div style={{ animation: 'fadeIn 0.5s' }}>
                  <h2 style={{ color: '#8b5cf6', margin: '0 0 20px 0', borderBottom: '2px solid #ede9fe', paddingBottom: '10px' }}>
                    <i className="fa-solid fa-chart-pie"></i> Dashboard สถิติ
                  </h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '15px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                          <div style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>ยอดค้นหาประวัติ</div>
                          <div style={{ color: '#1d4ed8', fontSize: '36px', fontWeight: 'bold' }}>{analyticsData?.usage?.total || 0}</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '15px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                          <div style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>เพศชาย</div>
                          <div style={{ color: '#15803d', fontSize: '36px', fontWeight: 'bold' }}>{analyticsData?.usage?.male || 0}</div>
                      </div>
                      <div style={{ background: '#fdf2f8', padding: '20px', borderRadius: '15px', textAlign: 'center', border: '1px solid #fbcfe8' }}>
                          <div style={{ color: '#ec4899', fontSize: '14px', fontWeight: 'bold' }}>เพศหญิง</div>
                          <div style={{ color: '#be185d', fontSize: '36px', fontWeight: 'bold' }}>{analyticsData?.usage?.female || 0}</div>
                      </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '25px' }}>
                      <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fde68a' }}>
                          <div style={{ color: '#d97706', fontSize: '12px', fontWeight: 'bold' }}>0-15 ปี</div>
                          <div style={{ color: '#b45309', fontSize: '26px', fontWeight: 'bold' }}>{analyticsData?.ageGroups?.gen1 || 0}</div>
                      </div>
                      <div style={{ background: '#e0e7ff', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #c7d2fe' }}>
                          <div style={{ color: '#4f46e5', fontSize: '12px', fontWeight: 'bold' }}>16-35 ปี</div>
                          <div style={{ color: '#3730a3', fontSize: '26px', fontWeight: 'bold' }}>{analyticsData?.ageGroups?.gen2 || 0}</div>
                      </div>
                      <div style={{ background: '#fae8ff', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #f5d0fe' }}>
                          <div style={{ color: '#c026d3', fontSize: '12px', fontWeight: 'bold' }}>36-60 ปี</div>
                          <div style={{ color: '#86198f', fontSize: '26px', fontWeight: 'bold' }}>{analyticsData?.ageGroups?.gen3 || 0}</div>
                      </div>
                      <div style={{ background: '#ffedd5', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                          <div style={{ color: '#ea580c', fontSize: '12px', fontWeight: 'bold' }}>60 ปีขึ้นไป</div>
                          <div style={{ color: '#9a3412', fontSize: '26px', fontWeight: 'bold' }}>{analyticsData?.ageGroups?.gen4 || 0}</div>
                      </div>
                  </div>

                  <div style={{ background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '18px', textAlign: 'center' }}>กราฟแสดงสัดส่วนช่วงอายุผู้ใช้บริการ</h3>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
                          <BarChart width={550} height={280} data={ageChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" tick={{fill: '#64748b', fontWeight: 'bold'}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val: any) => [`${val} คน`, 'จำนวน']} contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={55}>
                                  {ageChartData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                      <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '18px', textAlign: 'center' }}>กราฟแสดงความพึงพอใจ</h3>
                          <p style={{ textAlign: 'center', color: '#64748b', marginTop: 0, marginBottom: '20px' }}>คะแนนเฉลี่ย {analyticsData?.satisfaction?.average || 0} จาก 5 ดาว</p>
                          
                          <div style={{ width: '100%', height: '250px', display: 'flex', justifyContent: 'center' }}>
                              {analyticsData?.satisfaction?.chartData?.filter((d:any) => d.value > 0).length > 0 ? (
                                  <PieChart width={300} height={250}>
                                      <Pie 
                                          data={analyticsData.satisfaction.chartData.filter((d:any) => d.value > 0)} 
                                          cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value"
                                      >
                                          {analyticsData.satisfaction.chartData.filter((d:any) => d.value > 0).map((entry:any, index:number) => (
                                              <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                      </Pie>
                                      <Tooltip formatter={(value: any) => [`${value} โหวต`, 'จำนวน']} />
                                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                                  </PieChart>
                              ) : (
                                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>ยังไม่มีข้อมูลการประเมิน</div>
                              )}
                          </div>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', flex: 1 }}>
                              <h3 style={{ margin: '0 0 15px 0', color: '#4c1d95', fontSize: '16px', display: 'flex', alignItems: 'center', gap:'8px' }}>
                                  <i className="fa-solid fa-robot"></i> AI สรุปผลสำหรับงานวิจัย
                              </h3>
                              <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8', margin: 0, textIndent: '25px', textAlign: 'justify' }}>
                                  {analyticsData?.summary || 'ยังไม่มีข้อมูลเพียงพอสำหรับสรุปผล'}
                              </p>
                              
                              {analyticsData?.usage?.total > 0 && (
                                  <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.8', margin: '15px 0 0 0', textAlign: 'justify' }}>
                                      <strong>📊 เจาะลึกสัดส่วนช่วงอายุผู้ใช้งาน:</strong><br/>
                                      พบกลุ่มผู้ใช้ช่วงวัย 0-15 ปี คิดเป็น <strong>{((analyticsData.ageGroups.gen1 / analyticsData.usage.total) * 100).toFixed(1)}%</strong>, 
                                      วััย 16-35 ปี <strong>{((analyticsData.ageGroups.gen2 / analyticsData.usage.total) * 100).toFixed(1)}%</strong>, 
                                      วัย 36-60 ปี <strong>{((analyticsData.ageGroups.gen3 / analyticsData.usage.total) * 100).toFixed(1)}%</strong>, 
                                      และกลุ่มผู้สูงอายุ 60 ปีขึ้นไป <strong>{((analyticsData.ageGroups.gen4 / analyticsData.usage.total) * 100).toFixed(1)}%</strong> ของจำนวนผู้ใช้งานทั้งหมด
                                  </p>
                              )}
                          </div>
                          <button onClick={() => {
                              const total = analyticsData?.usage?.total || 0;
                              const ageSummary = total > 0 
                                  ? ` เจาะลึกสัดส่วนช่วงอายุผู้ใช้งาน: 0-15 ปี (${((analyticsData.ageGroups.gen1 / total) * 100).toFixed(1)}%), 16-35 ปี (${((analyticsData.ageGroups.gen2 / total) * 100).toFixed(1)}%), 36-60 ปี (${((analyticsData.ageGroups.gen3 / total) * 100).toFixed(1)}%), และผู้สูงอายุ 60 ปีขึ้นไป (${((analyticsData.ageGroups.gen4 / total) * 100).toFixed(1)}%) ของผู้ใช้งานทั้งหมด` 
                                  : '';
                              navigator.clipboard.writeText((analyticsData?.summary || '') + ageSummary);
                              alert('คัดลอกข้อความสรุปผลวิจัย พร้อมรายละเอียดสัดส่วนช่วงอายุเรียบร้อยแล้ว!');
                          }} style={{ marginTop: '15px', padding: '12px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
                             onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c7d2fe'}
                             onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
                          >
                              <i className="fa-regular fa-copy"></i> คัดลอกข้อความไปใส่ Word
                          </button>
                      </div>
                  </div>
                </div>
              );
            })()}

            {/* 👇👇 วางโค้ดแท็บความดันตรงนี้ (ต่อท้ายแท็บสถิติ) 👇👇 */}
            {/* ========================================== */}
            {/* 🩸 กระดานเฝ้าระวังความดันโลหิตสูง (BP Monitor) */}
            {/* ========================================== */}
            {adminTab === 'bp' && (
              <div style={{ animation: 'fadeIn 0.5s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #fee2e2', paddingBottom: '10px' }}>
                    <h2 style={{ color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
  <i className="fa-solid fa-heart-pulse fa-beat"></i> เฝ้าระวังความดันโลหิตสูง (&gt;=140/90)
</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', color: '#64748b' }}>เลือกวันที่:</span>
                      <input 
                        type="date" 
                        value={bpDate} 
                        onChange={(e) => {
                          setBpDate(e.target.value);
                          fetchBPData(e.target.value);
                        }}
                        style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', color: '#334155', fontWeight: 'bold', outline: 'none' }}
                      />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bpData.length > 0 ? bpData.map((item, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => {
                          setSelectedBpRecord(item);
                          
                          // ถอดรหัสสถานะ Refer ออกจากข้อความ
                          let rawNote = item.follow_up_note || '';
                          let textNote = '';

                          if (rawNote.startsWith('[REFER] ')) {
                              setReferStatus('refer');
                              textNote = rawNote.replace('[REFER] ', '');
                          } else if (rawNote.startsWith('[NOREFER] ')) {
                              setReferStatus('norefer');
                              textNote = rawNote.replace('[NOREFER] ', '');
                          } else {
                              setReferStatus('');
                              textNote = rawNote;
                          }
                          
                          // 🚨 บังคับใส่ข้อความจริงลงไปในกล่อง หากยังไม่เคยมีการบันทึกมาก่อน
                          setFollowUpNote(textNote ? textNote : 'ติดตามอาการที่ รพ.สต.ทับพริก ');
                          
                          setShowFollowUpModal(true);
                        }}
                        style={{ 
                            display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', 
                            background: 'white', borderRadius: '12px', border: `1px solid ${item.follow_up_note ? '#10b981' : '#e2e8f0'}`, 
                            boxShadow: item.follow_up_note ? '0 4px 6px rgba(16,185,129,0.1)' : '0 4px 6px rgba(0,0,0,0.05)', 
                            transition: 'transform 0.2s', overflow: 'hidden', cursor: 'pointer' /* 👈 สั่งให้เมาส์เปลี่ยนเป็นรูปมือ */
                        }} 
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} 
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                     >
                         {/* 🔹 ส่วนซ้าย: ข้อมูลคนไข้และ อสม. (พื้นหลังขาว) */}
                         <div style={{ padding: '15px 25px', flex: 1, minWidth: 0 }}>
                            
                            {/* แถวที่ 1: ชื่อคนไข้ + ป้ายติดตามแล้ว */}
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <i className="fa-regular fa-user" style={{ color: item.colorHex, marginRight: '8px' }}></i>
                                  {item.patient_name}
                                </div>
                                {/* 👈 ย้ายป้ายติดตามแล้ว มาไว้ข้างชื่อคนไข้ */}
                                {item.follow_up_note && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <i className="fa-solid fa-circle-check"></i> ติดตามแล้ว
                                    </span>
                                    
                                    {/* 🚨 เพิ่มป้าย Refer หรือ No Refer ตามข้อมูลที่ซ่อนไว้ */}
                                    {item.follow_up_note.startsWith('[REFER]') && (
                                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', background: '#fee2e2', padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-truck-medical fa-beat"></i> Refer
                                      </span>
                                    )}
                                    {item.follow_up_note.startsWith('[NOREFER]') && (
                                      <span style={{ color: '#0ea5e9', fontSize: '13px', fontWeight: 'bold', background: '#e0f2fe', padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-house-medical-circle-check"></i> No Refer
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>

                            {/* แถวที่ 2: เวลา + ชื่อ อสม. */}
                            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <span style={{ whiteSpace: 'nowrap' }}><i className="fa-regular fa-clock"></i> เวลา {item.record_time} น.</span>
                                <span style={{ whiteSpace: 'nowrap' }}><i className="fa-solid fa-user-nurse"></i> โดย อสม: {item.vhv_name}</span>
                            </div>

                         </div>
                         
                         <div style={{ textAlign: 'center', background: `${item.colorHex}15`, padding: '15px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '160px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: item.colorHex, letterSpacing: '1px', lineHeight: '1.2' }}>{item.sys_dia}</div>
                            <div style={{ fontSize: '14px', color: item.colorHex, fontWeight: 'bold', marginTop: '2px' }}>{item.levelName}</div>
                         </div>
                     </div>
                  )) : (
                     <div style={{ textAlign: 'center', padding: '50px', background: '#f8fafc', borderRadius: '15px', border: '2px dashed #cbd5e1' }}>
                        <i className="fa-solid fa-heart-circle-check" style={{ fontSize: '50px', color: '#10b981', marginBottom: '15px' }}></i>
                        <h3 style={{ color: '#475569', margin: 0 }}>ไม่มีผู้ป่วยที่ความดันโลหิตเกินเกณฑ์ในวันที่เลือกครับ</h3>
                     </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </main>

            
            
          
      ) : !isLoggedIn ? (
        <main className="home-screen" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 }}>
          <video key={customVideo} autoPlay loop playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4 }}><source src={customVideo} type="video/mp4" /></video>
          
          <div onClick={handleManualRead} style={{ display: 'flex', justifyContent: 'center', margin: '2vh 0', cursor: 'pointer', position: 'relative', zIndex: 1 }}>
            <img src="/nick.png" alt="กรุณาสอดบัตรประชาชน" style={{ maxWidth: '90%', maxHeight: '40vh', objectFit: 'contain', transition: 'transform 0.2s', filter: 'drop-shadow(0 15px 20px rgba(0,0,0,0.2))' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
          </div>
          
          <div className="instruction-text" style={{ position: 'relative', zIndex: 1, textShadow: '0 2px 4px rgba(255,255,255,0.9)' }}>
            {loading ? 'กำลังดึงข้อมูลและรูปถ่าย...' : 'กรุณาสอดบัตรประชาชน เพื่อเข้ารับบริการ'}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', position: 'relative', zIndex: 1, marginTop: '2vh', width: '100%' }}>
            
            <button 
              onClick={() => { 
                // 🚨 3. ดักจับการค้นหาคีย์มือ ถ้ายังไม่ล็อกอิน อสม. ให้เด้งเตือน
                if (!currentVhv) {
                    Swal.fire({
                        title: 'แจ้งเตือน',
                        text: 'กรุณาลงชื่อเข้าปฏิบัติงาน อสม. ก่อนเริ่มให้บริการคนไข้ค่ะ',
                        icon: 'warning',
                        confirmButtonText: '<i class="fa-solid fa-user-nurse"></i> ลงชื่อ อสม.',
                        confirmButtonColor: '#8b5cf6',
                        showCancelButton: true,
                        cancelButtonText: 'ปิด'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            setShowVhvLoginModal(true);
                            setVhvIdInput('');
                            setVhvLoginError('');
                        }
                    });
                    return;
                }
                
                // ถ้าล็อกอินแล้ว ให้เปิดหน้าต่างค้นหาบัตรปกติ
                setShowManualIdModal(true); 
                setManualIdInput(''); 
                setManualIdError(''); 
              }}
              style={{ 
                padding: '12px 35px', 
                background: '#4bc0c8', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                boxShadow: '0 4px 10px rgba(75, 192, 200, 0.4)', 
                fontSize: '16px', 
                letterSpacing: '0.5px',
                transition: 'transform 0.2s, background 0.2s' 
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#3ba2aa'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#4bc0c8'; }}
            >
              ไม่มีบัตรประชาชนแตะที่ปุ่มนี้
            </button>

            {isStaffLoggedIn && (
              <button
                onClick={() => setIsLoggedIn(true)}
                style={{
                  padding: '12px 35px',
                  background: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.35)',
                  fontSize: '16px',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <i className="fa-solid fa-table-columns" style={{ marginRight: '8px' }}></i>
                JHCIS NHSO Digital Platform
              </button>
            )}

          </div>
        </main>
      ) : isStaffLoggedIn ? (
        <StaffClinicalWorkspace
          apiBaseUrl={API_BASE_URL}
          apiKey={API_KEY}
          hospName={config.hospName}
          currentVhv={currentVhv}
          patient={patient}
          patientImage={patientImage}
          isUploadingPhoto={isUploadingPhoto}
          onCapturePhoto={handleCapturePhoto}
          activeVisitNo={activeVisitNo}
          onSelectQueuePatient={handleSelectQueuePatient}
          queueRefreshTrigger={queueRefreshTrigger}
          customSymptoms={customSymptoms}
          setCustomSymptoms={setCustomSymptoms}
          customSymptomsco={customSymptomsco}
          setCustomSymptomsco={setCustomSymptomsco}
          diagNote={diagNote}
          setDiagNote={setDiagNote}
          vitals={vitals}
          handleVitalChange={handleVitalChange}
          childDev={childDev}
          setChildDev={setChildDev}
          sugarFasting={sugarFasting}
          setSugarFasting={setSugarFasting}
          smokeStatus={smokeStatus}
          setSmokeStatus={setSmokeStatus}
          smokeAmount={smokeAmount}
          setSmokeAmount={setSmokeAmount}
          smokeWake={smokeWake}
          setSmokeWake={setSmokeWake}
          smokeAdvice={smokeAdvice}
          setSmokeAdvice={setSmokeAdvice}
          alcoholStatus={alcoholStatus}
          setAlcoholStatus={setAlcoholStatus}
          alcoholAdvice={alcoholAdvice}
          setAlcoholAdvice={setAlcoholAdvice}
          icd10List={icd10List}
          setIcd10List={setIcd10List}
          icdSearch={icdSearch}
          icdResults={icdResults}
          handleSearchIcd10={handleSearchIcd10}
          handleAddIcd10={handleAddIcd10}
          timeService={timeService}
          setTimeService={setTimeService}
          foodAllergy={foodAllergy}
          setFoodAllergy={setFoodAllergy}
          drugAllergies={drugAllergies}
          drugCategory={drugCategory}
          setDrugCategory={setDrugCategory}
          drugSearch={drugSearch}
          drugResults={drugResults}
          handleSearchDrug={handleSearchDrug}
          handleAddDrug={handleAddDrug}
          drugList={drugList}
          setDrugList={setDrugList}
          handleReMed={handleReMed}
          onOpenPresetModal={(target) => { setPresetSearch(''); setNewPresetInput(''); setPresetModalTarget(target); }}
          onOpenManualId={() => { setShowManualIdModal(true); setManualIdInput(''); setManualIdError(''); }}
          onManualCardRead={handleManualRead}
          onOpenGuide={openGuideModal}
          onOpenBluetooth={() => setShowBluetoothModal(true)}
          onOpenTelemed={() => setShowTelemedModal(true)}
          onSaveQueue={sendToJHCISQueue}
          onLogoutToHome={handleLogout}
          aiLoading={aiLoading}
          aiResponse={aiResponse}
          healthAnalysis={healthAnalysis}
        />
      ) : (
        <main className="dashboard-screen" style={{ flex: 1, overflowY: 'auto', paddingBottom: '15vh' }}>
          
          <div className="patient-header-card">
            <h2>ยินดีต้อนรับ คุณ{patient?.fname || 'สิรภพ'} {patient?.lname || 'แก้วทิพย์'}</h2>
            <div className="realtime-clock">{formatThaiDateTime(currentTime)}</div>
            <p className="instruction-subtext">กรุณาเลือกรายการที่ท่านต้องการตรวจวัด</p>
          </div>
          
          <div className="photo-container">
            <div style={{ position: 'relative', display: 'inline-block' }}>
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

              <label 
                style={{
                  position: 'absolute', bottom: '-10px', right: '-15px', width: '45px', height: '45px',
                  backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25)', border: '3px solid white', transition: 'transform 0.2s ease, background-color 0.2s ease', zIndex: 15
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = '#2563eb'; }}
                title="ถ่ายรูปใหม่"
              >
                {isUploadingPhoto ? (
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '18px' }}></i>
                ) : (
                  <i className="fa-solid fa-camera" style={{ fontSize: '18px' }}></i>
                )}
                
                <input 
                  type="file" accept="image/*" capture="user" style={{ display: 'none' }} 
                  onChange={handleCapturePhoto} disabled={isUploadingPhoto}
                />
              </label>
            </div>
          </div>


          

          <div className="device-buttons">
            <button className="btn-device" onClick={() => openGuideModal('o2')} style={{ border: '2px solid #3b82f6' }}>
              อ๊อกซิเจนในเลือด <i className="fa-regular fa-hand-point-up" style={{ color: 'rgb(255, 212, 59)', marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={() => openGuideModal('weight')} style={{ border: '2px solid #3b82f6' }}>
              ชั่งน้ำหนัก <i className="fa-solid fa-weight-scale" style={{ color: 'rgb(99, 230, 190)', marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={() => openGuideModal('temp')} style={{ border: '2px solid #3b82f6' }}>
              วัดอุณหภูมิ <i className="fa-solid fa-temperature-low" style={{ color: 'rgb(248, 126, 0)',marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={() => openGuideModal('bp')} style={{ border: '2px solid #3b82f6' }}>
              วัดความดันฯ <i className="fa-solid fa-gauge-high" style={{ color: 'rgb(116, 192, 252)', marginLeft: '8px' }}></i>
            </button>
            <button className="btn-device" onClick={() => openGuideModal('sugar')} style={{ border: '2px solid #3b82f6' }}>
              น้ำตาลในเลือด <i className="fa-solid fa-droplet" style={{ color: 'rgb(244, 30, 30)', marginLeft: '8px' }}></i>
            </button>
          </div>

          {/* 👶 / 🧑 โซนแสดงผล Dynamic (แยกระหว่างเด็ก 0-60 เดือน และ ผู้ใหญ่) */}
          {patient?.age_months !== undefined && patient?.age_months <= 60 ? (
            
            /* ================= 👶 โหมดเด็ก (0-60 เดือน) ================= */
            <div className="vitals-container" style={{ marginTop: '20px' }}>
              <div style={{ background: '#fef3c7', padding: '25px', borderRadius: '20px', border: '2px dashed #f59e0b', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', maxWidth: '900px', margin: '0 auto' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#d97706', textAlign: 'center', fontSize: '22px' }}>
                  <i className="fa-solid fa-baby"></i> ข้อมูลโภชนาการเด็ก (อายุ {patient.age_months} เดือน)
                </h3>
                
                {/* 3 ช่องกรอกหลัก: น้ำหนัก, ส่วนสูง, เส้นรอบศีรษะ */}
                <div className="vitals-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  {[
                    { id: 'weight', label: 'น้ำหนัก', unit: 'กิโลกรัม', val: vitals.weight },
                    { id: 'height', label: 'ส่วนสูง', unit: 'เซนติเมตร', val: vitals.height },
                    { id: 'headCircum', label: 'เส้นรอบศีรษะ', unit: 'เซนติเมตร', val: vitals.headCircum }
                  ].map((item, idx) => (
                    <div className="vital-cell" key={idx} style={{ background: 'white', border: '1px solid #fcd34d' }}>
                      <div className="vital-label" style={{ color: '#b45309' }}>{item.label}<br/><small>{item.unit}</small></div>
                      <div className="vital-value-box" style={{ padding: 0, display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text" value={item.val === '---' ? '' : item.val} 
                          onChange={(e) => handleVitalChange(item.id, e.target.value)}
                          onBlur={(e) => { if (e.target.value.trim() === '') handleVitalChange(item.id, '---'); }}
                          placeholder="---"
                          style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', textAlign: 'center', fontSize: '26px', fontWeight: 'bold', color: '#78350f', outline: 'none' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* กล่องแสดงข้อความที่จะส่งเข้า JHCIS */}
                <div style={{ padding: '15px', background: 'white', borderRadius: '12px', border: '1px dashed #f59e0b', fontSize: '14px', color: '#b45309', textAlign: 'left' }}>
                  <strong style={{ fontSize: '15px' }}>ข้อมูลที่จะบันทึกเข้า JHCIS:</strong><br/>
                  <div style={{ marginTop: '8px', paddingLeft: '10px', borderLeft: '3px solid #fcd34d', lineHeight: '1.6' }}>
                    <strong>อาการสำคัญ:</strong> ตรวจภาวะโภชนาการเด็ก 0-60 เดือน<br/>
                    <strong>อาการร่วม:</strong> ตรวจกระตุ้นพัฒนาการ อายุ {patient.age_months} เดือน สมวัย
                  </div>
                </div>

              </div>
            </div>

            
            

          ) : (

            /* ================= 🧑 โหมดผู้ใหญ่ (> 60 เดือน) ================= */
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', maxWidth: '900px', margin: '20px auto' }}>
              
              {isStaffLoggedIn ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', textAlign: 'left' }}>
                  
                  {/* ช่องที่ 1: อาการสำคัญ (symptoms) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>
                        <i className="fa-solid fa-file-medical"></i> อาการสำคัญ (CC) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => { setPresetSearch(''); setNewPresetInput(''); setPresetModalTarget('symptoms'); }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className="fa-solid fa-list-ul"></i> ข้อความสำเร็จรูป
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={255}
                      value={customSymptoms}
                      onChange={(e) => setCustomSymptoms(e.target.value)}
                      placeholder="พิมพ์เอง หรือกดปุ่ม 'ข้อความสำเร็จรูป' ด้านบนเพื่อเลือก..."
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid #818cf8',
                        backgroundColor: '#f8fafc',
                        fontSize: '16px',
                        color: '#1e293b',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
                      }}
                    />
                  </div>

                  {/* ช่องที่ 2: อาการร่วม / ประวัติเจ็บป่วย (symptomsco) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
                        <i className="fa-solid fa-notes-medical"></i> อาการร่วม (PI)
                      </label>
                      <button
                        type="button"
                        onClick={() => { setPresetSearch(''); setNewPresetInput(''); setPresetModalTarget('symptomsco'); }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#0284c7',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className="fa-solid fa-list-ul"></i> ข้อความสำเร็จรูป
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={255}
                      value={customSymptomsco}
                      onChange={(e) => setCustomSymptomsco(e.target.value)}
                      placeholder="พิมพ์เอง หรือกดปุ่ม 'ข้อความสำเร็จรูป' ด้านบนเพื่อเลือก..."
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid #38bdf8',
                        backgroundColor: '#f8fafc',
                        fontSize: '16px',
                        color: '#1e293b',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
                      }}
                    />
                  </div>

                </div>
              ) : (
                <>
                  {/* ปุ่มเลือกเดิมสำหรับ อสม. */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                    <button 
                      type="button" 
                      onClick={() => setServiceType('health_station')} 
                      style={{ 
                        padding: '25px 20px', borderRadius: '15px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s',
                        border: serviceType === 'health_station' ? '2px solid #0ea5e9' : '1px solid #cbd5e1', 
                        backgroundColor: serviceType === 'health_station' ? '#f0f9ff' : 'white', 
                        color: serviceType === 'health_station' ? '#0ea5e9' : '#64748b', 
                        boxShadow: serviceType === 'health_station' ? '0 4px 15px rgba(14, 165, 233, 0.15)' : 'none' 
                      }}
                    >
                      <i className="fa-solid fa-house-chimney-medical" style={{ fontSize: '32px' }}></i>
                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Health Station</span>
                      <small style={{ fontSize: '14px', opacity: 0.8 }}>ผู้ป่วย NCD กลุ่มสีเขียว</small>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setServiceType('screening')} 
                      style={{ 
                        padding: '25px 20px', borderRadius: '15px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s',
                        border: serviceType === 'screening' ? '2px solid #6366f1' : '1px solid #cbd5e1', 
                        backgroundColor: serviceType === 'screening' ? '#eef2ff' : 'white', 
                        color: serviceType === 'screening' ? '#4f46e5' : '#64748b', 
                        boxShadow: serviceType === 'screening' ? '0 4px 15px rgba(99, 102, 241, 0.15)' : 'none' 
                      }}
                    >
                      <i className="fa-solid fa-magnifying-glass-chart" style={{ fontSize: '32px' }}></i>
                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>คัดกรอง</span>
                      <small style={{ fontSize: '14px', opacity: 0.8 }}>เบาหวาน-ความดัน 35 ปีขึ้นไป</small>
                    </button>
                  </div>

                  {/* ข้อความ JHCIS เดิมสำหรับ อสม. */}
                  <div style={{ padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', color: '#475569', textAlign: 'center', marginBottom: '25px' }}>
                    <strong>ข้อความที่จะบันทึกเข้า JHCIS:</strong> {serviceType === 'screening' ? 'คัดกรอง เบาหวาน-ความดันโลหิตสูง อายุ 35 ปี ขึ้นไป' : 'ผู้ป่วย NCD กลุ่มสีเขียว รับบริการที่ health station ประจำหมู่บ้าน โดย อสม.'}
                  </div>
                </>
              )}

              {/* 2. โซนกรอกค่าวัดสัญญาณชีพ (ขอบมนสวยงาม) */}
              <div className="vitals-grid" style={{ marginBottom: '25px' }}>
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
                  <div className="vital-cell" key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div className="vital-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {item.label}
                      <small>{item.unit}</small>
                      {/* 👈 เปลี่ยนตัวหนังสือให้กลายเป็นปุ่มกดแก้ไขได้ */}
                      {item.id === 'sugar' && sugarFasting && (
                         <div 
                           onClick={() => handleSugarClick()}
                           style={{ 
                             fontSize: '12px', 
                             color: 'white', 
                             background: '#ef4444', 
                             padding: '2px 10px', 
                             borderRadius: '12px', 
                             marginTop: '4px', 
                             cursor: 'pointer', 
                             boxShadow: '0 2px 4px rgba(239,68,68,0.3)',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '5px'
                           }}
                           title="คลิกเพื่อแก้ไขสถานะ"
                         >
                           {sugarFasting} <i className="fa-solid fa-pen-to-square"></i>
                         </div>
                      )}
                    </div>
                    <div className="vital-value-box" style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        type="text" value={item.val === '---' ? '' : item.val} 
                        onChange={(e) => handleVitalChange(item.id, e.target.value)}
                        onBlur={(e) => { if (e.target.value.trim() === '') handleVitalChange(item.id, '---'); }}
                        onClick={(e) => {
                          // 🚨 ดักคลิก: ถ้าเป็นช่องน้ำตาลและยังไม่ระบุสถานะ ให้เด้ง Popup ทันที
                          if (item.id === 'sugar' && !sugarFasting) {
                            e.currentTarget.blur(); // เอาเคอร์เซอร์ออกกันคีย์บอร์ดบัง
                            handleSugarClick(e.currentTarget);
                          }
                        }}
                        placeholder="---"
                        style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', textAlign: 'center', fontSize: '26px', fontWeight: 'bold', color: '#1f2937', outline: 'none' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. โซนประวัติบุหรี่/สุรา (ดีไซน์แยกกล่องขาว เรียงต่อท้าย) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* กรอบบุหรี่ */}
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '18px' }}>
                    <i className="fa-solid fa-smoking" style={{ color: '#64748b' }}></i> ประวัติสูบบุหรี่
                  </div>
                  <select value={smokeStatus} onChange={(e) => setSmokeStatus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', cursor: 'pointer', textAlign: 'center' }}>
                    <option value="">-- กรุณาเลือก --</option>
                    <option value="ไม่สูบ">ไม่สูบ</option>
                    <option value="เคยสูบแต่เลิกแล้ว">เคยสูบแต่เลิกแล้ว</option>
                    <option value="ยังสูบอยู่">ยังสูบอยู่</option>
                  </select>
                  {smokeStatus === 'ยังสูบอยู่' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>1. ปริมาณที่สูบ (มวน/วัน):</div>
                      <select value={smokeAmount} onChange={(e) => setSmokeAmount(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', cursor: 'pointer' }}>
                        <option value="1B509">-- ไม่ระบุปริมาณ --</option><option value="1B501">1-10 มวนต่อวัน</option><option value="1B502">11-19 มวนต่อวัน</option><option value="1B503">20 มวนขึ้นไปต่อวัน</option>
                      </select>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>2. พฤติกรรมสูบหลังตื่นนอน:</div>
                      <select value={smokeWake} onChange={(e) => setSmokeWake(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', cursor: 'pointer' }}>
                        <option value="">-- ไม่ระบุ --</option><option value="1B504">สูบมวนแรก น้อยกว่า 30 นาที</option><option value="1B505">สูบมวนแรก 30 นาที - 1 ชั่วโมง</option><option value="1B506">สูบมวนแรก 1 ชั่วโมงขึ้นไป</option>
                      </select>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>3. การให้คำปรึกษา:</div>
                      <select value={smokeAdvice} onChange={(e) => setSmokeAdvice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', cursor: 'pointer' }}>
                        <option value="">-- ไม่ระบุ --</option><option value="1B530">ให้คำแนะนำสั้นๆ</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* กรอบสุรา */}
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '18px' }}>
                    <i className="fa-solid fa-wine-glass" style={{ color: '#64748b' }}></i> ประวัติดื่มสุรา
                  </div>
                  <select value={alcoholStatus} onChange={(e) => setAlcoholStatus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', cursor: 'pointer', textAlign: 'center' }}>
                    <option value="">-- กรุณาเลือก --</option><option value="ไม่ดื่ม">ไม่ดื่ม</option><option value="เคยดื่มแต่เลิกแล้ว">เคยดื่มแต่เลิกแล้ว</option><option value="ยังดื่มอยู่">ยังดื่มอยู่</option>
                  </select>
                  {alcoholStatus === 'ยังดื่มอยู่' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>การให้คำแนะนำ/ปรึกษา:</div>
                      <select value={alcoholAdvice} onChange={(e) => setAlcoholAdvice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', cursor: 'pointer' }}>
                        <option value="">-- ไม่ระบุ --</option><option value="1B611">การให้คำปรึกษาแบบสั้นๆ</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>

              {/* ================= 🩺 โซนวินิจฉัย (ICD-10) และ ยา-เวชภัณฑ์-บริการ-หัตถการ (เฉพาะเจ้าหน้าที่) ================= */}
              {isStaffLoggedIn && (
                <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>

                  {/* 1. โซนคำวินิจฉัย + ตาราง ICD-10 */}
                  <div style={{ padding: '20px', borderRadius: '14px', border: '2px solid #c7d2fe', backgroundColor: '#fafbff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'start' }}>
                      
                      {/* กล่องคำวินิจฉัย */}
                      <div>
                        <label style={{ fontWeight: 'bold', color: '#4338ca', fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                          <i className="fa-solid fa-stethoscope"></i> คำวินิจฉัย
                        </label>
                        <textarea
                          rows={5}
                          maxLength={255}
                          value={diagNote}
                          onChange={(e) => setDiagNote(e.target.value)}
                          placeholder="บันทึกคำวินิจฉัยเพิ่มเติม..."
                          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #a5b4fc', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                        />
                      </div>

                      {/* ค้นหาและตาราง ICD-10 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                          <label style={{ fontWeight: 'bold', color: '#4338ca', fontSize: '16px', margin: 0 }}>
                            <i className="fa-solid fa-virus"></i> รหัสโรค (ICD-10)
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleSearchIcd10('J00')}
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #fda4af', background: '#fff1f2', color: '#e11d48', cursor: 'pointer' }}
                            >
                              Hot-diag
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSearchIcd10('I10')}
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#7c3aed', cursor: 'pointer' }}
                            >
                              506 / NCD
                            </button>
                          </div>
                        </div>

                        {/* ช่องค้นหา ICD-10 */}
                        <div style={{ position: 'relative', marginBottom: '10px' }}>
                          <input
                            type="text"
                            value={icdSearch}
                            onChange={(e) => handleSearchIcd10(e.target.value)}
                            placeholder="🔍 พิมพ์รหัส ICD-10 หรือชื่อโรคเพื่อเพิ่ม เช่น I10, E11, J00, ปวดหลัง..."
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #818cf8', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                          />
                          {icdResults.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', maxHeight: '220px', overflowY: 'auto', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                              {icdResults.map((r, i) => (
                                <div
                                  key={i}
                                  onClick={() => handleAddIcd10(r)}
                                  style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '14px' }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#eef2ff'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  <strong style={{ color: '#4f46e5', marginRight: '8px' }}>{r.diseasecode}</strong>
                                  <span>{r.diseasenamethai || r.diseasename}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ตารางรายการ ICD-10 */}
                        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ background: '#e0e7ff', color: '#3730a3' }}>
                              <tr>
                                <th style={{ padding: '8px', textAlign: 'left' }}>ICD10</th>
                                <th style={{ padding: '8px' }}>ลำดับสำคัญ</th>
                                <th style={{ padding: '8px' }}>ต่อเนื่อง?</th>
                                <th style={{ padding: '8px' }}>วันนัด</th>
                                <th style={{ padding: '8px' }}>ลบ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {icd10List.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>ยังไม่ได้เลือกรหัสโรค ICD-10</td></tr>
                              ) : icd10List.map((row, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '8px', textAlign: 'left' }}>
                                    <strong style={{ color: '#4f46e5' }}>{row.diagcode}</strong>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>{row.diseasename}</div>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <select
                                      value={row.dxtype}
                                      onChange={(e) => setIcd10List(prev => prev.map((x, i) => i === idx ? { ...x, dxtype: e.target.value } : x))}
                                      style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                    >
                                      <option value="01">01 โรคหลัก</option>
                                      <option value="02">02 โรคร่วม</option>
                                      <option value="04">04 โรคแทรก</option>
                                      <option value="05">05 อื่นๆ</option>
                                    </select>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={row.conti === '1'}
                                      onChange={(e) => setIcd10List(prev => prev.map((x, i) => i === idx ? { ...x, conti: e.target.checked ? '1' : '0' } : x))}
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <input
                                      type="date"
                                      value={row.appointDate}
                                      onChange={(e) => setIcd10List(prev => prev.map((x, i) => i === idx ? { ...x, appointDate: e.target.value } : x))}
                                      style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => setIcd10List(prev => prev.filter((_, i) => i !== idx))}
                                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 2. โซน ยา-เวชภัณฑ์-บริการ-หัตถการ-ทันตกรรม ฯลฯ */}
                  <div style={{ padding: '20px', borderRadius: '14px', border: '2px solid #bae6fd', backgroundColor: '#f8fcff' }}>
                    <div style={{ fontWeight: 'bold', color: '#0369a1', fontSize: '17px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <span><i className="fa-solid fa-pills"></i> ยา-เวชภัณฑ์-บริการ-หัตถการ-ทันตกรรม ฯลฯ</span>
                      <span style={{ fontSize: '15px', color: '#059669', background: '#d1fae5', padding: '4px 12px', borderRadius: '20px' }}>
                        รวมเงินทั้งหมด: {drugList.reduce((sum, d) => sum + (d.unit * d.realprice), 0).toFixed(2)} บาท
                      </span>
                    </div>

                    {/* แถบปุ่มเครื่องมือด้านบน */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={handleReMed}
                        style={{ padding: '7px 14px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      >
                        <i className="fa-solid fa-rotate-left"></i> Re Med.
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const msg = drugAllergies.length > 0
                            ? drugAllergies.map(a => a.drugname).join(', ')
                            : 'ไม่พบประวัติแพ้ยาในระบบ (กด Re Med. เพื่อโหลดข้อมูลจาก JHCIS)';
                          Swal.fire('ประวัติแพ้ยา', msg, drugAllergies.length > 0 ? 'warning' : 'info');
                        }}
                        style={{ padding: '7px 12px', background: drugAllergies.length > 0 ? '#ef4444' : '#fee2e2', color: drugAllergies.length > 0 ? 'white' : '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      >
                        แพ้ยาฯ {drugAllergies.length > 0 ? `(${drugAllergies.length})` : ''}
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 'bold' }}>แพ้อาหาร:</span>
                        <input
                          type="text"
                          value={foodAllergy}
                          onChange={(e) => setFoodAllergy(e.target.value)}
                          placeholder="ระบุ (ถ้ามี)"
                          style={{ width: '110px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>

                      {/* ปุ่มสลับหมวดค้นหา */}
                      {[
                        { id: 'all', label: 'ทั้งหมด' },
                        { id: 'herb', label: 'โรค/ยาสมุนไพร' },
                        { id: 'service', label: 'บริการ & หัตถการ' },
                        { id: 'adp', label: 'เบิก ADP' },
                        { id: 'dental', label: 'ทันตฯ' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => { setDrugCategory(tab.id as any); handleSearchDrug(drugSearch, tab.id as any); }}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            border: drugCategory === tab.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            background: drugCategory === tab.id ? '#e0f2fe' : 'white',
                            color: drugCategory === tab.id ? '#0369a1' : '#334155'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}

                      {/* ปุ่ม ในเวลา / นอกเวลา */}
                      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', marginLeft: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => setTimeService('1')}
                          style={{ padding: '6px 12px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: timeService === '1' ? '#ef4444' : 'white', color: timeService === '1' ? 'white' : '#64748b' }}
                        >
                          ในเวลา
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeService('2')}
                          style={{ padding: '6px 12px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: timeService === '2' ? '#f97316' : 'white', color: timeService === '2' ? 'white' : '#64748b' }}
                        >
                          นอกเวลา
                        </button>
                      </div>
                    </div>

                    {/* ช่องค้นหายา/หัตถการ */}
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={drugSearch}
                        onChange={(e) => handleSearchDrug(e.target.value)}
                        placeholder="🔍 ค้นหาชื่อยา / ยาสมุนไพร / หัตถการ / รหัสยา เพื่อเพิ่มลงตาราง..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #38bdf8', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                      />
                      {drugResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', maxHeight: '240px', overflowY: 'auto', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                          {drugResults.map((d, i) => (
                            <div
                              key={i}
                              onClick={() => handleAddDrug(d)}
                              style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#f0f9ff'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                            >
                              <span><strong style={{ color: '#0284c7', marginRight: '8px' }}>{d.drugcode}</strong>{d.drugname}</span>
                              <span style={{ color: '#059669', fontWeight: 'bold' }}>{Number(d.realprice).toFixed(2)} บ./{d.unitsell || 'หน่วย'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ตารางรายการยาและหัตถการ */}
                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '720px' }}>
                        <thead style={{ background: '#e2e8f0', color: '#1e293b' }}>
                          <tr>
                            <th style={{ padding: '9px', textAlign: 'left' }}>ชื่อยาฯ / บริการ</th>
                            <th style={{ padding: '9px', width: '70px' }}>จำนวน</th>
                            <th style={{ padding: '9px', width: '80px' }}>ขาย/หน่วย</th>
                            <th style={{ padding: '9px', width: '80px' }}>รวมเงิน</th>
                            <th style={{ padding: '9px', textAlign: 'left' }}>วิธีใช้ยา</th>
                            <th style={{ padding: '9px', color: '#dc2626' }}>ผู้บันทึก</th>
                            <th style={{ padding: '9px', width: '75px' }}>ราคาทุน</th>
                            <th style={{ padding: '9px', width: '45px' }}>ลบ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drugList.length === 0 ? (
                            <tr><td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีรายการยาหรือหัตถการ (พิมพ์ค้นหาด้านบน หรือกด Re Med.)</td></tr>
                          ) : drugList.map((drug, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#1e293b' }}>
                                {drug.drugname}
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{drug.drugcode}</div>
                              </td>
                              <td style={{ padding: '6px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min={1}
                                  value={drug.unit}
                                  onChange={(e) => setDrugList(prev => prev.map((x, i) => i === idx ? { ...x, unit: Math.max(1, Number(e.target.value) || 1) } : x))}
                                  style={{ width: '58px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                              </td>
                              <td style={{ padding: '6px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  value={drug.realprice}
                                  onChange={(e) => setDrugList(prev => prev.map((x, i) => i === idx ? { ...x, realprice: Number(e.target.value) || 0 } : x))}
                                  style={{ width: '68px', padding: '5px', textAlign: 'right', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                                {(drug.unit * drug.realprice).toFixed(2)}
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="text"
                                  value={drug.dose}
                                  onChange={(e) => setDrugList(prev => prev.map((x, i) => i === idx ? { ...x, dose: e.target.value } : x))}
                                  placeholder="เช่น 1 เม็ด หลังอาหาร เช้า-เย็น"
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                                {drug.recorder}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                {drug.costprice.toFixed(2)}
                              </td>
                              <td style={{ padding: '6px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setDrugList(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

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

              {(vitals.sysDia !== '---' || vitals.weight !== '---' || vitals.sugar !== '---') && (
                <div className="assessment-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                  {aiLoading ? (
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: 'rgb(116, 192, 252)', marginTop: '2px' }}></i>
                  ) : (
                    <i className="fa-solid fa-user-doctor" style={{ fontSize: '32px', color: 'rgb(116, 192, 252)', marginTop: '2px' }}></i>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#475569', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ✨ AI พยาบาลประเมินว่า:
                    </h4>
                    {aiLoading ? (
                      <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontStyle: 'italic', animation: 'pulse 1.5s infinite' }}>
                        กำลังวิเคราะห์ข้อมูลสุขภาพอย่างละเอียด...
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: '1.5', fontWeight: 'bold' }}>
                        {aiResponse || "กรุณาวัดค่าต่างๆ เพื่อให้ AI ประเมินผล"}
                      </p>
                    )}
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
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-server" style={{ fontSize: '24px' }}></i> บันทึกข้อมูลและจัดคิวลง JHCIS
              </button>

              <button 
                onClick={() => setShowTelemedModal(true)}
                style={{ width: '100%', padding: '15px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(2, 132, 199, 0.3)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-video" style={{ fontSize: '24px' }}></i> ปรึกษาแพทย์ออนไลน์ (Telemedicine)
              </button>

              <button 
                onClick={() => { setShowManualIdModal(true); setManualIdInput(''); setManualIdError(''); }}
                style={{ width: '100%', padding: '15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(100, 116, 139, 0.3)', marginTop: '10px' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-user-plus" style={{ fontSize: '24px' }}></i> ค้นหาผู้ป่วยรายใหม่
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 🟢 Footer แบบทะลุคลิกได้ */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: '15vh', backgroundImage: "url('/footer.png')", backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10, pointerEvents: 'none' }}></div>

      {/* 🟢 โซนปุ่มไอคอนมุมซ้ายล่าง (God-Tier Security: ซ่อนปุ่มตั้งค่า เหลือแค่ Bluetooth) */}
      <div className="bottom-icons" style={{ position: 'fixed', bottom: '20px', left: '25px', display: 'flex', gap: '20px', zIndex: 100 }}>
        <div onClick={() => setShowBluetoothModal(true)} title="จัดการ Bluetooth" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(116, 192, 252)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>
        </div>
      </div>

      {/* ======================= โซนหน้าต่าง Modal ทั้งหมด ======================= */}
      {/* 🦸‍♂️ Modal: ตรวจสอบข้อมูลรายบุคคลของ อสม. (ย้ายมาตรงนี้เพื่อแก้บั๊กหน้าจอซ้อน) */}
      {showVhvDetailsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '95%', maxWidth: '1000px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-list-check" style={{ color: '#3b82f6' }}></i> ข้อมูลบันทึกผู้ป่วยโดย: <span style={{ color: '#10b981' }}>{selectedVhvName}</span>
              </h3>
              <button onClick={() => setShowVhvDetailsModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', fontSize: '16px' }} onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <tr>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>เวลาบันทึก</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>ชื่อผู้ป่วย</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>น้ำหนัก</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>ส่วนสูง</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>ความดันฯ</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>ชีพจร</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>อุณหภูมิ</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>รอบเอว</th>
                    <th style={{ padding: '12px', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>น้ำตาล</th>
                  </tr>
                </thead>
                <tbody>
                  {vhvPatientLogs.length > 0 ? vhvPatientLogs.map((log: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                      <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>{log.record_time}</td>
                      <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#334155' }}>
                        {/* 🚀 เรียกใช้ Component พระเอกของเราตรงนี้ครับ แทนที่โค้ดเดิม */}
                        <PatientNameResolver cid={log.patient_cid} defaultName={log.patient_name} />
                      </td>
                      <td style={{ padding: '12px', color: log.weight > 0 ? '#10b981' : '#cbd5e1' }}>{log.weight > 0 ? log.weight : '-'}</td>
                      <td style={{ padding: '12px', color: log.height > 0 ? '#10b981' : '#cbd5e1' }}>{log.height > 0 ? log.height : '-'}</td>
                      <td style={{ padding: '12px', color: (log.sys_dia && log.sys_dia !== '---') ? '#10b981' : '#cbd5e1', fontWeight: 'bold' }}>{(log.sys_dia && log.sys_dia !== '---') ? log.sys_dia : '-'}</td>
                      <td style={{ padding: '12px', color: log.pulse > 0 ? '#10b981' : '#cbd5e1' }}>{log.pulse > 0 ? log.pulse : '-'}</td>
                      <td style={{ padding: '12px', color: log.temp > 0 ? '#10b981' : '#cbd5e1' }}>
                        {/* 🚀 ปัดเศษทศนิยมจากฝั่งหน้าเว็บไปเลย จบปัญหาโค้ดเซิร์ฟเวอร์เก่าดื้อ */}
                        {log.temp > 0 ? Number(log.temp).toFixed(1) : '-'}
                      </td>
                      <td style={{ padding: '12px', color: log.waist > 0 ? '#10b981' : '#cbd5e1' }}>{log.waist > 0 ? log.waist : '-'}</td>
                      <td style={{ padding: '12px', color: log.sugar > 0 ? '#8b5cf6' : '#cbd5e1', fontWeight: 'bold' }}>{log.sugar > 0 ? log.sugar : '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} style={{ padding: '40px', color: '#94a3b8' }}>ยังไม่มีประวัติการบันทึกข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setShowVhvDetailsModal(false)} style={{ padding: '12px 30px', background: '#334155', color: 'white', borderRadius: '50px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                ปิดหน้าต่าง
              </button>
            </div>
            
          </div>
        </div>
      )}

      {showManualIdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 2000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '35px', color: '#3B82F6' }}></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#1F2937' }}>ค้นหาประวัติผู้ป่วย</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#6B7280' }}>กรุณากรอกเลขประจำตัวประชาชน 13 หลัก</p>
            <input 
              type="tel" maxLength={13} autoFocus value={manualIdInput} 
              onChange={(e) => { setManualIdInput(e.target.value.replace(/[^0-9]/g, '')); setManualIdError(''); }} 
              onKeyDown={(e) => { if (e.key === 'Enter') processManualId(); }} 
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: manualIdError ? '2px solid #EF4444' : '2px solid #D1D5DB', fontSize: '24px', textAlign: 'center', letterSpacing: '2px', boxSizing: 'border-box', outline: 'none', marginBottom: '8px', color: '#1F2937', fontWeight: 'bold' }} 
              placeholder="●●●●●●●●●●●●●"
            />
            <div style={{ minHeight: '24px', color: '#EF4444', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>{manualIdError}</div>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button onClick={() => setShowManualIdModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => processManualId()} disabled={loading} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#3B82F6', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'กำลังค้นหา...' : 'ยืนยัน'}</button>
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
            <p style={{ margin: '0 0 25px 0', fontSize: '16px', color: '#4B5563', lineHeight: '1.5' }}>ต้องการบันทึกข้อมูลและส่งเข้าระบบ<br/><strong>JHCIS</strong> ใช่หรือไม่?</p>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button onClick={() => setShowConfirmQueueModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={confirmSendToJHCISQueue} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}>ตกลง</button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 99999, backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '50px', marginBottom: '20px', color: '#3b82f6' }}></i>
          <h2 style={{ letterSpacing: '1px' }}>กำลังส่งข้อมูลเข้า JHCIS...</h2>
        </div>
      )}

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

      {showFollowUpModal && selectedBpRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 5000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: selectedBpRecord.colorHex, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-notes-medical"></i> ติดตามอาการ (Follow-up)
              </h3>
              <button onClick={() => setShowFollowUpModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>คุณ{selectedBpRecord.patient_name}</div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>ความดันโลหิต: <strong style={{ color: selectedBpRecord.colorHex }}>{selectedBpRecord.sys_dia}</strong> ({selectedBpRecord.levelName})</div>
              <div style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>เวลาวัด: {selectedBpRecord.record_time} น. | อสม: {selectedBpRecord.vhv_name}</div>
            </div>

            <label style={{ fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '10px' }}>บันทึกผลการติดตาม / การจัดการ:</label>
            {/* 👇 เปลี่ยนข้อความ placeholder เป็น ติดตามอาการที่ รพ.สต.ทับพริก */}
            <textarea 
              autoFocus
              rows={4}
              placeholder="ติดตามอาการที่ รพ.สต.ทับพริก"
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '16px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            ></textarea>

            <div style={{ display: 'flex', gap: '15px', width: '100%', marginTop: '15px' }}>
              <button 
                onClick={() => setReferStatus('refer')} 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: referStatus === 'refer' ? '2px solid #ef4444' : '1px solid #cbd5e1', backgroundColor: referStatus === 'refer' ? '#fee2e2' : 'white', color: referStatus === 'refer' ? '#ef4444' : '#64748b', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-truck-medical"></i> ส่งต่อ (Refer)
              </button>
              <button 
                onClick={() => setReferStatus('norefer')} 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: referStatus === 'norefer' ? '2px solid #10b981' : '1px solid #cbd5e1', backgroundColor: referStatus === 'norefer' ? '#d1fae5' : 'white', color: referStatus === 'norefer' ? '#10b981' : '#64748b', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-house-medical-circle-check"></i> ไม่ส่งต่อ (No Refer)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '15px', width: '100%', marginTop: '20px' }}>
              <button onClick={() => setShowFollowUpModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button 
                onClick={async () => {
                  try {
                    // 🚨 แนบสถานะ Refer ไปพร้อมกับข้อความ
                    let finalNote = followUpNote;
                    if (referStatus === 'refer') finalNote = '[REFER] ' + followUpNote;
                    else if (referStatus === 'norefer') finalNote = '[NOREFER] ' + followUpNote;

                    await axios.post(`${API_BASE_URL}/jhcis-api/bp-followup`, { log_id: selectedBpRecord.log_id, note: finalNote }, { headers: { 'x-api-key': API_KEY } });
                    setShowFollowUpModal(false);
                    fetchBPData(bpDate);
                    Swal.fire({ title: 'บันทึกสำเร็จ!', text: 'อัปเดตข้อมูลการติดตามอาการเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
                  } catch (e) {
                    alert('บันทึกไม่สำเร็จ กรุณาลองใหม่');
                  }
                }}
                style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}
              >
                <i className="fa-solid fa-save"></i> บันทึกข้อมูล
              </button>
            </div>

          </div>
        </div>
      )}

      {showVhvLoginModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 2000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-user-nurse" style={{ fontSize: '35px', color: '#22c55e' }}></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#1F2937' }}>อสม. เข้าปฏิบัติงาน</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#6B7280' }}>กรุณากรอกเลขบัตรประชาชน อสม. 13 หลัก</p>
            <input 
              type="tel" maxLength={13} autoFocus value={vhvIdInput} 
              onChange={(e) => { setVhvIdInput(e.target.value.replace(/[^0-9]/g, '')); setVhvLoginError(''); }} 
              onKeyDown={(e) => { if (e.key === 'Enter') processVhvLogin(); }} 
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: vhvLoginError ? '2px solid #EF4444' : '2px solid #22c55e', fontSize: '24px', textAlign: 'center', letterSpacing: '2px', boxSizing: 'border-box', outline: 'none', marginBottom: '8px', color: '#1F2937', fontWeight: 'bold' }} 
              placeholder="เลขบัตร อสม."
            />
            <div style={{ minHeight: '24px', color: '#EF4444', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>{vhvLoginError}</div>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button onClick={() => setShowVhvLoginModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={processVhvLogin} disabled={loading} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {showBluetoothModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 3000, backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px', textAlign: 'center', color: 'white' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>อุปกรณ์ที่เชื่อมต่อ Mini Health Station</h2>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>{config.hospName}</p>
            </div>
            <div style={{ padding: '20px', maxHeight: '50vh', overflowY: 'auto', background: '#f8fafc' }}>
              {[
                { key: 'weight', image: '/scale.jpg', label: 'เครื่องชั่งน้ำหนัก (SCALE)', dev: devices.weight, action: connectBluetoothWeight },
                { key: 'temp', image: '/temp.png', label: 'เครื่องวัดอุณหภูมิ (Thermometer)', dev: devices.temp, action: connectBluetoothTemp },
                { key: 'bp', image: '/bp.jpg', label: 'เครื่องวัดความดัน (BP Monitor)', dev: devices.bp, action: connectBluetoothBP },
                { key: 'sugar', image: '/sugar.png', label: 'เครื่องวัดน้ำตาล (Glucose)', dev: devices.sugar, action: connectBluetoothSugar },
                { key: 'o2', image: '/o2.png', label: 'เครื่องวัดออกซิเจน (Oximeter)', dev: devices.o2, action: connectBluetoothO2 }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ marginRight: '15px', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <img src={item.image} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: item.dev ? '#10b981' : '#94a3b8', marginTop: '3px' }}>
                      {item.dev ? `Device Name :: ${item.dev}` : 'ยังไม่ได้จับคู่อุปกรณ์'}
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: '10px' }}>
                    <input 
                      type="checkbox" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      checked={item.dev !== ''} 
                      onChange={(e) => { if (e.target.checked) item.action(); else updateDeviceName(item.key, ''); }}
                    />
                    <div style={{ width: '52px', height: '30px', backgroundColor: item.dev !== '' ? '#3b82f6' : '#cbd5e1', borderRadius: '32px', transition: 'background-color 0.3s ease', position: 'relative', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div style={{ position: 'absolute', top: '3px', left: item.dev !== '' ? '25px' : '3px', width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div style={{ padding: '15px 20px', background: '#f1f5f9', display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setShowBluetoothModal(false)} style={{ background: '#64748b', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                &lt;&lt; ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      )}

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

      {guideModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 4000, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '25px', padding: '35px', width: '90%', maxWidth: '550px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button onClick={() => { 
              if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
              setGuideModal({ ...guideModal, show: false }); 
            }} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 style={{ color: '#1e40af', fontSize: '26px', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <i className="fa-solid fa-person-chalkboard"></i> {guideModal.title}
            </h2>
            <div style={{ width: '100%', height: '280px', backgroundColor: '#f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', overflow: 'hidden', border: '2px dashed #cbd5e1' }}>
              <img 
                src={guideModal.gifUrl} alt="คำแนะนำ" style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'block'; }}
              />
              <div style={{ display: 'none', color: '#64748b', fontSize: '16px' }}>
                <i className="fa-regular fa-image" style={{ fontSize: '40px', marginBottom: '10px', display: 'block' }}></i>
                รอเตรียมภาพเคลื่อนไหว (GIF)
              </div>
            </div>
            <p style={{ fontSize: '20px', color: '#334155', lineHeight: '1.6', marginBottom: '25px', fontWeight: 'bold' }}>{guideModal.desc}</p>
            <button 
              onClick={handleStartDeviceConnection} 
              style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '15px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(37, 99, 235, 0.3)' }}
            >
              <i className="fa-brands fa-bluetooth-b" style={{ animation: 'pulse 1.5s infinite' }}></i> พร้อมแล้ว! เริ่มเชื่อมต่ออุปกรณ์
            </button>
          </div>
        </div>
      )}
{/* 📋 Modal: เลือกและเพิ่มข้อความสำเร็จรูป (ใช้ร่วมกันทั้งช่อง อาการสำคัญ และ อาการร่วม) */}
      {presetModalTarget && (() => {
        const isCC = presetModalTarget === 'symptoms';
        const themeColor = isCC ? '#4f46e5' : '#0284c7';
        const lightBg = isCC ? '#eef2ff' : '#f0f9ff';
        const borderColor = isCC ? '#c7d2fe' : '#bae6fd';
        const currentValue = isCC ? customSymptoms : customSymptomsco;
        const setCurrentValue = isCC ? setCustomSymptoms : setCustomSymptomsco;
        const activeList = isCC ? symptomsPresets : symptomscoPresets;

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 5500, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '25px', width: '94%', maxWidth: '820px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              
              {/* หัวข้อ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: themeColor, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className={isCC ? 'fa-solid fa-file-medical' : 'fa-solid fa-clipboard-list'}></i>
                  {isCC ? 'ข้อความสำเร็จรูป (อาการสำคัญ - CC)' : 'ข้อความสำเร็จรูป (อาการร่วม - PI)'}
                </h3>
                <button
                  type="button"
                  onClick={() => setPresetModalTarget(null)}
                  style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* พรีวิวข้อความที่เลือกไว้ */}
              <div style={{ marginBottom: '14px', background: lightBg, padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: themeColor }}>ข้อความที่เลือกไว้ (แตะหลายรายการเพื่อต่อข้อความได้):</span>
                  {currentValue && (
                    <button
                      type="button"
                      onClick={() => setCurrentValue('')}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ล้างข้อความ
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  maxLength={255}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="ยังไม่ได้เลือกข้อความ..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${themeColor}`, fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', resize: 'none' }}
                />
              </div>

              {/* ช่องเพิ่มข้อความสำเร็จรูปใหม่ด้วยตัวเอง */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={newPresetInput}
                  onChange={(e) => setNewPresetInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPreset(); } }}
                  placeholder="➕ พิมพ์ข้อความสำเร็จรูปใหม่ที่ต้องการเก็บไว้ใช้ประจำ..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '2px solid #a7f3d0', fontSize: '15px', outline: 'none', background: '#f0fdf4' }}
                />
                <button
                  type="button"
                  onClick={handleAddPreset}
                  style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <i className="fa-solid fa-plus"></i> เพิ่มใหม่
                </button>
              </div>

              {/* ช่องค้นหารายการ */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="ค้นหาข้อความสำเร็จรูป เช่น คัดกรอง, วัคซีน, เยี่ยมบ้าน, DSPM, แผนไทย..."
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* รายการข้อความสำเร็จรูปทั้งหมด */}
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeList
                  .filter(item => item.toLowerCase().includes(presetSearch.trim().toLowerCase()))
                  .map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: 'white',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(item)}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          fontSize: '15px',
                          color: '#1e293b',
                          cursor: 'pointer',
                          padding: '2px 0',
                          fontFamily: 'inherit'
                        }}
                      >
                        <i className="fa-solid fa-circle-plus" style={{ color: themeColor, marginRight: '8px' }}></i>
                        {item}
                      </button>
                      <button
                        type="button"
                        title="ลบข้อความนี้"
                        onClick={() => {
                          if (window.confirm(`ต้องการลบข้อความ "${item}" ออกจากรายการหรือไม่?`)) {
                            handleDeletePreset(item);
                          }
                        }}
                        style={{
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: 'none',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
              </div>

              {/* ปุ่มด้านล่าง */}
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPresetModalTarget(null)}
                  style={{ padding: '12px 35px', background: themeColor, color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.18)' }}
                >
                  <i className="fa-solid fa-check"></i> เสร็จสิ้น
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>  
  );
}

export default App;