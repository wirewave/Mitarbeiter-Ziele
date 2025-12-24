import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, Printer, Target, User, BarChart3, ChevronLeft, ChevronRight, Menu, X, AlertTriangle, Save, Briefcase, FileText } from 'lucide-react';

// --- HELPER FUNCTIONS ---
// Farbskala von Rot (niedrig) nach Grün (hoch)
const getProgressColor = (progress) => {
  if (progress < 25) return 'bg-red-500';      // Rot
  if (progress < 50) return 'bg-orange-500';   // Orange
  if (progress < 75) return 'bg-yellow-500';   // Gelb
  if (progress < 90) return 'bg-green-400';    // Hellgrün
  return 'bg-emerald-600';                     // Dunkelgrün
};

export default function App() {
  // --- STATE MANAGEMENT ---
  const [employees, setEmployees] = useState(() => {
    const savedData = localStorage.getItem('performanceGoalsData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Fehler beim Laden der lokalen Daten", e);
      }
    }
    return [{
      id: Date.now(),
      name: '',
      date: new Date().toISOString().split('T')[0],
      goals: []
    }];
  });
  
  const [activeEmployeeId, setActiveEmployeeId] = useState(() => {
    const savedData = localStorage.getItem('performanceGoalsData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return null;
  });

  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(new Date());
  
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, type: null, id: null, title: '', message: '' 
  });

  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Fallback für aktive ID
  useEffect(() => {
    if ((!activeEmployeeId || !employees.find(e => e.id === activeEmployeeId)) && employees.length > 0) {
      setActiveEmployeeId(employees[0].id);
    }
  }, [employees, activeEmployeeId]);

  // Speichern
  useEffect(() => {
    localStorage.setItem('performanceGoalsData', JSON.stringify(employees));
    setLastSavedTime(new Date());
  }, [employees]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Ungespeicherte Änderungen.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0] || { goals: [], name: '', date: '' };

  // --- ACTIONS ---

  const closeConfirmModal = () => setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' });
  
  const showToastError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000); 
  };

  const addEmployee = () => {
    const newId = Date.now();
    const newEmployee = { id: newId, name: '', date: new Date().toISOString().split('T')[0], goals: [] };
    setEmployees([...employees, newEmployee]);
    setActiveEmployeeId(newId);
    setIsSidebarOpen(true);
  };

  const initiateDeleteEmployee = (e, id) => {
    e.stopPropagation();
    if (employees.length === 1) { showToastError("Mindestens ein Mitarbeiter erforderlich."); return; }
    setConfirmModal({ isOpen: true, type: 'employee', id, title: 'Mitarbeiter löschen?', message: 'Wirklich unwiderruflich löschen?' });
  };

  const updateActiveEmployee = (field, value) => {
    setEmployees(employees.map(emp => emp.id === activeEmployeeId ? { ...emp, [field]: value } : emp));
  };

  const addGoal = () => {
    const newGoal = { id: Date.now(), title: '', description: '', progress: 0 };
    updateActiveEmployee('goals', [...(activeEmployee.goals || []), newGoal]);
    
    // Scroll to the new goal (second to last item, since "Add New" is last)
    setTimeout(() => {
        if (scrollContainerRef.current) {
            // Ungefähre Position berechnen (Breite Karte + Gap) * Anzahl Ziele
            const cardWidth = 600; 
            const gap = 32; // gap-8 = 32px
            const targetIndex = (activeEmployee.goals?.length || 0); // Index of new goal
            const scrollPos = targetIndex * (cardWidth + gap);
            
            scrollContainerRef.current.scrollTo({
                left: scrollPos,
                behavior: 'smooth'
            });
        }
    }, 100);
  };

  const initiateDeleteGoal = (goalId) => {
    setConfirmModal({ isOpen: true, type: 'goal', id: goalId, title: 'Ziel löschen?', message: 'Ziel wirklich entfernen?' });
  };

  const updateGoal = (goalId, field, value) => {
    const updatedGoals = activeEmployee.goals.map(g => g.id === goalId ? { ...g, [field]: value } : g);
    updateActiveEmployee('goals', updatedGoals);
  };

  const scrollLeft = () => { if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: -632, behavior: 'smooth' }); };
  const scrollRight = () => { if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: 632, behavior: 'smooth' }); };

  const executeDelete = () => {
    if (confirmModal.type === 'employee') {
      const newEmployees = employees.filter(emp => emp.id !== confirmModal.id);
      setEmployees(newEmployees);
      if (activeEmployeeId === confirmModal.id) setActiveEmployeeId(newEmployees[0].id);
    } else if (confirmModal.type === 'goal') {
      updateActiveEmployee('goals', activeEmployee.goals.filter(g => g.id !== confirmModal.id));
    }
    closeConfirmModal();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ version: 2, employees }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Zielvereinbarungen_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 2000);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const newEmps = Array.isArray(parsed.employees) ? parsed.employees : (parsed.goals ? [{ id: Date.now(), name: parsed.employeeName || 'Importiert', date: parsed.date || '', goals: parsed.goals }] : []);
          if (newEmps.length) { setEmployees(newEmps); setActiveEmployeeId(newEmps[0].id); setIsSidebarOpen(true); } 
          else showToastError('Keine gültigen Daten.');
        } catch { showToastError('Fehler beim Laden.'); }
      };
      reader.readAsText(file);
    }
    event.target.value = null;
  };

  const handlePrint = () => { try { window.print(); } catch { showToastError('Nutzen Sie Strg + P'); } };
  
  const averageProgress = activeEmployee.goals?.length ? Math.round(activeEmployee.goals.reduce((acc, c) => acc + c.progress, 0) / activeEmployee.goals.length) : 0;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 relative overflow-x-hidden print:overflow-visible print:bg-white print:text-black">
      
      {/* --- BACKDROP --- */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity duration-300 print:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* --- SIDEBAR --- */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-slate-900 text-slate-300 z-40 shadow-2xl transform transition-transform duration-300 ease-out print:hidden flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-950">
          <h2 className="text-white font-bold text-lg">Mitarbeiter</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {employees.map(emp => (
            <div 
              key={emp.id}
              onClick={() => { setActiveEmployeeId(emp.id); setIsSidebarOpen(false); }}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${activeEmployeeId === emp.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activeEmployeeId === emp.id ? 'bg-white/20' : 'bg-slate-700'}`}>
                  {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="truncate">
                  <div className="font-medium truncate">{emp.name || 'Ohne Namen'}</div>
                  <div className={`text-xs ${activeEmployeeId === emp.id ? 'text-blue-200' : 'text-slate-500'}`}>{emp.goals?.length || 0} Ziele</div>
                </div>
              </div>
              <button
                onClick={(e) => initiateDeleteEmployee(e, emp.id)}
                className={`p-1.5 rounded-md transition-opacity ${activeEmployeeId === emp.id ? 'hover:bg-blue-500 text-blue-200 hover:text-white' : 'hover:bg-slate-700 text-slate-500 hover:text-red-400'}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-950 space-y-4">
          <button onClick={addEmployee} className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-400 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Neuer Mitarbeiter
          </button>
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium border border-slate-700 transition-colors">
              <Upload className="w-3 h-3" /> Import
            </button>
            <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
             <Save className="w-3 h-3" /> Auto-Save: {lastSavedTime.toLocaleTimeString()}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden"/>
        </div>
      </div>

      {/* --- MAIN AREA --- */}
      <div className="min-h-screen p-4 md:p-8 md:pb-20 print:p-0 print:min-h-0">
        
        {/* Top Bar */}
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 print:hidden sticky top-4 z-20">
           <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-3 px-4 py-2.5 bg-white text-slate-700 hover:text-blue-600 shadow-sm hover:shadow-md rounded-xl transition-all border border-slate-100 group"
           >
             <Menu className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
             <span className="font-semibold">Mitarbeiter</span>
             <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{employees.length}</span>
           </button>

           <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all font-medium"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Drucken</span>
          </button>
        </div>

        {/* Notifications */}
        {showSaveMessage && <div className="fixed top-20 right-8 bg-green-100 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border border-green-200 z-50 animate-bounce font-medium print:hidden"><Download className="w-4 h-4" /> Exportiert!</div>}
        {errorMessage && <div className="fixed top-20 right-8 bg-red-100 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border border-red-200 z-50 animate-pulse font-medium print:hidden"><AlertTriangle className="w-4 h-4" /> {errorMessage}</div>}
        
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform scale-100">
              <div className="flex justify-between mb-4"><h3 className="text-lg font-bold">{confirmModal.title}</h3><button onClick={closeConfirmModal}><X className="w-5 h-5"/></button></div>
              <p className="text-slate-600 mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-3"><button onClick={closeConfirmModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button><button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center gap-2"><Trash2 className="w-4 h-4"/> Löschen</button></div>
            </div>
          </div>
        )}

        {/* --- DOCUMENT CONTAINER --- */}
        <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
          
          {/* Header Section */}
          <div className="bg-slate-800 text-white p-10 print:bg-white print:text-black print:p-0 print:mb-12 print:border-b-4 print:border-slate-800">
            {/* Print Only Modern Header */}
            <div className="hidden print:flex justify-between items-start mb-8">
               <div>
                  <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 leading-none">Jahresziele</h1>
                  <p className="text-slate-500 font-medium text-sm mt-1">Zielvereinbarung & Leistungsbeurteilung</p>
               </div>
               
               {/* KPI Box for Print */}
               <div className="bg-slate-100 p-4 rounded-lg text-right min-w-[150px]">
                  <div className="text-xs uppercase font-bold text-slate-500 mb-1">Gesamt</div>
                  <div className="text-3xl font-black text-slate-900">{averageProgress}%</div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-12">
              <div>
                <label className="block text-slate-400 text-sm mb-2 uppercase tracking-wider print:text-slate-500 font-bold print:text-[10px] print:mb-1">Mitarbeiter</label>
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-slate-400 print:hidden" />
                  <input 
                    type="text" 
                    value={activeEmployee.name}
                    onChange={(e) => updateActiveEmployee('name', e.target.value)}
                    placeholder="Name eingeben"
                    className="bg-transparent border-b-2 border-slate-600 w-full focus:outline-none focus:border-blue-400 text-3xl font-medium placeholder-slate-600/50 print:text-slate-900 print:border-none print:p-0 print:font-bold print:text-xl print:placeholder-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2 uppercase tracking-wider print:text-slate-500 font-bold print:text-[10px] print:mb-1">Datum</label>
                <div className="flex gap-3 items-center">
                    <Briefcase className="w-6 h-6 text-slate-400 print:hidden" />
                    <input 
                      type="date" 
                      value={activeEmployee.date}
                      onChange={(e) => updateActiveEmployee('date', e.target.value)}
                      className="bg-transparent border-b-2 border-slate-600 w-full focus:outline-none focus:border-blue-400 text-2xl print:text-slate-900 print:border-none print:p-0 print:text-xl print:font-medium"
                    />
                </div>
              </div>
            </div>
            
            {/* Screen-Only KPI Box */}
            <div className="mt-10 p-5 bg-slate-700/50 rounded-xl flex items-center justify-between border border-slate-600/50 print:hidden">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg"><BarChart3 className="w-6 h-6 text-blue-400" /></div>
                <span className="font-medium text-lg">Gesamtzielerreichung</span>
              </div>
              <div className="text-4xl font-bold text-blue-300 tracking-tight">{averageProgress}%</div>
            </div>
          </div>

          <div className="p-10 bg-slate-50 min-h-[600px] print:p-0 print:bg-white print:min-h-0">
             
             {/* HEADER FOR GOALS (Desktop) - Button Removed */}
             <div className="flex justify-between items-center mb-6 print:hidden">
                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" /> 
                    Ziele ({activeEmployee.goals?.length || 0})
                </h3>
             </div>

             {/* CAROUSEL SECTION */}
             <div className="relative group/carousel">
                 {/* Navigation Arrows */}
                 <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 bg-white shadow-xl border border-slate-100 p-3 rounded-full text-slate-600 hover:text-blue-600 hover:scale-110 transition-all hidden md:flex items-center justify-center print:hidden">
                    <ChevronLeft className="w-6 h-6" />
                 </button>
                 <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 bg-white shadow-xl border border-slate-100 p-3 rounded-full text-slate-600 hover:text-blue-600 hover:scale-110 transition-all hidden md:flex items-center justify-center print:hidden">
                    <ChevronRight className="w-6 h-6" />
                 </button>

                 {/* Scroll Container */}
                 <div 
                    ref={scrollContainerRef}
                    // WICHTIG: md:px-[calc(50%-300px)] zentriert die 600px breiten Karten
                    className="flex overflow-x-auto gap-8 pb-8 snap-x snap-mandatory scrollbar-hide print:block print:overflow-visible print:pb-0 px-4 md:px-[calc(50%-300px)]"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                 >
                    {activeEmployee.goals && activeEmployee.goals.map((goal, index) => (
                      <div key={goal.id} className="min-w-[90%] md:w-[600px] flex-shrink-0 relative group border border-slate-200 rounded-2xl p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all bg-white snap-center print:w-full print:mb-8 print:border-0 print:border-b print:border-slate-200 print:shadow-none print:rounded-none print:p-0 print:pb-8 print:break-inside-avoid">
                        
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-6 print:mb-2">
                          <div className="flex items-center gap-5 w-full print:gap-4 print:items-baseline">
                            <div className="bg-slate-900 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 print:bg-transparent print:text-slate-400 print:w-auto print:h-auto print:text-sm print:font-mono">
                              {(index + 1).toString().padStart(2, '0')}.
                            </div>
                            <input
                              type="text"
                              value={goal.title}
                              onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                              placeholder="Titel des Ziels"
                              className="font-bold text-xl md:text-2xl text-slate-800 bg-transparent border-b-2 border-transparent focus:border-blue-500 focus:outline-none w-full mr-2 placeholder-slate-300 py-1 transition-all print:text-slate-900 print:text-lg print:font-bold print:p-0"
                            />
                          </div>
                          <button onClick={() => initiateDeleteGoal(goal.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all print:hidden opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
                        </div>

                        {/* Description */}
                        <div className="pl-16 mb-8 print:pl-10 print:mb-4">
                          <label className="block text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider print:hidden">Beschreibung</label>
                          <textarea
                            value={goal.description}
                            onChange={(e) => updateGoal(goal.id, 'description', e.target.value)}
                            placeholder="Beschreiben Sie das Ziel ausführlich..."
                            className="w-full bg-slate-50 text-slate-700 text-lg leading-relaxed resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-4 transition-all min-h-[160px] print:bg-transparent print:p-0 print:min-h-0 print:text-sm print:text-slate-700 print:leading-relaxed print:h-auto"
                          />
                        </div>

                        {/* Footer / Progress */}
                        <div className="pl-16 mt-auto print:pl-10">
                          <div className="flex justify-between items-end mb-3 print:mb-1">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider print:text-[10px] print:text-slate-500">Zielerreichung</label>
                            
                            <span className="font-bold text-xl print:text-sm print:text-slate-900">{goal.progress}%</span>
                          </div>

                          {/* Interactive Slider for Desktop / Visual Bar for Print */}
                          <div className="relative h-10 flex items-center mt-2 select-none print:hidden">
                            {/* Background Track */}
                            <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden"></div>
                            {/* Colored Fill - NO transition while dragging to prevent lag */}
                            <div 
                                className={`absolute h-3 rounded-full ${getProgressColor(goal.progress)}`} 
                                style={{ width: `${goal.progress}%` }}
                            ></div>
                            {/* Thumb / Knob (Visual only) - NO transition for instant response */}
                            <div 
                                className="absolute h-6 w-6 bg-white border-2 border-slate-200 shadow-md rounded-full flex items-center justify-center"
                                style={{ 
                                    left: `calc(${goal.progress}% - 12px)`
                                }}
                            >
                                <div className={`w-2 h-2 rounded-full ${getProgressColor(goal.progress)}`}></div>
                            </div>
                            {/* Invisible Interactive Input */}
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={goal.progress} 
                                onChange={(e) => updateGoal(goal.id, 'progress', Number(e.target.value))} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            />
                          </div>

                          {/* Print Version Bar (Clean & Thin) */}
                          <div className="hidden print:block relative h-1.5 bg-slate-100 rounded-full overflow-hidden w-full mt-1">
                            <div className={`absolute top-0 left-0 h-full ${getProgressColor(goal.progress)} print:bg-slate-800`} style={{ width: `${goal.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Goal Card (Inline) */}
                    <button
                        onClick={addGoal}
                        className="min-w-[90%] md:w-[300px] flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-500 hover:bg-blue-50 transition-all snap-center group print:hidden min-h-[400px]"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 group-hover:scale-110 transition-all">
                            <Plus className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="font-bold text-slate-500 group-hover:text-blue-600 text-lg">Neues Ziel</span>
                    </button>

                    {/* Spacer for right padding */}
                    <div className="w-4 flex-shrink-0 print:hidden"></div>
                 </div>
             </div>
          </div>
          
          {/* Signature Footer */}
          <div className="bg-slate-50 p-16 border-t border-slate-200 text-sm text-slate-500 hidden print:block print:bg-white print:p-0 print:mt-16 print:border-none">
             <div className="grid grid-cols-2 gap-16 mt-8">
                <div>
                  <div className="border-t border-slate-400 pt-2 w-full"></div>
                  <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">Mitarbeiter</p>
                  <p className="text-[10px] text-slate-500">Ort, Datum, Unterschrift</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2 w-full"></div>
                  <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">Vorgesetzter</p>
                  <p className="text-[10px] text-slate-500">Ort, Datum, Unterschrift</p>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* GLOBAL STYLES */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Print Optimization */
        @media print {
          @page { margin: 15mm; size: A4; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            overflow: visible !important; 
            height: auto !important; 
            background: white !important;
            font-size: 10pt;
            color: #0f172a;
          }
          /* Reset React Root Layout */
          #root, .min-h-screen { 
            overflow: visible !important; 
            height: auto !important; 
            display: block !important;
          }
          /* Reset Inputs */
          input, textarea { 
            border: none !important; 
            background: transparent !important; 
            padding: 0 !important; 
            resize: none !important;
          }
          /* Hide Scroll Areas */
          .overflow-x-auto {
            overflow: visible !important;
            display: block !important;
          }
          /* Layout Resets */
          .flex-shrink-0 { flex-shrink: 1 !important; }
          .w-screen { width: auto !important; }
        }
      `}</style>
    </div>
  );
}