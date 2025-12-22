import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, Printer, Target, User, BarChart3, Users, ChevronLeft, Menu, FileText, X, AlertTriangle, Save } from 'lucide-react';

export default function App() {
  // Initialisierung mit Daten aus dem LocalStorage ODER leerem Startzustand
  const [employees, setEmployees] = useState(() => {
    const savedData = localStorage.getItem('performanceGoalsData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error("Fehler beim Laden der lokalen Daten", e);
      }
    }
    // Standard: Leer, keine Beispiele
    return [{
      id: Date.now(),
      name: '',
      date: new Date().toISOString().split('T')[0],
      goals: []
    }];
  });
  
  const [activeEmployeeId, setActiveEmployeeId] = useState(() => {
    // Versuche die erste ID zu nehmen, falls Daten geladen wurden
    const savedData = localStorage.getItem('performanceGoalsData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return null; // Wird unten korrigiert falls null
  });

  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState(new Date());
  
  // State for Custom Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    type: null, 
    id: null,
    title: '',
    message: ''
  });

  const fileInputRef = useRef(null);

  // Fallback, falls activeEmployeeId null ist oder nicht existiert
  useEffect(() => {
    if ((!activeEmployeeId || !employees.find(e => e.id === activeEmployeeId)) && employees.length > 0) {
      setActiveEmployeeId(employees[0].id);
    }
  }, [employees, activeEmployeeId]);

  // --- AUTOMATISCHES SPEICHERN & WARNUNG BEIM SCHLIESSEN ---

  // 1. Speichern im LocalStorage bei jeder Änderung
  useEffect(() => {
    localStorage.setItem('performanceGoalsData', JSON.stringify(employees));
    setLastSavedTime(new Date());
  }, [employees]);

  // 2. Warnung beim Verlassen der Seite
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // Die meisten modernen Browser zeigen einen generischen Standardtext an,
      // aber das Setzen von returnValue ist notwendig, um den Dialog auszulösen.
      e.returnValue = 'Sie haben ungespeicherte Daten. Möchten Sie wirklich gehen?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Helper to get current employee
  const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

  // --- Modal Helpers ---
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' });
  };

  const showToastError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000); 
  };

  // --- Employee Management ---

  const addEmployee = () => {
    const newId = Date.now();
    const newEmployee = {
      id: newId,
      name: '',
      date: new Date().toISOString().split('T')[0],
      goals: []
    };
    setEmployees([...employees, newEmployee]);
    setActiveEmployeeId(newId);
    if (window.innerWidth < 768) setIsSidebarOpen(true);
  };

  const initiateDeleteEmployee = (e, id) => {
    e.stopPropagation();
    if (employees.length === 1) {
      showToastError("Es muss mindestens ein Mitarbeiter vorhanden sein.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'employee',
      id: id,
      title: 'Mitarbeiter löschen?',
      message: 'Möchten Sie diesen Mitarbeiter und alle seine Ziele wirklich unwiderruflich löschen?'
    });
  };

  const updateActiveEmployee = (field, value) => {
    setEmployees(employees.map(emp => 
      emp.id === activeEmployeeId ? { ...emp, [field]: value } : emp
    ));
  };

  // --- Goal Management ---

  const addGoal = () => {
    const newGoal = {
      id: Date.now(),
      title: '',
      description: '',
      progress: 0
    };
    
    const updatedGoals = [...(activeEmployee.goals || []), newGoal];
    updateActiveEmployee('goals', updatedGoals);
  };

  const initiateDeleteGoal = (goalId) => {
    setConfirmModal({
      isOpen: true,
      type: 'goal',
      id: goalId,
      title: 'Ziel löschen?',
      message: 'Möchten Sie dieses Ziel wirklich entfernen?'
    });
  };

  const updateGoal = (goalId, field, value) => {
    const updatedGoals = activeEmployee.goals.map(g => 
      g.id === goalId ? { ...g, [field]: value } : g
    );
    updateActiveEmployee('goals', updatedGoals);
  };

  // --- Execution of Deletion ---
  const executeDelete = () => {
    if (confirmModal.type === 'employee') {
      const newEmployees = employees.filter(emp => emp.id !== confirmModal.id);
      setEmployees(newEmployees);
      if (activeEmployeeId === confirmModal.id) {
        setActiveEmployeeId(newEmployees[0].id);
      }
    } else if (confirmModal.type === 'goal') {
      const updatedGoals = activeEmployee.goals.filter(g => g.id !== confirmModal.id);
      updateActiveEmployee('goals', updatedGoals);
    }
    closeConfirmModal();
  };

  // --- Export / Import ---

  const handleExport = () => {
    const dataToSave = { version: 2, employees };
    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = `Zielvereinbarungen_Alle_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

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
          let newEmployees = [];
          if (Array.isArray(parsed.employees)) {
            newEmployees = parsed.employees;
          } else if (parsed.goals) {
             newEmployees = [{
               id: Date.now(),
               name: parsed.employeeName || 'Importiert',
               date: parsed.date || new Date().toISOString().split('T')[0],
               goals: parsed.goals || []
             }];
          }

          if (newEmployees.length > 0) {
            setEmployees(newEmployees);
            setActiveEmployeeId(newEmployees[0].id);
            setIsSidebarOpen(true);
          } else {
            showToastError('Keine gültigen Daten gefunden.');
          }
        } catch (error) {
          showToastError('Fehler beim Laden der Datei.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = null;
  };

  const triggerImport = () => {
    fileInputRef.current.click();
  };

  // --- Print Handler ---

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      showToastError('Drucken wird nicht unterstützt. Bitte nutzen Sie Strg + P');
    }
  };

  // --- Helpers ---

  const getProgressColor = (percent) => {
    if (percent < 30) return 'bg-red-500';
    if (percent < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const averageProgress = activeEmployee.goals && activeEmployee.goals.length > 0 
    ? Math.round(activeEmployee.goals.reduce((acc, curr) => acc + curr.progress, 0) / activeEmployee.goals.length) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col md:flex-row relative overflow-x-hidden print:overflow-visible print:h-auto">
      
      {/* Sidebar */}
      <div 
        className={`bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 print:hidden z-20 shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? 'w-full md:w-80 opacity-100' : 'w-0 opacity-0 md:w-0'
        }`}
      >
        <div className="min-w-[20rem] flex flex-col h-full"> 
          <div className="p-6 border-b border-slate-700">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                onClick={triggerImport}
                className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium border border-slate-700"
              >
                <Upload className="w-4 h-4" /> Import
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            
            {/* Last Saved Indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Save className="w-3 h-3" />
                <span>Gespeichert im Browser: {lastSavedTime.toLocaleTimeString()}</span>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 pl-2">Mitarbeiter Liste</div>
            {employees.map(emp => (
              <div 
                key={emp.id}
                onClick={() => setActiveEmployeeId(emp.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  activeEmployeeId === emp.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    activeEmployeeId === emp.id ? 'bg-white/20' : 'bg-slate-700'
                  }`}>
                    {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="truncate">
                    <div className="font-medium truncate">{emp.name || 'Ohne Namen'}</div>
                    <div className={`text-xs ${activeEmployeeId === emp.id ? 'text-blue-200' : 'text-slate-500'}`}>
                      {emp.goals?.length || 0} Ziele
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => initiateDeleteEmployee(e, emp.id)}
                  className={`p-1.5 rounded-md transition-opacity ${
                    activeEmployeeId === emp.id 
                      ? 'hover:bg-blue-500 text-blue-200 hover:text-white' 
                      : 'hover:bg-slate-700 text-slate-500 hover:text-red-400'
                  }`}
                  title="Mitarbeiter löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-900">
            <button 
              onClick={addEmployee}
              className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-400 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Mitarbeiter hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-screen p-4 md:p-8 md:pb-20 print:h-auto print:overflow-visible print:p-0 transition-all duration-300">
        
        {/* Top Bar */}
        <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 print:hidden">
           <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title={isSidebarOpen ? "Menü einklappen" : "Menü öffnen"}
           >
             {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
             <span className="text-sm font-medium hidden sm:inline">{isSidebarOpen ? 'Einklappen' : 'Mitarbeiter'}</span>
           </button>

           <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Drucken
          </button>
        </div>

        {/* Notifications */}
        {showSaveMessage && (
          <div className="fixed top-4 right-4 bg-green-100 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border border-green-200 z-50 animate-bounce font-medium">
            <Download className="w-4 h-4" />
            Export erfolgreich!
          </div>
        )}

        {errorMessage && (
           <div className="fixed top-4 right-4 bg-red-100 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border border-red-200 z-50 animate-pulse font-medium">
            <AlertTriangle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{confirmModal.title}</h3>
                  <button onClick={closeConfirmModal} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-slate-600 mb-6">{confirmModal.message}</p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={closeConfirmModal}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  >
                    Abbrechen
                  </button>
                  <button 
                    onClick={executeDelete}
                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Sheet */}
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
          
          <div className="bg-slate-800 text-white p-8 print:bg-white print:text-black print:border-b-2 print:border-black">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-1 uppercase tracking-wider print:text-slate-600">Mitarbeiter Name</label>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-300 print:text-slate-800" />
                  <input 
                    type="text" 
                    value={activeEmployee.name}
                    onChange={(e) => updateActiveEmployee('name', e.target.value)}
                    placeholder="Name eingeben"
                    className="bg-transparent border-b border-slate-500 w-full focus:outline-none focus:border-blue-400 text-2xl font-medium placeholder-slate-500 print:text-black print:border-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1 uppercase tracking-wider print:text-slate-600">Datum</label>
                <input 
                  type="date" 
                  value={activeEmployee.date}
                  onChange={(e) => updateActiveEmployee('date', e.target.value)}
                  className="bg-transparent border-b border-slate-500 w-full focus:outline-none focus:border-blue-400 text-xl print:text-black print:border-black"
                />
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-slate-700/50 rounded-lg flex items-center justify-between border border-slate-600 print:bg-slate-100 print:text-black print:border-slate-300">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-400 print:text-black" />
                <span className="font-medium">Gesamtzielerreichung</span>
              </div>
              <div className="text-3xl font-bold text-blue-300 print:text-black">{averageProgress}%</div>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white min-h-[500px]">
            {activeEmployee.goals && activeEmployee.goals.map((goal, index) => (
              <div key={goal.id} className="relative group border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-slate-50/30 print:bg-white print:border-slate-300 print:break-inside-avoid">
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="bg-slate-800 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 print:bg-slate-200 print:text-black">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={goal.title}
                      onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                      placeholder="Ziel Titel"
                      className="font-bold text-xl text-slate-800 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full mr-2 placeholder-slate-400"
                    />
                  </div>
                  <button 
                    onClick={() => initiateDeleteGoal(goal.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors print:hidden"
                    title="Ziel löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="pl-12 mb-6">
                  <label className="block text-xs text-slate-400 mb-1 uppercase font-semibold">Beschreibung / Maßnahmen</label>
                  <textarea
                    value={goal.description}
                    onChange={(e) => updateGoal(goal.id, 'description', e.target.value)}
                    placeholder="Beschreiben Sie das Ziel..."
                    className="w-full bg-transparent text-slate-600 resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded p-2 -ml-2 transition-all min-h-[60px]"
                  />
                </div>

                <div className="pl-12">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-medium text-slate-700">Erreichung</label>
                    <div className="flex items-center gap-2 print:hidden">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={goal.progress}
                        onChange={(e) => updateGoal(goal.id, 'progress', Number(e.target.value))}
                        className="w-16 text-right border rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                    <span className="hidden print:block font-bold text-lg">{goal.progress}%</span>
                  </div>

                  <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${getProgressColor(goal.progress)}`}
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    onChange={(e) => updateGoal(goal.id, 'progress', Number(e.target.value))}
                    className="w-full mt-4 h-2 bg-transparent appearance-none cursor-pointer print:hidden accent-slate-800"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addGoal}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 print:hidden"
            >
              <Plus className="w-5 h-5" />
              Neues Ziel hinzufügen
            </button>
            
            {(!activeEmployee.goals || activeEmployee.goals.length === 0) && (
              <div className="text-center text-slate-400 py-10 print:hidden">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Keine Ziele definiert</p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-12 border-t border-slate-200 text-sm text-slate-500 hidden print:block">
             <div className="grid grid-cols-2 gap-20 mt-8">
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-black mb-1">Mitarbeiter</p>
                  <p>Datum, Unterschrift</p>
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-black mb-1">Vorgesetzter</p>
                  <p>Datum, Unterschrift</p>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          @page { margin: 0.5cm; }
          body { 
            -webkit-print-color-adjust: exact; 
            overflow: visible !important;
            height: auto !important;
          }
          /* Fix for scrolling content cutting off in print */
          #root, div {
             overflow: visible !important;
             height: auto !important;
          }
          input, textarea {
             border: none !important;
             background: transparent !important;
             padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}