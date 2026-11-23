import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import './StaffClinicalWorkspace.css';

interface StaffWorkspaceProps {
  apiBaseUrl: string;
  apiKey: string;
  hospName: string;
  currentVhv: { cid: string; name: string } | null;
  patient: any;
  patientImage: string | null;
  isUploadingPhoto: boolean;
  onCapturePhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeVisitNo: number | null;
  onSelectQueuePatient: (queueRow: any) => Promise<void>;
  queueRefreshTrigger: number;

  // Clinical & Vitals state
  customSymptoms: string;
  setCustomSymptoms: React.Dispatch<React.SetStateAction<string>>;
  customSymptomsco: string;
  setCustomSymptomsco: React.Dispatch<React.SetStateAction<string>>;
  diagNote: string;
  setDiagNote: React.Dispatch<React.SetStateAction<string>>;
  vitals: any;
  handleVitalChange: (field: string, value: string) => void;
  childDev: any;
  setChildDev: React.Dispatch<React.SetStateAction<any>>;

  // Sugar & SpecialPP
  sugarFasting: string;
  setSugarFasting: React.Dispatch<React.SetStateAction<string>>;
  smokeStatus: string;
  setSmokeStatus: React.Dispatch<React.SetStateAction<string>>;
  smokeAmount: string;
  setSmokeAmount: React.Dispatch<React.SetStateAction<string>>;
  smokeWake: string;
  setSmokeWake: React.Dispatch<React.SetStateAction<string>>;
  smokeAdvice: string;
  setSmokeAdvice: React.Dispatch<React.SetStateAction<string>>;
  alcoholStatus: string;
  setAlcoholStatus: React.Dispatch<React.SetStateAction<string>>;
  alcoholAdvice: string;
  setAlcoholAdvice: React.Dispatch<React.SetStateAction<string>>;

  // ICD-10 & Drugs
  icd10List: { diagcode: string; diseasename: string; dxtype: string; conti: string; appointDate: string }[];
  setIcd10List: React.Dispatch<React.SetStateAction<any[]>>;
  icdSearch: string;
  icdResults: any[];
  handleSearchIcd10: (keyword: string) => Promise<void>;
  handleAddIcd10: (row: any) => void;

  timeService: '1' | '2';
  setTimeService: React.Dispatch<React.SetStateAction<'1' | '2'>>;
  foodAllergy: string;
  setFoodAllergy: React.Dispatch<React.SetStateAction<string>>;
  drugAllergies: any[];
  drugCategory: 'all' | 'herb' | 'service' | 'dental' | 'adp';
  setDrugCategory: React.Dispatch<React.SetStateAction<'all' | 'herb' | 'service' | 'dental' | 'adp'>>;
  drugSearch: string;
  drugResults: any[];
  handleSearchDrug: (keyword: string, cat?: 'all' | 'herb' | 'service' | 'dental' | 'adp') => Promise<void>;
  handleAddDrug: (row: any) => void;
  drugList: { drugcode: string; drugname: string; unit: number; realprice: number; costprice: number; dose: string; recorder: string }[];
  setDrugList: React.Dispatch<React.SetStateAction<any[]>>;
  handleReMed: () => Promise<void>;

  // Modals & Actions from App.tsx
  onOpenPresetModal: (target: 'symptoms' | 'symptomsco') => void;
  onOpenManualId: () => void;
  onManualCardRead: () => void;
  onOpenGuide: (type: string) => void;
  onOpenBluetooth: () => void;
  onOpenTelemed: () => void;
  onSaveQueue: () => void;
  onLogoutToHome: () => void;

  // AI & Health Analysis
  aiLoading: boolean;
  aiResponse: string;
  healthAnalysis: { alerts: any[]; isEmergency: boolean };
}

