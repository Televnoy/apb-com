const { useState, useEffect, useRef } = React;

// Адаптация иконок Lucide для браузерной среды
const { 
    Trash2, X, Plus, Camera, RotateCw, Paperclip, ChevronDown, Send, Lock, User, MapPin, CheckCircle2, AlertCircle 
} = (() => {
    const Icon = (name) => (props) => (
        <svg 
            width={props.size || 24} 
            height={props.size || 24} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={props.className}
            onClick={props.onClick}
        >
            <use href={`#lucide-${name.toLowerCase()}`} />
        </svg>
    );
    return {
        Trash2: Icon('trash-2'), X: Icon('x'), Plus: Icon('plus'), Camera: Icon('camera'),
        RotateCw: Icon('rotate-cw'), Paperclip: Icon('paperclip'), ChevronDown: Icon('chevron-down'),
        Send: Icon('send'), Lock: Icon('lock'), User: Icon('user'), MapPin: Icon('map-pin'),
        CheckCircle2: Icon('check-circle'), AlertCircle: Icon('alert-circle')
    };
})();

const App = () => {
    // --- Состояние Авторизации ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authStep, setAuthStep] = useState(1); 
    const [tempJudgeName, setTempJudgeName] = useState('');
    const [selectedCity, setSelectedCity] = useState('Москва');
    const [isCityOpen, setIsCityOpen] = useState(false);
    const [accessKey, setAccessKey] = useState('');
    const [authError, setAuthError] = useState('');

    // --- Состояние Основного Приложения ---
    const [judgeName, setJudgeName] = useState('');
    const [eventCity, setEventCity] = useState('');
    const [discipline, setDiscipline] = useState('ДРЕДЫ');
    const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
    
    const [allData, setAllData] = useState({});
    const [submittedDisciplines, setSubmittedDisciplines] = useState([]);
    
    const [openSelect, setOpenSelect] = useState({ id: null, type: null });
    const [fullscreenNote, setFullscreenNote] = useState(null); 
    const [toast, setToast] = useState(null);
    
    // --- Состояние Камеры ---
    const [activeCamera, setActiveCamera] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);

    const cities = ['Москва', 'Пермь', 'Екатеринбург'];
    const disciplines = ['ДРЕДЫ', 'КОСЫ', 'БРЕЙДЫ', 'ПРИЧЕСКИ'];
    const participantNumbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

    // --- Эффекты сохранения данных ---
    useEffect(() => {
        const saved = localStorage.getItem('judging_app_v2_data');
        const savedSubmitted = localStorage.getItem('judging_app_v2_submitted');
        const expiry = localStorage.getItem('judging_app_v2_expiry');

        if (expiry && Date.now() > parseInt(expiry)) {
            localStorage.clear();
        } else {
            if (saved) setAllData(JSON.parse(saved));
            if (savedSubmitted) setSubmittedDisciplines(JSON.parse(savedSubmitted));
        }
    }, []);

    useEffect(() => {
        if (Object.keys(allData).length > 0 || submittedDisciplines.length > 0) {
            localStorage.setItem('judging_app_v2_data', JSON.stringify(allData));
            localStorage.setItem('judging_app_v2_submitted', JSON.stringify(submittedDisciplines));
            localStorage.setItem('judging_app_v2_expiry', (Date.now() + 86400000).toString());
        }
    }, [allData, submittedDisciplines]);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    };

    const participants = allData[discipline] || [{ id: '1', number: '00', comment: '', photos: [], score: null }];
    const isCurrentSubmitted = submittedDisciplines.includes(discipline);
    const allOccupiedNumbers = Object.values(allData).flat().map(p => p.number);
    const occupiedScores = participants.map(p => p.score).filter(s => s !== null);

    const setParticipants = (newParticipants) => {
        if (isCurrentSubmitted) return;
        const updater = typeof newParticipants === 'function' ? newParticipants(participants) : newParticipants;
        setAllData(prev => ({ ...prev, [discipline]: updater }));
    };

    const handleSendReport = () => {
        if (!isReadyToSave || isCurrentSubmitted) return;
        setSubmittedDisciplines(prev => [...prev, discipline]);
    };

    const getAvailableScores = () => Array.from({ length: participants.length || 1 }, (_, i) => 30 - i);
    const availableScores = getAvailableScores();

    const handleLogin = () => {
        if (accessKey === '1111') {
            setJudgeName(tempJudgeName);
            setEventCity(selectedCity);
            setIsAuthenticated(true);
        } else {
            setAuthError('Неверный ключ доступа');
        }
    };

    // --- Логика Камеры ---
    const startCamera = async (id) => {
        if (isCurrentSubmitted) return;
        setActiveCamera(id);
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            const constraints = {
                video: { facingMode: { ideal: facingMode }, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 0.5625 } },
                audio: false
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            setActiveCamera(null);
        }
    };

    const takePhoto = () => {
        if (!videoRef.current || isCurrentSubmitted) return;
        const canvas = document.createElement('canvas');
        const v = videoRef.current;
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
        setParticipants(prev => prev.map(p => p.id === activeCamera ? { ...p, photos: [...p.photos, photoUrl] } : p));
        stopCamera();
    };

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setActiveCamera(null);
    };

    const toggleFacingMode = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        if (activeCamera) startCamera(activeCamera);
    };

    const handleGalleryUpload = (id, e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setParticipants(prev => prev.map(p => p.id === id ? { ...p, photos: [...p.photos, reader.result] } : p));
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const addParticipant = () => {
        if (isCurrentSubmitted) return;
        setParticipants([...participants, { id: Date.now().toString(), number: '00', comment: '', photos: [], score: null }]);
    };

    const updateParticipant = (id, field, value) => {
        if (isCurrentSubmitted) return;
        if (field === 'score' && value !== null && occupiedScores.includes(value)) {
            showToast('Оценка уже присвоена');
            return;
        }
        if (field === 'number' && value !== '00' && allOccupiedNumbers.includes(value)) {
            showToast('ID уже используется');
            return;
        }
        setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
        setOpenSelect({ id: null, type: null });
    };

    const isReadyToSave = participants.length > 0 && participants.every(p => p.score !== null);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 font-['Inter']">
                <div className="w-full max-w-sm space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight uppercase">Авторизация</h1>
                        <p className="text-[12px] text-gray-400 uppercase tracking-widest">Судейская панель</p>
                    </div>
                    <div className="bg-[#F9F9F9] rounded-3xl p-8 border border-[#EEE] space-y-6">
                        {authStep === 1 ? (
                            <>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <input type="text" placeholder="Имя судьи" value={tempJudgeName} onChange={(e) => setTempJudgeName(e.target.value)} className="w-full bg-transparent border-b border-gray-200 py-3 pl-8 text-[14px] outline-none" />
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <button onClick={() => setIsCityOpen(!isCityOpen)} className="w-full bg-transparent border-b border-gray-200 py-3 pl-8 text-[14px] text-left outline-none flex justify-between items-center">
                                            <span>{selectedCity}</span>
                                            <ChevronDown size={14} className={`text-gray-300 transition-transform ${isCityOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isCityOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#EEE] shadow-xl rounded-xl py-1 z-50 overflow-hidden">
                                                {cities.map(c => (
                                                    <button key={c} onClick={() => { setSelectedCity(c); setIsCityOpen(false); }} className="w-full px-5 py-3 text-left hover:bg-[#F5F5F5] text-[13px] font-medium transition-colors">{c}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setAuthStep(2)} disabled={!tempJudgeName} className="w-full bg-black text-white rounded-full py-4 text-[12px] font-bold uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-30">Далее</button>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input type="password" placeholder="Ключ доступа" autoFocus value={accessKey} onChange={(e) => setAccessKey(e.target.value)} className="w-full bg-transparent border-b border-gray-200 py-3 pl-8 text-[14px] tracking-widest outline-none" />
                                </div>
                                {authError && <p className="text-red-500 text-[10px] text-center uppercase font-bold">{authError}</p>}
                                <button onClick={handleLogin} className="w-full bg-black text-white rounded-full py-4 text-[12px] font-bold uppercase tracking-widest active:scale-95 transition-transform">Войти</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9] text-[#2C2C2C] pb-48 font-['Inter'] relative">
            {toast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in">
                    <AlertCircle size={18} />
                    <span className="text-[12px] font-bold uppercase tracking-wider">{toast}</span>
                </div>
            )}
            
            <nav className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-[#EEE]">
                <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-medium text-[#A0A0A0] uppercase tracking-widest">Судья / Город</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium uppercase tracking-wider">{judgeName}</span>
                            <span className="text-[13px] text-gray-300">•</span>
                            <span className="text-[13px] font-medium uppercase tracking-wider text-gray-400">{eventCity}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <button onClick={() => setIsDisciplineOpen(!isDisciplineOpen)} className="flex flex-col items-end">
                            <span className="text-[8px] font-medium text-[#A0A0A0] uppercase tracking-widest">Дисциплина</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-semibold uppercase">{discipline}</span>
                                <ChevronDown size={12} className={isDisciplineOpen ? 'rotate-180' : ''} />
                            </div>
                        </button>
                        {isDisciplineOpen && (
                            <div className="absolute top-full right-0 mt-4 bg-white border border-[#EEE] shadow-2xl rounded-xl py-2 w-40 z-50 overflow-hidden">
                                {disciplines.map(d => (
                                    <button key={d} onClick={() => { setDiscipline(d); setIsDisciplineOpen(false); }} className="w-full px-5 py-2.5 text-left hover:bg-[#F5F5F5] text-[12px] font-medium flex justify-between items-center transition-colors">
                                        {d} {submittedDisciplines.includes(d) && <CheckCircle2 size={12} className="text-green-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-md mx-auto px-6 pt-8 space-y-10">
                {isCurrentSubmitted && (
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3 text-green-700">
                        <CheckCircle2 size={18} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Отчет заблокирован</span>
                    </div>
                )}
                
                {participants.map((participant, index) => {
                    const isNumOpen = openSelect.id === participant.id && openSelect.type === 'number';
                    const isScoreOpen = openSelect.id === participant.id && openSelect.type === 'score';
                    return (
                        <div key={participant.id} className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-sm space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative">
                                    <label className="text-[9px] font-medium text-[#A0A0A0] uppercase tracking-widest mb-2 block">ID Участника</label>
                                    <button disabled={isCurrentSubmitted} onClick={() => setOpenSelect({ id: participant.id, type: isNumOpen ? null : 'number' })} className="w-full flex items-center justify-between border-b border-[#EEE] pb-2 text-[18px] font-light outline-none">
                                        {participant.number} <ChevronDown size={14} className="text-[#DDD]" />
                                    </button>
                                    {isNumOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#EEE] z-[80] h-48 overflow-y-auto no-scrollbar shadow-xl rounded-lg">
                                            {participantNumbers.map(n => (
                                                <div key={n} onClick={() => updateParticipant(participant.id, 'number', n)} className="py-2.5 px-4 hover:bg-[#F9F9F9] text-[14px]">{n}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <label className="text-[9px] font-medium text-[#A0A0A0] uppercase tracking-widest mb-2 block">Оценка</label>
                                    <button disabled={isCurrentSubmitted} onClick={() => setOpenSelect({ id: participant.id, type: isScoreOpen ? null : 'score' })} className="w-full flex items-center justify-between border-b border-[#EEE] pb-2 text-[18px] font-light outline-none">
                                        {participant.score || '--'} <ChevronDown size={14} className="opacity-40" />
                                    </button>
                                    {isScoreOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#EEE] z-[80] h-48 overflow-y-auto no-scrollbar shadow-xl rounded-lg">
                                            {availableScores.map(s => (
                                                <div key={s} onClick={() => updateParticipant(participant.id, 'score', s)} className="py-2.5 px-4 hover:bg-[#F9F9F9] text-[14px]">{s}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-medium text-[#A0A0A0] uppercase tracking-widest block">Заметки</label>
                                <div onClick={() => !isCurrentSubmitted && setFullscreenNote({ id: participant.id, text: participant.comment })} className="min-h-[40px] text-[13px] text-[#666] border-b border-[#F0F0F0] pb-2 cursor-pointer">{participant.comment || "Добавить детали..."}</div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => startCamera(participant.id)} disabled={isCurrentSubmitted} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><Camera size={16} /> Камера</button>
                            </div>
                        </div>
                    );
                })}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#EEE] px-6 py-4 pb-8 z-40">
                <div className="max-w-md mx-auto flex gap-4">
                    <button disabled={isCurrentSubmitted} onClick={addParticipant} className="w-12 h-12 rounded-full border border-[#EEE] flex items-center justify-center"><Plus size={18} /></button>
                    <button onClick={handleSendReport} disabled={!isReadyToSave || isCurrentSubmitted} className="flex-1 h-12 bg-black text-white rounded-full font-semibold text-[11px] uppercase tracking-widest">
                        {isCurrentSubmitted ? 'Отправлено' : 'Отправить отчет'}
                    </button>
                </div>
            </footer>

            {activeCamera && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <button onClick={stopCamera} className="absolute top-6 left-6 text-white bg-black/20 p-3 rounded-full"><X size={24} /></button>
                    <button onClick={takePhoto} className="absolute bottom-10 w-20 h-20 bg-white rounded-full border-8 border-white/30"></button>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
