import React, { useState, useEffect } from 'react';
import { Home, Clock, PlusCircle, Settings, Battery, Zap, Map, Edit, Trash2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem("ev_records");
    return saved ? JSON.parse(saved) : [];
  });
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem("ev_primaryColor") || "blue");
  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem("ev_secondaryColor") || "gray");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [summaryMode, setSummaryMode] = useState("month"); 
  const [isEditing, setIsEditing] = useState(false);

  // อัปเดตฟอร์มให้ตรงกับ 7 ข้อที่ต้องการ
  const initialForm = { 
    id: '', 
    date: new Date().toISOString().slice(0, 16), 
    batteryBefore: '', 
    batteryAfter: '', 
    kwh: '',          // ข้อ 3: จำนวนไฟที่เข้าไป (kWh)
    pricePerKwh: '',  // ข้อ 4: ราคาต่อ 1 kWh
    cost: '',         // ข้อ 5: ราคารวมทั้งหมด
    distance: '',     // ข้อ 6: กม. ที่ขับได้
    batteryRemaining: '' // ข้อ 7: แบตหลังขับเหลือเท่าไร
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { localStorage.setItem("ev_records", JSON.stringify(records)); }, [records]);
  useEffect(() => { localStorage.setItem("ev_primaryColor", primaryColor); }, [primaryColor]);
  useEffect(() => { localStorage.setItem("ev_secondaryColor", secondaryColor); }, [secondaryColor]);

  const colors = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', active: 'text-blue-600', border: 'border-blue-600', hover: 'hover:bg-blue-50' },
    green: { bg: 'bg-green-600', text: 'text-green-600', active: 'text-green-600', border: 'border-green-600', hover: 'hover:bg-green-50' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', active: 'text-purple-600', border: 'border-purple-600', hover: 'hover:bg-purple-50' },
    orange: { bg: 'bg-orange-600', text: 'text-orange-600', active: 'text-orange-600', border: 'border-orange-600', hover: 'hover:bg-orange-50' },
    dark: { bg: 'bg-gray-800', text: 'text-gray-800', active: 'text-gray-800', border: 'border-gray-800', hover: 'hover:bg-gray-100' }
  };
  
  const secColors = {
    gray: 'bg-gray-100',
    brown: 'bg-stone-100',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    rose: 'bg-rose-50'
  };

  const theme = colors[primaryColor];
  const bgSec = secColors[secondaryColor];

  // ฟังก์ชันคำนวณราคาอัตโนมัติเมื่อพิมพ์ (ช่วยให้ไม่ต้องพิมพ์เองทั้งหมด)
  const handleAutoCalc = (field, value) => {
    let newData = { ...formData, [field]: value };
    
    // ถ้ารู้ kWh และ ราคารวม -> หาราคาต่อหน่วยอัตโนมัติ
    if (field === 'cost' && newData.kwh && !newData.pricePerKwh) {
      newData.pricePerKwh = (Number(value) / Number(newData.kwh)).toFixed(2);
    }
    // ถ้ารู้ ราคาต่อหน่วย และ ราคารวม -> หา kWh อัตโนมัติ
    else if (field === 'pricePerKwh' && newData.cost && !newData.kwh) {
      newData.kwh = (Number(newData.cost) / Number(value)).toFixed(2);
    }
    
    setFormData(newData);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newRecord = {
      ...formData,
      id: isEditing ? formData.id : Date.now().toString(),
      batteryBefore: Number(formData.batteryBefore),
      batteryAfter: Number(formData.batteryAfter),
      kwh: Number(formData.kwh),
      cost: Number(formData.cost),
      pricePerKwh: Number(formData.pricePerKwh),
      distance: formData.distance ? Number(formData.distance) : null,
      batteryRemaining: formData.distance && formData.batteryRemaining ? Number(formData.batteryRemaining) : null,
    };

    if (isEditing) {
      setRecords(records.map(r => r.id === formData.id ? newRecord : r));
    } else {
      setRecords([newRecord, ...records].sort((a, b) => new Date(b.date) - new Date(a.date)));
    }
    
    setFormData(initialForm);
    setIsEditing(false);
    setActiveTab("history");
  };

  const handleEdit = (record) => {
    setFormData({
      ...record,
      distance: record.distance || '',
      batteryRemaining: record.batteryRemaining !== null && record.batteryRemaining !== undefined ? record.batteryRemaining : ''
    });
    setIsEditing(true);
    setActiveTab("add");
  };

  const handleDelete = (id) => {
    if (window.confirm("ยืนยันการลบประวัตินี้?")) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const getSummaryData = () => {
    const now = new Date();
    return records.filter(r => {
      const recordDate = new Date(r.date);
      if (summaryMode === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return recordDate >= weekAgo;
      } else {
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      }
    });
  };

  const summaryData = getSummaryData();
  const totalCost = summaryData.reduce((sum, r) => sum + r.cost, 0);
  const totalKwh = summaryData.reduce((sum, r) => sum + (r.kwh || (r.cost / r.pricePerKwh)), 0);
  
  let sumDistance = 0;
  let sumActualTripCost = 0;

  summaryData.forEach(r => {
    if (r.distance) {
      sumDistance += r.distance;
      const percentAdded = r.batteryAfter - r.batteryBefore;
      
      if (r.batteryRemaining !== null && r.batteryRemaining !== undefined && percentAdded > 0) {
        const costPerPercent = r.cost / percentAdded;
        const percentUsed = r.batteryAfter - r.batteryRemaining;
        sumActualTripCost += (percentUsed * costPerPercent);
      }
    }
  });

  const avgCostPerKm = sumDistance > 0 ? (sumActualTripCost / sumDistance).toFixed(2) : "0.00";

  return (
    <div className={`h-screen w-full flex flex-col font-sans overflow-hidden ${bgSec}`}>
      <header className={`shrink-0 p-4 text-white flex items-center justify-between shadow-md z-10 w-full ${theme.bg}`}>
        <div className="flex items-center gap-2 max-w-3xl mx-auto w-full">
          <Zap size={24} />
          <h1 className="text-xl font-bold">EV Tracker</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full p-4 pb-24">
        <div className="max-w-3xl mx-auto">
          
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex bg-white rounded-lg p-1 shadow-sm">
                <button onClick={() => setSummaryMode("week")} className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${summaryMode === "week" ? `${theme.bg} text-white` : "text-gray-500"}`}>7 วันล่าสุด</button>
                <button onClick={() => setSummaryMode("month")} className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${summaryMode === "month" ? `${theme.bg} text-white` : "text-gray-500"}`}>เดือนปัจจุบัน</button>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 text-sm mb-1">ค่าชาร์จรวมจ่ายจริง</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>฿{totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 text-sm mb-1">พลังงานเข้าแบต</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{totalKwh.toFixed(1)} <span className="text-sm font-normal">kWh</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 text-sm mb-1">ระยะทางรวม</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{sumDistance.toLocaleString()} <span className="text-sm font-normal">กม.</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 text-sm mb-1">เฉลี่ยต้นทุนวิ่ง</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>฿{avgCostPerKm} <span className="text-sm font-normal">/กม.</span></p>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800">ประวัติการชาร์จ</h2>
              {records.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-xl shadow-sm text-gray-400">ยังไม่มีข้อมูลการชาร์จ</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {records.map(record => {
                    const percentAdded = record.batteryAfter - record.batteryBefore;
                    const dateObj = new Date(record.date);
                    
                    let costPerKm = null;
                    let kmPerKwh = null;
                    let usedPercent = null;

                    if (record.distance && record.batteryRemaining !== null) {
                      usedPercent = record.batteryAfter - record.batteryRemaining;
                      const costPerPercent = record.cost / percentAdded;
                      const actualTripCost = usedPercent * costPerPercent;
                      
                      // คำนวณ kWh ที่ใช้จริงในทริปนี้
                      const kwhPerPercent = record.kwh / percentAdded;
                      const usedKwh = usedPercent * kwhPerPercent;

                      costPerKm = (actualTripCost / record.distance).toFixed(2);
                      kmPerKwh = (record.distance / usedKwh).toFixed(2); // ประสิทธิภาพ km/kWh
                    }
                    
                    return (
                      <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
                        {!record.distance ? (
                          <div className={`absolute top-0 right-0 ${theme.bg} text-white text-xs px-3 py-1 rounded-bl-lg font-medium`}>รอระบุระยะทาง</div>
                        ) : (
                          <div className={`absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium flex items-center gap-1`}><CheckCircle2 size={12}/> สมบูรณ์</div>
                        )}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-gray-800">{dateObj.toLocaleDateString('th-TH')} {dateObj.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <Battery size={14} /> {record.batteryBefore}% &rarr; {record.batteryAfter}%
                            </p>
                          </div>
                          <div className="text-right mt-1">
                            <p className={`text-lg font-bold ${theme.text}`}>฿{record.cost}</p>
                            <p className="text-xs text-gray-400">{record.kwh} kWh (฿{record.pricePerKwh})</p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-4 gap-2 mt-2 items-center">
                          <div className="text-center border-r border-gray-200">
                            <p className="text-[10px] text-gray-500">ระยะทาง</p>
                            <p className="font-semibold text-gray-700 text-sm">{record.distance ? `${record.distance} กม.` : '-'}</p>
                          </div>
                          <div className="text-center border-r border-gray-200">
                            <p className="text-[10px] text-gray-500">แบตที่ใช้</p>
                            <p className="font-semibold text-gray-700 text-sm">{usedPercent ? `${usedPercent}%` : '-'}</p>
                          </div>
                          <div className="text-center border-r border-gray-200">
                            <p className="text-[10px] text-gray-500">อัตราสิ้นเปลือง</p>
                            <p className={`font-semibold text-sm ${costPerKm ? theme.text : 'text-gray-400'}`}>{costPerKm ? `฿${costPerKm}/กม.` : '-'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-500">ประสิทธิภาพ</p>
                            <p className={`font-semibold text-sm ${kmPerKwh ? 'text-green-600' : 'text-gray-400'}`}>{kmPerKwh ? `${kmPerKwh}` : '-'}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button onClick={() => handleEdit(record)} className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-sm font-medium ${theme.text} ${theme.hover} rounded-md transition-colors`}><Edit size={16}/> {record.distance ? 'แก้ไข' : 'เพิ่มข้อมูลขับขี่'}</button>
                          <button onClick={() => handleDelete(record.id)} className="flex-1 py-1.5 flex items-center justify-center gap-1 text-sm font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16}/> ลบ</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add / Edit */}
          {activeTab === "add" && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                {isEditing ? <Edit size={20} className={theme.text}/> : <PlusCircle size={20} className={theme.text}/>}
                {isEditing ? 'แก้ไข/อัปเดตข้อมูล' : 'บันทึกการชาร์จใหม่'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* โซนที่ 1: ข้อมูลตอนชาร์จ */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><Zap size={16}/> ข้อมูลตอนชาร์จไฟ</h3>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">วันที่และเวลา</label>
                    <input type="datetime-local" required className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{'--tw-ring-color': theme.bg.replace('bg-', '')}} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">1. แบตก่อนชาร์จ (%)</label>
                      <input type="number" min="0" max="100" required className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" placeholder="เช่น 20" value={formData.batteryBefore} onChange={e => setFormData({...formData, batteryBefore: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">2. แบตที่หยุดชาร์จ (%)</label>
                      <input type="number" min="0" max="100" required className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" placeholder="เช่น 80" value={formData.batteryAfter} onChange={e => setFormData({...formData, batteryAfter: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">3. ไฟเข้า (kWh)</label>
                      <input type="number" step="0.01" min="0" required className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" placeholder="kWh" value={formData.kwh} onChange={e => handleAutoCalc('kwh', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">4. ราคา/kWh</label>
                      <input type="number" step="0.01" min="0" required className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" placeholder="บาท" value={formData.pricePerKwh} onChange={e => handleAutoCalc('pricePerKwh', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">5. รวม (บาท)</label>
                      <input type="number" step="0.01" min="0" required className="w-full p-2 bg-blue-100 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 font-bold text-blue-800" placeholder="รวม" value={formData.cost} onChange={e => handleAutoCalc('cost', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* โซนที่ 2: ข้อมูลการขับขี่ */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100 mt-4">

<Map size={16}/>
<h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"> ข้อมูลการขับขี่ <span className="text-[10px] font-normal bg-gray-200 px-2 py-0.5 rounded-full ml-auto">มากรอกทีหลังได้</span></h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">6. ระยะทางที่ขับ (กม.)</label>
                      <input type="number" step="0.1" min="0" className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" placeholder="เช่น 300" value={formData.distance || ''} onChange={e => setFormData({...formData, distance: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">7. แบตที่เหลือ (%)</label>
                      <input type="number" min="0" max="100" className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2" placeholder="เช่น 25" value={formData.batteryRemaining || ''} onChange={e => setFormData({...formData, batteryRemaining: e.target.value})} required={!!formData.distance} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData(initialForm); setActiveTab("history"); }} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">ยกเลิก</button>
                  )}
                  <button type="submit" className={`flex-[2] py-3 text-white font-bold rounded-lg shadow-md transition-opacity hover:opacity-90 ${theme.bg}`}>
                    {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">เลือกสีหลัก (เมนู & ปุ่ม)</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(colors).map(colorKey => (
                    <button key={colorKey} onClick={() => setPrimaryColor(colorKey)} className={`w-12 h-12 rounded-full ${colors[colorKey].bg} ${primaryColor === colorKey ? 'ring-4 ring-offset-2 ring-gray-300 transform scale-110' : 'opacity-80'} transition-all shadow-sm`}></button>
                  ))}
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">เลือกสีพื้นหลัง (ฉากหลัง)</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(secColors).map(colorKey => (
                    <button key={colorKey} onClick={() => setSecondaryColor(colorKey)} className={`w-12 h-12 rounded-full ${secColors[colorKey]} border-2 border-gray-200 ${secondaryColor === colorKey ? 'ring-4 ring-offset-2 ring-gray-300 transform scale-110' : ''} transition-all`}></button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <nav className="shrink-0 fixed bottom-0 w-full bg-white border-t border-gray-200 z-10 pb-safe">
        <div className="flex justify-around items-center max-w-3xl mx-auto h-16">
          <button onClick={() => setActiveTab("dashboard")} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === "dashboard" ? theme.active : "text-gray-400 hover:text-gray-600"}`}>
            <Home size={22} className="mb-1" />
            <span className="text-[10px] font-medium">สรุปผล</span>
          </button>
          <button onClick={() => setActiveTab("history")} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === "history" ? theme.active : "text-gray-400 hover:text-gray-600"}`}>
            <Clock size={22} className="mb-1" />
            <span className="text-[10px] font-medium">ประวัติ</span>
          </button>
          <button onClick={() => { setActiveTab("add"); setIsEditing(false); setFormData(initialForm); }} className="flex flex-col items-center justify-center w-full h-full relative -top-3">
            <div className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg text-white ${theme.bg} transition-transform hover:scale-105`}>
              <PlusCircle size={28} />
            </div>
          </button>
          <button onClick={() => setActiveTab("settings")} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === "settings" ? theme.active : "text-gray-400 hover:text-gray-600"}`}>
            <Settings size={22} className="mb-1" />
            <span className="text-[10px] font-medium">ตั้งค่า</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