export const StaffClinicalWorkspace: React.FC<StaffWorkspaceProps> = (props) => {
  const {
    apiBaseUrl, apiKey, hospName, currentVhv, patient, patientImage, isUploadingPhoto,
    onCapturePhoto, activeVisitNo, onSelectQueuePatient, queueRefreshTrigger,
    customSymptoms, setCustomSymptoms, customSymptomsco, setCustomSymptomsco,
    diagNote, setDiagNote, vitals, handleVitalChange, childDev,
    sugarFasting, setSugarFasting, smokeStatus, setSmokeStatus,
    smokeAmount, setSmokeAmount, smokeWake, setSmokeWake, smokeAdvice, setSmokeAdvice,
    alcoholStatus, setAlcoholStatus, alcoholAdvice, setAlcoholAdvice,
    icd10List, setIcd10List, icdSearch, icdResults, handleSearchIcd10, handleAddIcd10,
    timeService, setTimeService, foodAllergy, setFoodAllergy, drugAllergies,
    drugCategory, setDrugCategory, drugSearch, drugResults, handleSearchDrug, handleAddDrug,
    drugList, setDrugList, handleReMed,
    onOpenPresetModal, onOpenManualId, onManualCardRead, onOpenGuide,
    onOpenBluetooth, onOpenTelemed, onSaveQueue, onLogoutToHome,
    aiLoading, aiResponse, healthAnalysis
  } = props;

  // Layout & Navigation state
  const [sidebarOpenDesktop, setSidebarOpenDesktop] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [activeView, setActiveView] = useState<'visit' | 'history' | 'screening'>('visit');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [clockText, setClockText] = useState('');

  // Today's JHCIS Queue state
  const [queueFilter, setQueueFilter] = useState<'waiting' | 'done'>('waiting');
  const [queueSearch, setQueueSearch] = useState('');
  const [todayQueue, setTodayQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Patient History state (Tab "ประวัติ")
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // iPadOS Page Sheets
  const [activeSheet, setActiveSheet] = useState<null | 'addIcd' | 'addDrug' | 'ncd' | 'allergy' | 'editDose'>(null);
  const [editingDrugIdx, setEditingDrugIdx] = useState<number | null>(null);
  const [tempDoseText, setTempDoseText] = useState('');

  // Live Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClockText(
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map(n => String(n).padStart(2, '0'))
          .join(':')
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch Today's Queue from JHCIS
  const fetchTodayQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/jhcis-api/today-queue`, {
        headers: { 'x-api-key': apiKey },
        timeout: 6000
      });
      if (res.data.success) {
        setTodayQueue(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch today-queue error:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchTodayQueue();
    const interval = setInterval(fetchTodayQueue, 15000);
    return () => clearInterval(interval);
  }, [queueRefreshTrigger]);

  // Fetch Patient History when switching to "ประวัติ" tab or changing patient
  useEffect(() => {
    if (activeView === 'history' && patient?.cid) {
      setLoadingHistory(true);
      axios
        .get(`${apiBaseUrl}/jhcis-api/patient-history/${patient.cid}`, {
          headers: { 'x-api-key': apiKey }
        })
        .then(res => {
          if (res.data.success) setPatientHistory(res.data.data || []);
        })
        .catch(() => setPatientHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeView, patient?.cid]);

  // Derived metrics
  const isChild = patient?.age_months !== undefined && patient?.age_months !== null && Number(patient.age_months) <= 60;

  const formatAge = () => {
    if (patient?.age_months === undefined || patient?.age_months === null) return '-';
    const total = Number(patient.age_months);
    const y = Math.floor(total / 12);
    const m = total % 12;
    return y > 0 ? `${y} ปี ${m} เดือน` : `${m} เดือน`;
  };

  const getInitials = (fname?: string, lname?: string) => {
    const f = (fname || '').trim().charAt(0);
    const l = (lname || '').trim().charAt(0);
    return (f + l) || 'ผู้';
  };

  const getBpDotClass = () => {
    if (!vitals.sysDia || vitals.sysDia === '---' || !vitals.sysDia.includes('/')) return 'blue';
    const [s, d] = vitals.sysDia.split('/').map(Number);
    if (s >= 140 || d >= 90) return 'red';
    if (s >= 130 || d >= 85) return 'orange';
    return 'green';
  };

  const getBmiInfo = () => {
    const bmiNum = parseFloat(vitals.bmi);
    if (isNaN(bmiNum) || bmiNum <= 0) return { label: '', color: '#64748b' };
    if (bmiNum < 18.5) return { label: 'น้ำหนักน้อย', color: '#007AFF' };
    if (bmiNum < 23) return { label: 'ปกติ', color: '#1E8E3E' };
    if (bmiNum < 25) return { label: 'ท้วม', color: '#FF9500' };
    return { label: 'อ้วน', color: '#FF3B30' };
  };

  const bmiInfo = getBmiInfo();

  // Queue Filtering
  const waitingRows = todayQueue.filter(r => Number(r.diag_count || 0) === 0 && Number(r.drug_count || 0) === 0);
  const doneRows = todayQueue.filter(r => Number(r.diag_count || 0) > 0 || Number(r.drug_count || 0) > 0);
  const filteredQueue = (queueFilter === 'waiting' ? waitingRows : doneRows).filter(r => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${r.fname || ''} ${r.lname || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      String(r.cid || '').includes(q) ||
      String(r.visitno || '').includes(q) ||
      String(r.pid || '').includes(q)
    );
  });

  // Totals
  const totalSell = drugList.reduce((sum, d) => sum + (Number(d.unit) || 0) * (Number(d.realprice) || 0), 0);
  const totalCost = drugList.reduce((sum, d) => sum + (Number(d.unit) || 0) * (Number(d.costprice) || 0), 0);

  // Safe add drug with allergy alert
  const handleSafeAddDrug = (row: any) => {
    const matchedAllergy = drugAllergies.find(
      al =>
        al.drugcode === row.drugcode ||
        (row.drugname && al.drugname && row.drugname.toLowerCase().includes(al.drugname.toLowerCase().split(' ')[0]))
    );
    if (matchedAllergy) {
      Swal.fire({
        title: '⚠️ คำเตือนประวัติแพ้ยา!',
        html: `ผู้ป่วยมีประวัติแพ้ <strong>${matchedAllergy.drugname}</strong><br/>ยืนยันว่าจะเพิ่ม <strong>${row.drugname}</strong> หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันเพิ่มยา',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#ef4444'
      }).then(r => {
        if (r.isConfirmed) {
          handleAddDrug(row);
          setActiveSheet(null);
        }
      });
      return;
    }
    handleAddDrug(row);
    setActiveSheet(null);
  };

  const handleFillNormalGA = () => {
    setDiagNote('GA: Alert, cooperative, HEENT: Not pale, Heart: Normal S1S2, Lung: Clear both lungs');
    if (!customSymptoms.trim()) {
      setCustomSymptoms('ตรวจติดตามอาการทั่วไป');
    }
  };

  const ncdSummaryText = () => {
    const parts: string[] = [];
    if (vitals.sugar && vitals.sugar !== '---') {
      parts.push(`DTX ${vitals.sugar}${sugarFasting ? ` (${sugarFasting})` : ''}`);
    }
    if (smokeStatus) parts.push(`บุหรี่: ${smokeStatus}`);
    if (alcoholStatus) parts.push(`สุรา: ${alcoholStatus}`);
    return parts.length > 0 ? parts.join(' · ') : 'ยังไม่ได้ระบุ DTX / บุหรี่ / สุรา';
  };

  return (
    <div className="ios-ws-root" onClick={() => showMoreMenu && setShowMoreMenu(false)}>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpenMobile && (
        <div className="ios-sidebar-backdrop" onClick={() => setSidebarOpenMobile(false)} />
      )}

      {/* ==================== SPLIT VIEW SIDEBAR: คิวตรวจวันนี้จาก JHCIS ==================== */}
      <aside className={`ios-sidebar ${!sidebarOpenDesktop ? 'collapsed-desktop' : ''} ${sidebarOpenMobile ? 'open-mobile' : ''}`}>
        <div className="ios-sidebar-header">
          <div className="ios-sidebar-toprow">
            <div>
              <div className="ios-hosp-label">{hospName.replace('โรงพยาบาลส่งเสริมสุขภาพตำบล', 'รพ.สต.')}</div>
              <h2 className="ios-sidebar-title">คิวตรวจวันนี้</h2>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="ios-circle-btn"
                onClick={fetchTodayQueue}
                title="รีเฟรชคิวจาก JHCIS"
              >
                <i className={`fa-solid fa-rotate ${loadingQueue ? 'fa-spin' : ''}`} style={{ fontSize: '14px' }} />
              </button>
              <button
                type="button"
                className="ios-circle-btn"
                onClick={onOpenManualId}
                title="ค้นหาผู้ป่วยใหม่ด้วยเลข 13 หลัก"
              >
                <i className="fa-solid fa-plus" style={{ fontSize: '15px' }} />
              </button>
            </div>
          </div>

          <div className="ios-search-wrap">
            <i className="fa-solid fa-magnifying-glass ios-search-icon" />
            <input
              type="text"
              className="ios-search-input"
              value={queueSearch}
              onChange={e => setQueueSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, SEQ หรือ ปชช."
            />
          </div>

          <div className="ios-segmented">
            <button
              type="button"
              className={`ios-seg-btn ${queueFilter === 'waiting' ? 'active' : ''}`}
              onClick={() => setQueueFilter('waiting')}
            >
              รอตรวจ <span className="ios-seg-count">{waitingRows.length}</span>
            </button>
            <button
              type="button"
              className={`ios-seg-btn ${queueFilter === 'done' ? 'active' : ''}`}
              onClick={() => setQueueFilter('done')}
            >
              ตรวจแล้ว <span className="ios-seg-count">{doneRows.length}</span>
            </button>
          </div>
        </div>

        <div className="ios-queue-list">
          {filteredQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', fontSize: '13px', color: 'rgba(60,60,67,0.5)' }}>
              {loadingQueue ? 'กำลังดึงคิวจาก JHCIS...' : 'ยังไม่มีผู้รับบริการในรายการนี้'}
            </div>
          ) : (
            filteredQueue.map(row => {
              const isActive = activeVisitNo === row.visitno || (!activeVisitNo && patient?.cid === row.cid);
              return (
                <button
                  key={row.visitno}
                  type="button"
                  className={`ios-queue-item ${isActive ? 'active' : ''}`}
                  onClick={async () => {
                    await onSelectQueuePatient(row);
                    setSidebarOpenMobile(false);
                  }}
                >
                  <div className="ios-queue-avatar">{getInitials(row.fname, row.lname)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.fname} {row.lname}
                      </span>
                      {Number(row.allergy_count || 0) > 0 && (
                        <span
                          className="ios-dot"
                          style={{ background: isActive ? '#FFD60A' : '#FF3B30' }}
                          title="มีประวัติแพ้ยา"
                        />
                      )}
                    </div>
                    <div className="ios-queue-meta">
                      SEQ {row.visitno} · {row.pressure ? `BP ${row.pressure}` : (row.symptoms || 'รอซักประวัติ')}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="ios-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span className="ios-dot green" />
            <span style={{ fontWeight: 600, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentVhv?.name || 'เจ้าหน้าที่'}
            </span>
          </div>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px' }}>{clockText}</span>
        </div>
      </aside>

      {/* ==================== MAIN DETAIL COLUMN ==================== */}
      <div className="ios-main-col">

        {/* Native iPadOS Translucent Navigation Bar */}
        <header className="ios-navbar">
          <div className="ios-navbar-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <button
                type="button"
                className="ios-nav-btn"
                title="แสดง/ซ่อนแถบคิวตรวจ"
                onClick={() => {
                  if (window.innerWidth >= 1024) setSidebarOpenDesktop(v => !v);
                  else setSidebarOpenMobile(v => !v);
                }}
              >
                <i className="fa-solid fa-table-columns" />
              </button>

              <div className={`ios-compact-title ${!isScrolled ? 'hidden-title' : ''}`}>
                <div style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {patient ? `${patient.fname || ''} ${patient.lname || ''}` : 'เลือกผู้ป่วยจากคิว'}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(60,60,67,0.65)' }}>
                  {activeVisitNo ? `SEQ ${activeVisitNo}` : (patient?.cid || 'พร้อมรับบริการ')}
                </div>
              </div>
            </div>

            {/* Center Segmented Control (Desktop) */}
            <div className="ios-segmented ios-desktop-seg" style={{ minWidth: '290px' }}>
              <button type="button" className={`ios-seg-btn ${activeView === 'visit' ? 'active' : ''}`} onClick={() => setActiveView('visit')}>
                ตรวจรักษา
              </button>
              <button type="button" className={`ios-seg-btn ${activeView === 'history' ? 'active' : ''}`} onClick={() => setActiveView('history')}>
                ประวัติ
              </button>
              <button type="button" className={`ios-seg-btn ${activeView === 'screening' ? 'active' : ''}`} onClick={() => setActiveView('screening')}>
                คัดกรอง & AI
              </button>
            </div>

            {/* Right Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, position: 'relative' }}>
              <button type="button" className="ios-nav-btn" onClick={onOpenBluetooth} title="อุปกรณ์ Bluetooth">
                <i className="fa-brands fa-bluetooth-b" />
              </button>
              <button type="button" className="ios-nav-btn" onClick={onOpenTelemed} title="ปรึกษาแพทย์ออนไลน์ (Telemedicine)">
                <i className="fa-solid fa-video" />
              </button>
              <button
                type="button"
                className="ios-nav-btn"
                title="เครื่องมือเพิ่มเติม"
                onClick={e => {
                  e.stopPropagation();
                  setShowMoreMenu(v => !v);
                }}
              >
                <i className="fa-solid fa-ellipsis-vertical" />
              </button>

              {showMoreMenu && (
                <div className="ios-popover" onClick={e => e.stopPropagation()}>
                  <button type="button" className="ios-popover-item" onClick={() => { setShowMoreMenu(false); onManualCardRead(); }}>
                    <span>อ่านบัตรประชาชนใหม่</span>
                    <i className="fa-solid fa-id-card" style={{ color: '#007AFF' }} />
                  </button>
                  <button type="button" className="ios-popover-item" onClick={() => { setShowMoreMenu(false); onOpenManualId(); }}>
                    <span>ค้นหาด้วยเลข 13 หลัก</span>
                    <i className="fa-solid fa-magnifying-glass" style={{ color: '#007AFF' }} />
                  </button>
                  <button type="button" className="ios-popover-item" onClick={() => { setShowMoreMenu(false); fetchTodayQueue(); }}>
                    <span>รีเฟรชคิว JHCIS วันนี้</span>
                    <i className="fa-solid fa-rotate" style={{ color: '#34C759' }} />
                  </button>
                  <button type="button" className="ios-popover-item danger" onClick={() => { setShowMoreMenu(false); onLogoutToHome(); }}>
                    <span>กลับหน้าแรก Kiosk</span>
                    <i className="fa-solid fa-right-from-bracket" />
                  </button>
                </div>
              )}

              <button type="button" className="ios-save-btn" onClick={onSaveQueue} disabled={!patient}>
                บันทึก
              </button>
            </div>
          </div>

          {/* Mobile Segmented Control */}
          <div className="ios-mobile-seg">
            <div className="ios-segmented">
              <button type="button" className={`ios-seg-btn ${activeView === 'visit' ? 'active' : ''}`} onClick={() => setActiveView('visit')}>
                ตรวจรักษา
              </button>
              <button type="button" className={`ios-seg-btn ${activeView === 'history' ? 'active' : ''}`} onClick={() => setActiveView('history')}>
                ประวัติ
              </button>
              <button type="button" className={`ios-seg-btn ${activeView === 'screening' ? 'active' : ''}`} onClick={() => setActiveView('screening')}>
                คัดกรอง & AI
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main
          className="ios-main-scroll"
          onScroll={e => setIsScrolled((e.currentTarget as HTMLElement).scrollTop > 50)}
        >
          {!patient ? (
            <div style={{ maxWidth: '520px', margin: '80px auto', textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '48px', color: '#007AFF', marginBottom: '12px' }}>
                <i className="fa-solid fa-user-doctor" />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>เลือกผู้รับบริการจากแถบคิวด้านซ้าย</h2>
              <p style={{ color: 'rgba(60,60,67,0.65)', marginBottom: '22px' }}>
                หรือสอดบัตรประชาชน / กดค้นหาเลข 13 หลัก เพื่อเริ่มบันทึกการตรวจลง JHCIS
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="ios-save-btn" onClick={onOpenManualId}>
                  <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px' }} /> ค้นหาเลข 13 หลัก
                </button>
                <button type="button" className="ios-pill blue" onClick={onManualCardRead}>
                  <i className="fa-solid fa-id-card" /> อ่านบัตรประชาชน
                </button>
              </div>
            </div>
          ) : (
            <div className="ios-canvas">

              {/* ==================== PATIENT LARGE TITLE HEADER ==================== */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="ios-patient-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <label className="ios-avatar-lg" title="แตะเพื่อถ่ายรูปผู้ป่วยใหม่">
                      {patientImage ? (
                        <img src={patientImage} alt="รูปผู้ป่วย" />
                      ) : (
                        <span>{getInitials(patient.fname, patient.lname)}</span>
                      )}
                      {isUploadingPhoto && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-spinner fa-spin" />
                        </div>
                      )}
                      <input type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={onCapturePhoto} disabled={isUploadingPhoto} />
                    </label>
                    <div style={{ minWidth: 0 }}>
                      <h1 className="ios-patient-name">
                        {patient.fname} {patient.lname}
                      </h1>
                      <p className="ios-patient-sub">
                        {activeVisitNo ? `SEQ ${activeVisitNo} · ` : 'Visit ใหม่ · '}
                        CID {patient.cid} · อายุ {formatAge()}
                        {patient.chronic && patient.chronic !== 'ไม่มีโรคประจำตัว' ? ` · ${patient.chronic}` : ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`ios-pill ${drugAllergies.length > 0 || foodAllergy ? 'danger' : ''}`}
                      onClick={() => setActiveSheet('allergy')}
                    >
                      <span className={`ios-dot ${drugAllergies.length > 0 || foodAllergy ? 'red' : 'green'}`} />
                      {drugAllergies.length > 0 ? `แพ้ยา ${drugAllergies.length} รายการ` : 'ไม่พบประวัติแพ้ยา'}
                    </button>

                    <button
                      type="button"
                      className="ios-pill blue"
                      onClick={() => setTimeService(prev => (prev === '1' ? '2' : '1'))}
                      title="แตะเพื่อสลับ ในเวลา / นอกเวลา"
                    >
                      {timeService === '1' ? 'ในเวลา' : 'นอกเวลา'}
                    </button>
                  </div>
                </div>

                {/* Quick Action Pills */}
                <div className="ios-pill-row">
                  <button type="button" className="ios-pill" onClick={handleReMed}>
                    <i className="fa-solid fa-rotate-left" style={{ color: '#007AFF' }} /> ดึงยาเดิม (Re Med)
                  </button>
                  <button type="button" className="ios-pill" onClick={() => onOpenPresetModal('symptoms')}>
                    <i className="fa-solid fa-list-ul" style={{ color: '#4f46e5' }} /> คลังข้อความ CC
                  </button>
                  <button type="button" className="ios-pill" onClick={() => onOpenPresetModal('symptomsco')}>
                    <i className="fa-solid fa-notes-medical" style={{ color: '#0284c7' }} /> คลังข้อความ PI
                  </button>
                  <button type="button" className="ios-pill" onClick={() => onOpenGuide('bp')}>
                    <i className="fa-solid fa-gauge-high" style={{ color: '#007AFF' }} /> วัดความดัน BLE
                  </button>
                  <button type="button" className="ios-pill" onClick={() => onOpenGuide('weight')}>
                    <i className="fa-solid fa-weight-scale" style={{ color: '#34C759' }} /> ชั่งน้ำหนัก BLE
                  </button>
                  <button type="button" className="ios-pill" onClick={() => onOpenGuide('sugar')}>
                    <i className="fa-solid fa-droplet" style={{ color: '#FF3B30' }} /> เจาะน้ำตาล
                  </button>
                </div>
              </section>

              {/* ==================== VIEW 1: ตรวจรักษา ==================== */}
              {activeView === 'visit' && (
                <>
                  {/* โหมดเด็ก 0-60 เดือน */}
                  {isChild && (
                    <section>
                      <div className="ios-section-head">
                        <h2 className="ios-section-title">โภชนาการเด็ก 0–60 เดือน (อายุ {patient.age_months} เดือน)</h2>
                      </div>
                      <div className="ios-card">
                        <div className="ios-vitals-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                          <div className="ios-vital-box">
                            <span className="ios-vital-label">น้ำหนัก (กก.)</span>
                            <input
                              className="ios-vital-num"
                              value={vitals.weight === '---' ? '' : vitals.weight}
                              onChange={e => handleVitalChange('weight', e.target.value)}
                              placeholder="---"
                            />
                          </div>
                          <div className="ios-vital-box">
                            <span className="ios-vital-label">ส่วนสูง (ซม.)</span>
                            <input
                              className="ios-vital-num"
                              value={vitals.height === '---' ? '' : vitals.height}
                              onChange={e => handleVitalChange('height', e.target.value)}
                              placeholder="---"
                            />
                          </div>
                          <div className="ios-vital-box">
                            <span className="ios-vital-label">เส้นรอบศีรษะ (ซม.)</span>
                            <input
                              className="ios-vital-num"
                              value={vitals.headCircum === '---' ? '' : vitals.headCircum}
                              onChange={e => handleVitalChange('headCircum', e.target.value)}
                              placeholder="---"
                            />
                          </div>
                        </div>
                        <div className="ios-row" style={{ fontSize: '13.5px', color: '#b45309', background: '#fffbeb' }}>
                          <div>
                            <strong>ผลประเมินอัตโนมัติ:</strong> รหัสโภชนาการ ({childDev.nlevel} / {childDev.nlevel2} / {childDev.nlevel3}) · บันทึกอาการสำคัญอัตโนมัติสำหรับเด็ก 0–60 เดือน
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 1. อาการและผลตรวจร่างกาย */}
                  {!isChild && (
                    <section>
                      <div className="ios-section-head">
                        <h2 className="ios-section-title">อาการและผลตรวจร่างกาย</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" className="ios-link-btn" onClick={handleFillNormalGA}>
                            เติม GA+ ปกติ
                          </button>
                        </div>
                      </div>

                      <div className="ios-card">
                        <div className="ios-row stack-mobile">
                          <label className="ios-row-label">อาการสำคัญ (CC) <span style={{ color: '#FF3B30' }}>*</span></label>
                          <input
                            type="text"
                            maxLength={255}
                            className="ios-field-input"
                            value={customSymptoms}
                            onChange={e => setCustomSymptoms(e.target.value)}
                            placeholder="ระบุอาการสำคัญ หรือกดปุ่มข้อความสำเร็จรูป..."
                          />
                          <button type="button" className="ios-link-btn" onClick={() => onOpenPresetModal('symptoms')}>
                            เลือกข้อความ
                          </button>
                        </div>

                        <div className="ios-row stack-mobile">
                          <label className="ios-row-label">อาการร่วม (PI)</label>
                          <input
                            type="text"
                            maxLength={255}
                            className="ios-field-input"
                            value={customSymptomsco}
                            onChange={e => setCustomSymptomsco(e.target.value)}
                            placeholder="ประวัติเจ็บป่วยปัจจุบัน / อาการร่วม (ถ้ามี)"
                          />
                          <button type="button" className="ios-link-btn" onClick={() => onOpenPresetModal('symptomsco')}>
                            เลือกข้อความ
                          </button>
                        </div>

                        <div className="ios-row stack-mobile" style={{ alignItems: 'flex-start' }}>
                          <label className="ios-row-label" style={{ paddingTop: '2px' }}>ผลตรวจ / คำวินิจฉัย</label>
                          <textarea
                            rows={2}
                            maxLength={255}
                            className="ios-field-textarea"
                            value={diagNote}
                            onChange={e => setDiagNote(e.target.value)}
                            placeholder="GA: Alert, HEENT: Not pale, Heart/Lung: Normal..."
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 2. สัญญาณชีพ & สัดส่วนร่างกาย */}
                  {!isChild && (
                    <section>
                      <div className="ios-section-head">
                        <h2 className="ios-section-title">สัญญาณชีพ & สัดส่วนร่างกาย</h2>
                        <button type="button" className="ios-link-btn" onClick={() => onOpenGuide('bp')}>
                          อ่านจากเครื่องวัดความดัน
                        </button>
                      </div>

                      <div className="ios-card">
                        <div className="ios-vitals-grid">
                          {/* ความดัน */}
                          <div className="ios-vital-box">
                            <div className="ios-vital-label">
                              <span>ความดัน (mmHg)</span>
                              <span className={`ios-dot ${getBpDotClass()}`} />
                            </div>
                            <input
                              type="text"
                              className="ios-vital-num"
                              value={vitals.sysDia === '---' ? '' : vitals.sysDia}
                              onChange={e => handleVitalChange('sysDia', e.target.value)}
                              onBlur={e => { if (!e.target.value.trim()) handleVitalChange('sysDia', '---'); }}
                              placeholder="120/80"
                            />
                          </div>

                          {/* ชีพจร / อุณหภูมิ / SpO2 */}
                          <div className="ios-vital-box">
                            <div className="ios-vital-label">
                              <span>ชีพจร · อุณหภูมิ</span>
                              <span style={{ fontSize: '11px' }}>O2 {vitals.spo2 === '---' ? '-' : `${vitals.spo2}%`}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                              <input
                                type="text"
                                className="ios-vital-num"
                                style={{ width: '54px' }}
                                value={vitals.pulse === '---' ? '' : vitals.pulse}
                                onChange={e => handleVitalChange('pulse', e.target.value)}
                                onBlur={e => { if (!e.target.value.trim()) handleVitalChange('pulse', '---'); }}
                                placeholder="78"
                              />
                              <span style={{ color: 'rgba(60,60,67,0.35)' }}>·</span>
                              <input
                                type="text"
                                className="ios-vital-num"
                                style={{ width: '56px', fontSize: '18px', color: '#3C3C43' }}
                                value={vitals.temp === '---' ? '' : vitals.temp}
                                onChange={e => handleVitalChange('temp', e.target.value)}
                                onBlur={e => { if (!e.target.value.trim()) handleVitalChange('temp', '---'); }}
                                placeholder="36.5"
                              />
                              <span style={{ fontSize: '11px', color: 'rgba(60,60,67,0.5)' }}>°C</span>
                            </div>
                          </div>

                          {/* น้ำหนัก / ส่วนสูง */}
                          <div className="ios-vital-box">
                            <span className="ios-vital-label">น้ำหนัก / ส่วนสูง</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <input
                                type="text"
                                className="ios-vital-num"
                                style={{ width: '60px' }}
                                value={vitals.weight === '---' ? '' : vitals.weight}
                                onChange={e => handleVitalChange('weight', e.target.value)}
                                onBlur={e => { if (!e.target.value.trim()) handleVitalChange('weight', '---'); }}
                                placeholder="60"
                              />
                              <span style={{ fontSize: '11px', color: 'rgba(60,60,67,0.5)' }}>กก.</span>
                              <input
                                type="text"
                                className="ios-vital-num"
                                style={{ width: '60px', fontSize: '18px', color: '#3C3C43' }}
                                value={vitals.height === '---' ? '' : vitals.height}
                                onChange={e => handleVitalChange('height', e.target.value)}
                                onBlur={e => { if (!e.target.value.trim()) handleVitalChange('height', '---'); }}
                                placeholder="165"
                              />
                            </div>
                          </div>

                          {/* BMI & รอบเอว */}
                          <div className="ios-vital-box">
                            <div className="ios-vital-label">
                              <span>BMI · เอว (ซม.)</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: bmiInfo.color }}>{bmiInfo.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '21px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {vitals.bmi === '---' ? '—' : vitals.bmi}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                <input
                                  type="text"
                                  className="ios-vital-num"
                                  style={{ width: '50px', fontSize: '16px', textAlign: 'right', color: '#3C3C43' }}
                                  value={vitals.waist === '---' ? '' : vitals.waist}
                                  onChange={e => handleVitalChange('waist', e.target.value)}
                                  onBlur={e => { if (!e.target.value.trim()) handleVitalChange('waist', '---'); }}
                                  placeholder="80"
                                />
                                <span style={{ fontSize: '11px', color: 'rgba(60,60,67,0.45)' }}>ซม.</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Disclosure Row -> NCD, DTX & SpecialPP Sheet */}
                        <button type="button" className="ios-disclosure-row" onClick={() => setActiveSheet('ncd')}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`ios-dot ${smokeStatus && alcoholStatus ? 'green' : 'orange'}`} />
                            <span style={{ fontSize: '15px', fontWeight: 500, color: '#000' }}>
                              น้ำตาล (DTX), บุหรี่ & สุรา (SpecialPP)
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(60,60,67,0.6)', fontSize: '13.5px' }}>
                            <span>{ncdSummaryText()}</span>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '12px', opacity: 0.5 }} />
                          </div>
                        </button>
                      </div>
                    </section>
                  )}

                  {/* 3. การวินิจฉัยโรค ICD-10 */}
                  <section>
                    <div className="ios-section-head">
                      <h2 className="ios-section-title">การวินิจฉัยโรค (ICD-10)</h2>
                      <span style={{ fontSize: '12px', color: 'rgba(60,60,67,0.5)' }}>{icd10List.length} รายการ</span>
                    </div>

                    <div className="ios-card">
                      {icd10List.length === 0 ? (
                        <div className="ios-row" style={{ color: 'rgba(60,60,67,0.45)', fontSize: '14px' }}>
                          ยังไม่ได้ระบุรหัสการวินิจฉัยโรค
                        </div>
                      ) : (
                        icd10List.map((item, idx) => (
                          <div key={`${item.diagcode}-${idx}`} className="ios-row stack-mobile" style={{ justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span className="ios-code-badge">{item.diagcode}</span>
                                <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.diseasename}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <select
                                value={item.dxtype}
                                onChange={e => setIcd10List(prev => prev.map((x, i) => i === idx ? { ...x, dxtype: e.target.value } : x))}
                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12.5px', background: '#F2F2F7' }}
                              >
                                <option value="01">01 โรคหลัก</option>
                                <option value="02">02 โรคร่วม</option>
                                <option value="04">04 โรคแทรก</option>
                                <option value="05">05 อื่นๆ</option>
                              </select>

                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: '#3C3C43' }}>
                                <input
                                  type="checkbox"
                                  checked={item.conti === '1'}
                                  onChange={e => setIcd10List(prev => prev.map((x, i) => i === idx ? { ...x, conti: e.target.checked ? '1' : '0' } : x))}
                                />
                                ต่อเนื่อง
                              </label>

                              <input
                                type="date"
                                value={item.appointDate}
                                onChange={e => setIcd10List(prev => prev.map((x, i) => i === idx ? { ...x, appointDate: e.target.value } : x))}
                                style={{ padding: '4px 6px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', background: '#F2F2F7' }}
                                title="วันนัดตรวจติดตาม"
                              />

                              <button
                                type="button"
                                className="ios-del-btn"
                                onClick={() => setIcd10List(prev => prev.filter((_, i) => i !== idx))}
                                title="ลบรหัสโรค"
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      <button type="button" className="ios-add-row" onClick={() => setActiveSheet('addIcd')}>
                        <span className="ios-plus-dot">+</span>
                        <span>เพิ่มรหัสโรค ICD-10</span>
                      </button>
                    </div>
                  </section>

                  {/* 4. ยา เวชภัณฑ์ สมุนไพร และหัตถการ */}
                  <section>
                    <div className="ios-section-head">
                      <h2 className="ios-section-title">ยา เวชภัณฑ์ สมุนไพร และหัตถการ</h2>
                      <button type="button" className="ios-link-btn" onClick={() => setActiveSheet('addDrug')}>
                        + เพิ่มรายการ
                      </button>
                    </div>

                    <div className="ios-card">
                      {drugList.length === 0 ? (
                        <div className="ios-row" style={{ color: 'rgba(60,60,67,0.45)', fontSize: '14px' }}>
                          ยังไม่มีรายการยาหรือหัตถการ (กด + ด้านล่าง หรือปุ่ม Re Med ด้านบน)
                        </div>
                      ) : (
                        drugList.map((drug, idx) => (
                          <div key={`${drug.drugcode}-${idx}`} className="ios-row stack-mobile" style={{ justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: '#000' }}>{drug.drugname}</div>
                              <div style={{ fontSize: '11.5px', color: 'rgba(60,60,67,0.5)', fontFamily: 'ui-monospace, monospace' }}>
                                {drug.drugcode}
                              </div>
                              <button
                                type="button"
                                className="ios-link-btn"
                                style={{ padding: 0, marginTop: '3px', fontSize: '13px', color: drug.dose ? 'rgba(60,60,67,0.72)' : '#007AFF', textAlign: 'left' }}
                                onClick={() => {
                                  setEditingDrugIdx(idx);
                                  setTempDoseText(drug.dose || '');
                                  setActiveSheet('editDose');
                                }}
                              >
                                {drug.dose || '+ แตะเพื่อระบุวิธีใช้ยา'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                              {/* Native iPadOS UIStepper */}
                              <div className="ios-stepper">
                                <button
                                  type="button"
                                  className="ios-step-btn"
                                  onClick={() => setDrugList(prev => prev.map((x, i) => i === idx ? { ...x, unit: Math.max(1, x.unit - 1) } : x))}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  className="ios-step-val"
                                  value={drug.unit}
                                  onChange={e => setDrugList(prev => prev.map((x, i) => i === idx ? { ...x, unit: Math.max(1, Number(e.target.value) || 1) } : x))}
                                />
                                <button
                                  type="button"
                                  className="ios-step-btn"
                                  onClick={() => setDrugList(prev => prev.map((x, i) => i === idx ? { ...x, unit: x.unit + 1 } : x))}
                                >
                                  +
                                </button>
                              </div>

                              <div style={{ minWidth: '68px', textAlign: 'right' }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                  {(drug.unit * drug.realprice).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(60,60,67,0.5)' }}>
                                  @{drug.realprice.toFixed(2)}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="ios-del-btn"
                                onClick={() => setDrugList(prev => prev.filter((_, i) => i !== idx))}
                                title="ลบรายการ"
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      <button type="button" className="ios-add-row" onClick={() => setActiveSheet('addDrug')}>
                        <span className="ios-plus-dot">+</span>
                        <span>สั่งจ่ายยา / สมุนไพร / หัตถการ / ทันตฯ</span>
                      </button>

                      <div className="ios-card-footer">
                        <div style={{ fontSize: '13px', color: 'rgba(60,60,67,0.68)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>ทุนรวม <strong style={{ color: '#000' }}>{totalCost.toFixed(2)}</strong> ฿</span>
                          <span>ผู้บันทึก <strong style={{ color: '#000' }}>{currentVhv?.name || 'เจ้าหน้าที่'}</strong></span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'rgba(60,60,67,0.55)' }}>รวมสุทธิ</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {totalSell.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(60,60,67,0.6)' }}>฿</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* ==================== VIEW 2: ประวัติย้อนหลังจริงจาก JHCIS ==================== */}
              {activeView === 'history' && (
                <section>
                  <div className="ios-section-head">
                    <h2 className="ios-section-title">ประวัติการรับบริการย้อนหลัง (JHCIS)</h2>
                    <button type="button" className="ios-link-btn" onClick={handleReMed}>
                      ดึงยาครั้งล่าสุด (Re Med)
                    </button>
                  </div>
                  <div className="ios-card">
                    {loadingHistory ? (
                      <div className="ios-row" style={{ color: 'rgba(60,60,67,0.5)' }}>กำลังโหลดประวัติจาก JHCIS...</div>
                    ) : patientHistory.length === 0 ? (
                      <div className="ios-row" style={{ color: 'rgba(60,60,67,0.5)' }}>ไม่พบประวัติการรับบริการก่อนหน้า</div>
                    ) : (
                      patientHistory.map((h, i) => (
                        <div key={i} className="ios-row stack-mobile" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: 600 }}>
                              {String(h.visitdate || '').slice(0, 10)} · SEQ {h.visitno}
                            </div>
                            <div style={{ fontSize: '13.5px', color: '#3C3C43', marginTop: '3px' }}>
                              {h.symptoms || '-'} {h.pressure ? `· BP ${h.pressure}` : ''}
                            </div>
                            {h.diags?.length > 0 && (
                              <div style={{ fontSize: '13px', color: '#007AFF', marginTop: '3px' }}>
                                ICD-10: {h.diags.map((d: any) => `${d.diagcode} ${d.diseasename}`).join(', ')}
                              </div>
                            )}
                            {h.drugs?.length > 0 && (
                              <div style={{ fontSize: '12.5px', color: 'rgba(60,60,67,0.65)', marginTop: '3px' }}>
                                ยา/บริการ: {h.drugs.map((d: any) => `${d.drugname} (${d.unit})`).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* ==================== VIEW 3: คัดกรอง & AI ==================== */}
              {activeView === 'screening' && (
                <>
                  <section>
                    <div className="ios-section-head">
                      <h2 className="ios-section-title">โรคประจำตัว & ผลวิเคราะห์ AI</h2>
                    </div>
                    <div className="ios-card">
                      <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>โรคประจำตัว (JHCIS)</span>
                        <span style={{ fontWeight: 600, color: patient.chronic === 'ไม่มีโรคประจำตัว' ? '#1E8E3E' : '#D70015' }}>
                          {patient.chronic || 'ไม่มีข้อมูล'}
                        </span>
                      </div>
                      <div className="ios-row" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#007AFF', marginBottom: '4px' }}>
                            ✨ AI พยาบาลประเมินผล
                          </div>
                          <div style={{ fontSize: '14.5px', lineHeight: 1.55, color: '#1C1C1E' }}>
                            {aiLoading ? 'กำลังวิเคราะห์ข้อมูลสัญญาณชีพ...' : (aiResponse || 'กรอกค่าความดัน น้ำหนัก หรือน้ำตาลเพื่อให้ AI ประเมินผล')}
                          </div>
                        </div>
                      </div>
                      {healthAnalysis.alerts.map((al, idx) => (
                        <div key={idx} className="ios-row" style={{ background: `${al.color}12` }}>
                          <i className={al.icon} style={{ fontSize: '20px', color: al.color }} />
                          <div>
                            <div style={{ fontWeight: 600, color: al.color }}>{al.title}</div>
                            <div style={{ fontSize: '13.5px', color: '#334155' }}>{al.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="ios-section-head">
                      <h2 className="ios-section-title">คัดกรอง SpecialPP (f43specialpp)</h2>
                      <button type="button" className="ios-link-btn" onClick={() => setActiveSheet('ncd')}>แก้ไข</button>
                    </div>
                    <div className="ios-card">
                      <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                        <span>บุหรี่</span>
                        <span style={{ color: 'rgba(60,60,67,0.75)' }}>{smokeStatus || 'ยังไม่ระบุ'}</span>
                      </div>
                      <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                        <span>สุรา</span>
                        <span style={{ color: 'rgba(60,60,67,0.75)' }}>{alcoholStatus || 'ยังไม่ระบุ'}</span>
                      </div>
                      <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                        <span>น้ำตาล (DTX)</span>
                        <span style={{ color: 'rgba(60,60,67,0.75)' }}>
                          {vitals.sugar === '---' ? 'ไม่ระบุ' : `${vitals.sugar} mg/dL ${sugarFasting ? `(${sugarFasting})` : ''}`}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )}

            </div>
          )}
        </main>
      </div>

      {/* ==================== iPadOS PAGE SHEETS ==================== */}
      {activeSheet && (
        <div className="ios-sheet-backdrop" onClick={() => setActiveSheet(null)}>
          <div className="ios-sheet" onClick={e => e.stopPropagation()}>

            {/* Sheet: ค้นหาและเพิ่ม ICD-10 */}
            {activeSheet === 'addIcd' && (
              <>
                <div className="ios-sheet-header">
                  <button type="button" className="ios-link-btn" onClick={() => setActiveSheet(null)}>ปิด</button>
                  <strong style={{ fontSize: '16px' }}>เพิ่มรหัสโรค ICD-10</strong>
                  <span style={{ width: '40px' }} />
                </div>
                <div className="ios-sheet-body">
                  <input
                    autoFocus
                    type="text"
                    className="ios-search-input"
                    style={{ paddingLeft: '14px', background: '#fff' }}
                    value={icdSearch}
                    onChange={e => handleSearchIcd10(e.target.value)}
                    placeholder="พิมพ์รหัส ICD-10 หรือชื่อโรค เช่น J00, I10, E11, ปวดหลัง..."
                  />
                  <div className="ios-pill-row">
                    {['J00', 'J06', 'I10', 'E11', 'M79', 'K29', 'Z00'].map(code => (
                      <button key={code} type="button" className="ios-pill blue" onClick={() => handleSearchIcd10(code)}>
                        {code}
                      </button>
                    ))}
                  </div>
                  <div className="ios-card">
                    {icdResults.length === 0 ? (
                      <div className="ios-row" style={{ color: 'rgba(60,60,67,0.5)', fontSize: '14px' }}>
                        พิมพ์อย่างน้อย 2 ตัวอักษร หรือแตะรหัสด่วนด้านบนเพื่อค้นหาจากตาราง cdisease
                      </div>
                    ) : (
                      icdResults.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="ios-disclosure-row"
                          style={{ borderTop: i > 0 ? '0.5px solid rgba(60,60,67,0.14)' : 'none' }}
                          onClick={() => {
                            handleAddIcd10(r);
                            setActiveSheet(null);
                          }}
                        >
                          <div>
                            <span className="ios-code-badge" style={{ marginRight: '8px' }}>{r.diseasecode}</span>
                            <span style={{ fontSize: '14.5px', color: '#000' }}>{r.diseasenamethai || r.diseasename}</span>
                          </div>
                          <span style={{ color: '#007AFF', fontSize: '18px', fontWeight: 600 }}>+</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Sheet: ค้นหาและสั่งจ่ายยา / สมุนไพร / หัตถการ */}
            {activeSheet === 'addDrug' && (
              <>
                <div className="ios-sheet-header">
                  <button type="button" className="ios-link-btn" onClick={() => setActiveSheet(null)}>ปิด</button>
                  <strong style={{ fontSize: '16px' }}>สั่งจ่ายยา / สมุนไพร / หัตถการ</strong>
                  <span style={{ width: '40px' }} />
                </div>
                <div className="ios-sheet-body">
                  <div className="ios-segmented">
                    {[
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'herb', label: 'สมุนไพร' },
                      { id: 'service', label: 'หัตถการ' },
                      { id: 'adp', label: 'ADP' },
                      { id: 'dental', label: 'ทันตฯ' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`ios-seg-btn ${drugCategory === tab.id ? 'active' : ''}`}
                        onClick={() => {
                          setDrugCategory(tab.id as any);
                          handleSearchDrug(drugSearch, tab.id as any);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    className="ios-search-input"
                    style={{ paddingLeft: '14px', background: '#fff' }}
                    value={drugSearch}
                    onChange={e => handleSearchDrug(e.target.value)}
                    placeholder="พิมพ์ชื่อยา สมุนไพร หัตถการ หรือรหัสยา..."
                  />
                  <div className="ios-card">
                    {drugResults.length === 0 ? (
                      <div className="ios-row" style={{ color: 'rgba(60,60,67,0.5)', fontSize: '14px' }}>
                        พิมพ์ชื่อรายการเพื่อค้นหาจากตาราง cdrug ของ JHCIS
                      </div>
                    ) : (
                      drugResults.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          className="ios-disclosure-row"
                          style={{ borderTop: i > 0 ? '0.5px solid rgba(60,60,67,0.14)' : 'none' }}
                          onClick={() => handleSafeAddDrug(d)}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '14.5px', fontWeight: 500, color: '#000' }}>{d.drugname}</div>
                            <div style={{ fontSize: '11.5px', color: 'rgba(60,60,67,0.55)' }}>{d.drugcode}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#007AFF' }}>
                              {Number(d.realprice).toFixed(2)} ฿
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(60,60,67,0.5)' }}>ทุน {Number(d.costprice).toFixed(2)}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Sheet: น้ำตาล DTX & บุหรี่/สุรา SpecialPP */}
            {activeSheet === 'ncd' && (
              <>
                <div className="ios-sheet-header">
                  <button type="button" className="ios-link-btn" onClick={() => setActiveSheet(null)}>ปิด</button>
                  <strong style={{ fontSize: '16px' }}>น้ำตาล (DTX) & บุหรี่ / สุรา</strong>
                  <button type="button" className="ios-link-btn" style={{ fontWeight: 700 }} onClick={() => setActiveSheet(null)}>เสร็จสิ้น</button>
                </div>
                <div className="ios-sheet-body">
                  <div className="ios-card">
                    <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '15px' }}>ค่าน้ำตาล DTX (mg/dL)</span>
                      <input
                        type="text"
                        value={vitals.sugar === '---' ? '' : vitals.sugar}
                        onChange={e => handleVitalChange('sugar', e.target.value)}
                        onBlur={e => { if (!e.target.value.trim()) handleVitalChange('sugar', '---'); }}
                        placeholder="ไม่ระบุ"
                        style={{ width: '110px', textAlign: 'right', border: 'none', fontSize: '15px', color: '#007AFF', fontWeight: 600, outline: 'none' }}
                      />
                    </div>
                    <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '15px' }}>สภาวะก่อนเจาะเลือด</span>
                      <select
                        value={sugarFasting}
                        onChange={e => setSugarFasting(e.target.value)}
                        style={{ border: 'none', fontSize: '15px', color: '#007AFF', fontWeight: 500, background: 'transparent', outline: 'none' }}
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        <option value="งดน้ำ-อาหาร">งดน้ำ-อาหาร</option>
                        <option value="ไม่งดน้ำ-อาหาร">ไม่งดน้ำ-อาหาร</option>
                      </select>
                    </div>
                  </div>

                  <div className="ios-card">
                    <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '15px' }}>ประวัติสูบบุหรี่ *</span>
                      <select
                        value={smokeStatus}
                        onChange={e => setSmokeStatus(e.target.value)}
                        style={{ border: 'none', fontSize: '15px', color: '#007AFF', fontWeight: 500, background: 'transparent', outline: 'none' }}
                      >
                        <option value="">-- กรุณาเลือก --</option>
                        <option value="ไม่สูบ">ไม่สูบ</option>
                        <option value="เคยสูบแต่เลิกแล้ว">เคยสูบแต่เลิกแล้ว</option>
                        <option value="ยังสูบอยู่">ยังสูบอยู่</option>
                      </select>
                    </div>
                    {smokeStatus === 'ยังสูบอยู่' && (
                      <>
                        <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', color: 'rgba(60,60,67,0.75)' }}>ปริมาณ (มวน/วัน)</span>
                          <select value={smokeAmount} onChange={e => setSmokeAmount(e.target.value)} style={{ border: 'none', color: '#007AFF', background: 'transparent' }}>
                            <option value="1B509">ไม่ระบุปริมาณ</option>
                            <option value="1B501">1-10 มวน/วัน</option>
                            <option value="1B502">11-19 มวน/วัน</option>
                            <option value="1B503">20 มวนขึ้นไป/วัน</option>
                          </select>
                        </div>
                        <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', color: 'rgba(60,60,67,0.75)' }}>สูบหลังตื่นนอน</span>
                          <select value={smokeWake} onChange={e => setSmokeWake(e.target.value)} style={{ border: 'none', color: '#007AFF', background: 'transparent' }}>
                            <option value="">ไม่ระบุ</option>
                            <option value="1B504">&lt; 30 นาที</option>
                            <option value="1B505">30 นาที - 1 ชม.</option>
                            <option value="1B506">1 ชม. ขึ้นไป</option>
                          </select>
                        </div>
                        <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', color: 'rgba(60,60,67,0.75)' }}>คำแนะนำเลิกบุหรี่</span>
                          <select value={smokeAdvice} onChange={e => setSmokeAdvice(e.target.value)} style={{ border: 'none', color: '#007AFF', background: 'transparent' }}>
                            <option value="">ไม่ระบุ</option>
                            <option value="1B530">ให้คำแนะนำสั้นๆ (1B530)</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ios-card">
                    <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '15px' }}>ประวัติดื่มสุรา *</span>
                      <select
                        value={alcoholStatus}
                        onChange={e => setAlcoholStatus(e.target.value)}
                        style={{ border: 'none', fontSize: '15px', color: '#007AFF', fontWeight: 500, background: 'transparent', outline: 'none' }}
                      >
                        <option value="">-- กรุณาเลือก --</option>
                        <option value="ไม่ดื่ม">ไม่ดื่ม</option>
                        <option value="เคยดื่มแต่เลิกแล้ว">เคยดื่มแต่เลิกแล้ว</option>
                        <option value="ยังดื่มอยู่">ยังดื่มอยู่</option>
                      </select>
                    </div>
                    {alcoholStatus === 'ยังดื่มอยู่' && (
                      <div className="ios-row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: 'rgba(60,60,67,0.75)' }}>คำแนะนำลดสุรา</span>
                        <select value={alcoholAdvice} onChange={e => setAlcoholAdvice(e.target.value)} style={{ border: 'none', color: '#007AFF', background: 'transparent' }}>
                          <option value="">ไม่ระบุ</option>
                          <option value="1B611">ให้คำปรึกษาสั้นๆ (1B611)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Sheet: แพ้ยา & แพ้อาหาร */}
            {activeSheet === 'allergy' && (
              <>
                <div className="ios-sheet-header">
                  <button type="button" className="ios-link-btn" onClick={() => setActiveSheet(null)}>ปิด</button>
                  <strong style={{ fontSize: '16px' }}>ประวัติแพ้ยา & แพ้อาหาร</strong>
                  <span style={{ width: '40px' }} />
                </div>
                <div className="ios-sheet-body">
                  <div className="ios-card">
                    {drugAllergies.length === 0 ? (
                      <div className="ios-row" style={{ color: '#1E8E3E', fontSize: '14.5px' }}>
                        ไม่พบประวัติแพ้ยาในตาราง personalergic ของ JHCIS
                      </div>
                    ) : (
                      drugAllergies.map((al, i) => (
                        <div key={i} className="ios-row" style={{ color: '#D70015', fontWeight: 600 }}>
                          <i className="fa-solid fa-triangle-exclamation" />
                          <span>{al.drugname} ({al.drugcode})</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="ios-card">
                    <div className="ios-row">
                      <label className="ios-row-label" style={{ width: '90px' }}>แพ้อาหาร</label>
                      <input
                        type="text"
                        className="ios-field-input"
                        value={foodAllergy}
                        onChange={e => setFoodAllergy(e.target.value)}
                        placeholder="ระบุอาหารที่แพ้ (ถ้ามี)"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Sheet: แก้ไขวิธีใช้ยา */}
            {activeSheet === 'editDose' && editingDrugIdx !== null && drugList[editingDrugIdx] && (
              <>
                <div className="ios-sheet-header">
                  <button type="button" className="ios-link-btn" onClick={() => setActiveSheet(null)}>ปิด</button>
                  <strong style={{ fontSize: '16px' }}>วิธีใช้ยา</strong>
                  <button
                    type="button"
                    className="ios-link-btn"
                    style={{ fontWeight: 700 }}
                    onClick={() => {
                      setDrugList(prev => prev.map((x, i) => i === editingDrugIdx ? { ...x, dose: tempDoseText.trim() } : x));
                      setActiveSheet(null);
                    }}
                  >
                    เสร็จสิ้น
                  </button>
                </div>
                <div className="ios-sheet-body">
                  <div className="ios-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{drugList[editingDrugIdx].drugname}</div>
                    <textarea
                      rows={3}
                      value={tempDoseText}
                      onChange={e => setTempDoseText(e.target.value)}
                      placeholder="เช่น รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#F2F2F7', fontSize: '15px', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        'รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร',
                        'รับประทานครั้งละ 1 เม็ด วันละ 2 ครั้ง หลังอาหาร เช้า-เย็น',
                        'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง ก่อนนอน',
                        'รับประทานครั้งละ 1 เม็ด เวลาปวดหรือมีไข้ ทุก 4-6 ชม.',
                        'ทาถูนวดบริเวณที่มีอาการ วันละ 2-3 ครั้ง'
                      ].map(preset => (
                        <button key={preset} type="button" className="ios-pill" style={{ fontSize: '12px' }} onClick={() => setTempDoseText(preset)}>
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};