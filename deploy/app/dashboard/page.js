'use strict';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap, Plus, Calendar, BarChart3, QrCode, Copy, LogOut, Key,
  Sparkles, CheckCircle2, User, Globe, HelpCircle, X, Trash2, Edit3, Archive, Image, Upload, AlertCircle, Check
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [instructor, setInstructor] = useState(null);
  const [courses, setCourses] = useState([]);
  const [surveys, setSurveys] = useState([]); // state for surveys
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

  // New Course Form state
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Network IP state
  const [localIp, setLocalIp] = useState('127.0.0.1');
  const [port, setPort] = useState('3000'); // default next.js port
  const [customDomain, setCustomDomain] = useState('');

  // Modal QR state
  const [activeQrUrl, setActiveQrUrl] = useState('');
  const [activeQrTitle, setActiveQrTitle] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Modal Questions Management state
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('rating'); // 'rating' or 'choice'
  const [newQuestionOptions, setNewQuestionOptions] = useState(''); // comma separated string
  const [newQuestionImage, setNewQuestionImage] = useState(null); // File object
  const [imageUploading, setImageUploading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [showBulkJson, setShowBulkJson] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkImportError, setBulkImportError] = useState('');
  const [hasSubmissions, setHasSubmissions] = useState(false);

  // Copy success notification state
  const [copySuccessId, setCopySuccessId] = useState('');

  // Survey activation selected dates
  const [selectedDates, setSelectedDates] = useState({});

  // Survey title edit state
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [editingSurveyTitle, setEditingSurveyTitle] = useState('');

  // Course edit state
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingCourseCode, setEditingCourseCode] = useState('');
  const [editingCourseName, setEditingCourseName] = useState('');

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy}`; // Turkish date format dd.mm.yyyy by default
  };

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        // Verify auth status
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setInstructor(meData.instructor);

        // Fetch courses and surveys
        const coursesRes = await fetch('/api/courses');
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || []);
          setSurveys(coursesData.surveys || []);
        }

        // Fetch network info
        const networkRes = await fetch('/api/network-info');
        if (networkRes.ok) {
          const networkData = await networkRes.json();
          setLocalIp(networkData.localIp);
          if (networkData.publicUrl) {
            setCustomDomain(networkData.publicUrl);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoad();
  }, [router]);

  const handleToggleSurveyActive = async (surveyId, currentActiveDate, targetDate) => {
    try {
      const activeDate = currentActiveDate ? null : targetDate;
      const res = await fetch('/api/survey/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, activeDate })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'İşlem başarısız.');
      }
      
      // Reload courses & surveys to get updated states
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
        setSurveys(coursesData.surveys || []);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateSurvey = async (courseId, title) => {
    try {
      const res = await fetch('/api/survey/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Anket oluşturulamadı.');
      }
      
      // Reload surveys
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setSurveys(coursesData.surveys || []);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
    if (!confirm('Bu oturumu silmek istediğinize emin misiniz? Toplanan tüm cevaplar silinecektir.')) {
      return;
    }
    try {
      const res = await fetch('/api/survey/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Oturum silinemedi.');
      }
      
      // Reload surveys
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setSurveys(coursesData.surveys || []);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateSurveyTitle = async (surveyId) => {
    if (!editingSurveyTitle || !editingSurveyTitle.trim()) return;
    try {
      const res = await fetch('/api/survey/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, title: editingSurveyTitle })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Oturum adı güncellenemedi.');
      }
      
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, title: editingSurveyTitle.trim() } : s));
      setEditingSurveyId(null);
      setEditingSurveyTitle('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateCourse = async (courseId) => {
    if (!editingCourseCode || !editingCourseCode.trim()) return;
    if (!editingCourseName || !editingCourseName.trim()) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          courseId, 
          code: editingCourseCode.trim(), 
          name: editingCourseName.trim() 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Genel oturum güncellenemedi.');
      }
      
      // Update local state
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, code: editingCourseCode.trim().toUpperCase(), name: editingCourseName.trim() } : c));
      setEditingCourseId(null);
      setEditingCourseCode('');
      setEditingCourseName('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!currentPassword) {
      setPasswordError('Mevcut şifre gereklidir.');
      return;
    }
    if (!newPassword || newPassword.length < 3) {
      setPasswordError('Yeni şifre en az 3 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor.');
      return;
    }

    try {
      setIsPasswordSubmitting(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Şifre güncellenemedi.');
      }
      setPasswordSuccess('Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleToggleArchive = async (courseId, currentArchived) => {
    try {
      const newArchived = currentArchived === 0 ? 1 : 0;
      const res = await fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, archived: newArchived })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'İşlem başarısız.');
      }
      
      // Reload courses
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Bu genel oturumu silmek istediğinize emin misiniz? Tüm anketler ve cevapları kalıcı olarak silinecektir.')) {
      return;
    }
    try {
      const res = await fetch(`/api/courses?courseId=${courseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ders silinemedi.');
      }
      
      // Reload courses
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
        setSurveys(coursesData.surveys || []);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: courseName, code: courseCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Genel oturum oluşturulamadı.');
      }

      setFormSuccess('Genel oturum başarıyla oluşturuldu.');
      setCourseName('');
      setCourseCode('');

      // Reload courses
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text, typeId) => {
    navigator.clipboard.writeText(text);
    setCopySuccessId(typeId);
    setTimeout(() => {
      setCopySuccessId('');
    }, 2000);
  };

  const getFullUrl = (surveyId) => {
    if (customDomain) {
      const cleanDomain = customDomain.replace(/\/$/, ''); // remove trailing slash
      return `${cleanDomain}/survey/${surveyId}`;
    }
    return `http://${localIp}:${port}/survey/${surveyId}`;
  };

  const openQrModal = (url, title) => {
    setActiveQrUrl(url);
    setActiveQrTitle(title);
    setShowQrModal(true);
  };

  const openQuestionsModal = async (course) => {
    setSelectedCourse(course);
    setQuestions([]);
    setQuestionsError('');
    setQuestionsLoading(true);
    setShowQuestionsModal(true);
    setBulkJsonText('');
    setBulkImportError('');
    setShowBulkJson(false);

    try {
      const res = await fetch(`/api/courses/${course.id}/questions`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sorular alınamadı.');
      }
      setQuestions(data.questions || []);
      setHasSubmissions(data.hasSubmissions || false);
    } catch (err) {
      setQuestionsError(err.message);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleBulkQuestionsImport = async (e) => {
    e.preventDefault();
    setBulkImportError('');
    if (!bulkJsonText.trim()) return;

    try {
      let parsed;
      try {
        parsed = JSON.parse(bulkJsonText.trim());
      } catch (jsonErr) {
        throw new Error('Geçersiz JSON formatı. Lütfen JSON verisini kontrol edin.');
      }

      if (!Array.isArray(parsed)) {
        throw new Error('JSON verisi soru listesini içeren bir dizi (Array) formatında olmalıdır. Örn: [ { "text": "...", "type": "..." } ]');
      }

      if (parsed.length === 0) {
        throw new Error('Soru listesi boş olamaz.');
      }

      // Check structure of each question in the array
      const formattedQuestions = parsed.map((item, idx) => {
        const text = item.text || item.questionText;
        const type = item.type || item.questionType || 'rating';
        const options = item.options;

        if (!text || typeof text !== 'string' || !text.trim()) {
          throw new Error(`${idx + 1}. sorunun metni (text) bulunamadı veya geçersiz.`);
        }

        if (type !== 'rating' && type !== 'choice' && type !== 'checkbox') {
          throw new Error(`${idx + 1}. sorunun tipi (type) 'rating' (yıldızlı), 'choice' (şıklı) veya 'checkbox' (çoklu seçimli) olmalıdır.`);
        }

        if (type === 'choice' || type === 'checkbox') {
          if (!options || !Array.isArray(options) || options.length === 0) {
            throw new Error(`Seçenekli '${text}' sorusu için 'options' dizisi (Array) tanımlanmalıdır. Örn: "options": ["İyi", "Kötü"]`);
          }
        }

        return {
          questionText: text.trim(),
          questionType: type,
          options: (type === 'choice' || type === 'checkbox') ? options.map(o => String(o).trim()).filter(Boolean) : null,
          imageUrl: item.image_url || item.imageUrl || null
        };
      });

      const res = await fetch(`/api/courses/${selectedCourse.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkQuestions: formattedQuestions })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'İçe aktarma sırasında hata oluştu.');
      }

      setQuestions(data.questions || []);
      setBulkJsonText('');
      setShowBulkJson(false);
    } catch (err) {
      setBulkImportError(err.message);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setQuestionsError('');

    if (!newQuestionText.trim()) return;

    let uploadedImageUrl = null;

    if (newQuestionImage) {
      setImageUploading(true);
      try {
        const uFormData = new FormData();
        uFormData.append('file', newQuestionImage);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uFormData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Görsel yüklenemedi.');
        }
        uploadedImageUrl = uploadData.imageUrl;
      } catch (err) {
        setQuestionsError(err.message);
        setImageUploading(false);
        return;
      } finally {
        setImageUploading(false);
      }
    }

    try {
      // Parse options
      let optionsArray = null;
      const isOptionsType = newQuestionType === 'choice' || newQuestionType === 'checkbox';
      if (isOptionsType && newQuestionOptions.trim()) {
        optionsArray = newQuestionOptions.split(',').map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(`/api/courses/${selectedCourse.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: newQuestionText,
          questionType: newQuestionType,
          options: optionsArray,
          imageUrl: uploadedImageUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Soru eklenemedi.');
      }

      setQuestions([...questions, data.question]);
      setNewQuestionText('');
      setNewQuestionOptions('');
      setNewQuestionImage(null);
      // Reset input element
      const fileInput = document.getElementById('question-image-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setQuestionsError(err.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    setQuestionsError('');
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/questions?questionId=${questionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Soru silinemedi.');
      }
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      setQuestionsError(err.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const activeCourses = courses.filter(c => c.archived === 0);
  const archivedCourses = courses.filter(c => c.archived === 1);
  const displayedCourses = activeTab === 'active' ? activeCourses : archivedCourses;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-background">
        <div className="inline-block w-8 h-8 border-4 border-soft-stone border-t-carbon-ink rounded-full animate-spin"></div>
        <p className="text-ashen mt-4 text-xs uppercase font-medium">Panel yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen relative bg-background text-foreground font-sans">
      {/* Header */}
      <header className="border-b border-mist bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-soft-stone rounded-lg">
              <GraduationCap className="h-5 w-5 text-carbon-ink" />
            </div>
            <span className="font-anthropic-serif text-xl font-normal text-carbon-ink flex items-center gap-1.5">
              Hoca Kontrol Paneli <span className="text-clay text-sm">✦</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-soft-stone rounded-lg text-graphite text-xs font-semibold">
              <User className="h-3.5 w-3.5 text-graphite" />
              <span>{instructor?.name}</span>
            </div>
            <Link
              href="/dashboard/stats/overall"
              className="px-4 py-2 btn-outline text-xs font-medium uppercase flex items-center gap-2 transition-all"
            >
              <BarChart3 className="h-4 w-4" /> Bölüm İstatistikleri
            </Link>
            <button
              onClick={() => {
                setShowPasswordModal(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setPasswordError('');
                setPasswordSuccess('');
              }}
              className="px-4 py-2 bg-transparent hover:bg-soft-stone text-graphite rounded-lg border border-mist transition-all text-xs font-medium uppercase flex items-center gap-2 cursor-pointer btn-outline"
            >
              <Key className="h-4 w-4" /> Şifre Değiştir
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-transparent hover:bg-soft-stone text-graphite rounded-lg border border-mist transition-all text-xs font-medium uppercase flex items-center gap-2 cursor-pointer btn-outline"
            >
              <LogOut className="h-4 w-4" /> Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8 z-10">
        
        {/* Local Network Info Card */}
        <div className="gleap-card p-8 bg-paper-white border border-soft-stone flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-[16px] shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-soft-stone rounded-lg text-carbon-ink mt-0.5">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-carbon-ink flex items-center gap-1.5 uppercase">
                Yerel Ağ Paylaşımı Aktif
              </h2>
              <p className="text-ashen text-xs mt-0.5 max-w-xl">
                Bölümdeki diğer hocalarınız da aynı ağdan bu sisteme erişebilir. Öğrenciler de bu IP üzerinden anketleri doldurabilir:
              </p>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <code className="px-3 py-1.5 bg-soft-stone border border-mist rounded-lg text-carbon-ink text-xs font-mono font-semibold">
                  http://{localIp}:{port}/login
                </code>
                <button
                  onClick={() => copyToClipboard(`http://${localIp}:${port}/login`, 'network')}
                  className="p-2 btn-outline rounded-lg text-graphite hover:bg-soft-stone transition-colors cursor-pointer border border-mist"
                  title="Giriş Linkini Kopyala"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {copySuccessId === 'network' && (
                  <span className="text-xs text-carbon-ink font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-clay" /> Kopyalandı
                  </span>
                )}
              </div>
              
              {/* Custom Domain Input for ngrok / Public Tunneling */}
              <div className="mt-4 pt-4 border-t border-soft-stone flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <span className="block text-[11px] font-semibold text-ashen uppercase tracking-wider mb-1">
                    Dış Ağ / Tünel Bağlantısı (ngrok / localtunnel vb. kullanıyorsanız)
                  </span>
                  <input
                    type="text"
                    placeholder="https://xxxx.ngrok-free.app"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-72 px-4 py-2 bg-paper-white border border-mist rounded-lg text-xs font-semibold text-carbon-ink focus:border-graphite focus:outline-none placeholder-pebble"
                  />
                </div>
                {customDomain && (
                  <span className="text-[10px] text-clay border border-[#fbe5dc] bg-[#fdf3f0] rounded-lg px-3 py-1.5 font-bold self-end sm:self-auto uppercase">
                    🚀 Karekodlar ve Bağlantılar bu adrese uyarlandı!
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-ashen text-xs mt-1 md:mt-0 bg-soft-stone p-3.5 rounded-lg border border-transparent">
            <HelpCircle className="h-4 w-4 shrink-0 text-ashen" />
            <span>LAN erişimi için sunucu dev modunda -H 0.0.0.0 ile çalışmalıdır.</span>
          </div>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Course Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="gleap-card p-8 bg-paper-white border border-soft-stone rounded-[16px] shadow-sm">
              <h2 className="text-sm font-semibold text-carbon-ink mb-6 flex items-center gap-2 uppercase tracking-wider font-anthropic-serif">
                <Plus className="h-5 w-5 text-carbon-ink" /> Yeni Genel Oturum Ekle
              </h2>
              
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-ashen uppercase tracking-wider mb-2">
                    Genel Oturum Kodu / Dönem
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BİL301 (veya 2026-Güz)"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-paper-white border border-mist rounded-lg text-sm text-carbon-ink placeholder-pebble outline-none focus:border-graphite transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ashen uppercase tracking-wider mb-2">
                    Genel Oturum Adı / Konusu
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Veri Yapıları veya Eğitim Sunumu"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-paper-white border border-mist rounded-lg text-sm text-carbon-ink placeholder-pebble outline-none focus:border-graphite transition-colors"
                  />
                </div>

                {formError && (
                  <div className="p-3 border border-clay text-clay bg-[#fdf3f0] rounded-lg text-xs font-semibold uppercase">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 border border-carbon-ink text-carbon-ink bg-soft-stone rounded-lg text-xs font-medium uppercase">
                    {formSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 btn-primary text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Genel Oturumu Kaydet'}
                </button>
              </form>
            </div>
          </div>

          {/* Courses List Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="gleap-card p-8 bg-paper-white border border-soft-stone rounded-[16px] shadow-sm">
              
              {/* Tab Selector */}
              <div className="flex border-b border-soft-stone mb-6">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 pb-3 text-xs font-semibold uppercase border-b-2 text-center transition-colors duration-200 cursor-pointer ${
                    activeTab === 'active'
                      ? 'border-carbon-ink text-carbon-ink'
                      : 'border-transparent text-ashen hover:text-carbon-ink'
                  }`}
                >
                  Aktif Genel Oturumlar ({activeCourses.length})
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`flex-1 pb-3 text-xs font-semibold uppercase border-b-2 text-center transition-colors duration-200 cursor-pointer ${
                    activeTab === 'archived'
                      ? 'border-carbon-ink text-carbon-ink'
                      : 'border-transparent text-ashen hover:text-carbon-ink'
                  }`}
                >
                  Arşivlenmiş Genel Oturumlar ({archivedCourses.length})
                </button>
              </div>

              {displayedCourses.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-mist rounded-[16px] bg-transparent">
                  <p className="text-ashen font-medium text-xs uppercase">
                    {activeTab === 'active' ? 'Aktif genel oturum bulunmuyor.' : 'Arşivlenmiş genel oturum bulunmuyor.'}
                  </p>
                  <p className="text-ashen text-[10px] uppercase mt-1">
                    {activeTab === 'active' ? 'Yandaki panelden genel oturum ekleyebilirsiniz.' : 'İhtiyacınız olmayan genel oturumları arşive kaldırabilirsiniz.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {displayedCourses.map((course) => {
                    const courseSurveys = surveys.filter(s => s.course_id === course.id) || [];

                    return (
                      <div key={course.id} className="p-6 bg-paper-white rounded-lg border border-soft-stone space-y-5 hover:border-mist transition-colors">
                        {/* Course Header */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-soft-stone">
                          {editingCourseId === course.id ? (
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Kod (örn: BİL301)"
                                  value={editingCourseCode}
                                  onChange={(e) => setEditingCourseCode(e.target.value)}
                                  className="w-36 bg-paper-white border border-mist rounded px-2.5 py-1 text-xs font-mono font-semibold text-carbon-ink focus:outline-none focus:border-graphite uppercase"
                                />
                                <span className="text-[10px] text-ashen font-semibold font-mono">
                                  ({formatDate(course.created_at)})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Genel Oturum Adı"
                                  value={editingCourseName}
                                  onChange={(e) => setEditingCourseName(e.target.value)}
                                  className="flex-1 bg-paper-white border border-mist rounded px-2.5 py-1 text-xs font-semibold text-carbon-ink focus:outline-none focus:border-graphite"
                                />
                                <button
                                  onClick={() => handleUpdateCourse(course.id)}
                                  className="p-1.5 hover:text-clay text-carbon-ink transition-colors cursor-pointer shrink-0"
                                  title="Genel Oturumu Kaydet"
                                >
                                  <Check className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCourseId(null);
                                    setEditingCourseCode('');
                                    setEditingCourseName('');
                                  }}
                                  className="p-1.5 hover:text-clay text-ashen transition-colors cursor-pointer shrink-0"
                                  title="Vazgeç"
                                >
                                  <X className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-soft-stone text-graphite text-xs font-mono rounded-lg font-semibold border border-transparent">
                                  {course.code}
                                </span>
                                <span className="text-[10px] text-ashen font-semibold font-mono">
                                  ({formatDate(course.created_at)})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <h3 className="text-md font-semibold text-carbon-ink uppercase font-anthropic-serif">{course.name}</h3>
                                <button
                                  onClick={() => {
                                    setEditingCourseId(course.id);
                                    setEditingCourseCode(course.code);
                                    setEditingCourseName(course.name);
                                  }}
                                  className="text-ashen hover:text-carbon-ink p-1 rounded transition-colors cursor-pointer shrink-0"
                                  title="Genel Oturumu Düzenle"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => openQuestionsModal(course)}
                              disabled={course.archived === 1}
                              className="px-3 py-1.5 btn-outline text-xs font-medium uppercase flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Sorular
                            </button>
                            
                            <button
                              onClick={() => handleToggleArchive(course.id, course.archived)}
                              className="px-3 py-1.5 btn-outline text-xs font-medium uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                              title={course.archived === 0 ? 'Arşive Kaldır' : 'Arşivden Çıkar'}
                            >
                              <Archive className="h-3.5 w-3.5" />
                              {course.archived === 0 ? 'Arşivle' : 'Aktifleştir'}
                            </button>

                            <Link
                              href={`/dashboard/stats/${course.id}`}
                              className="px-3 py-1.5 btn-primary text-xs font-medium uppercase flex items-center gap-1.5 transition-all text-paper-white"
                            >
                              <BarChart3 className="h-3.5 w-3.5" /> Analiz
                            </Link>

                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="px-3 py-1.5 border border-clay hover:bg-[#fdf3f0] text-clay rounded-lg text-xs font-medium uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Genel Oturumu Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Sil
                            </button>
                          </div>
                        </div>

                        {/* Oturum Actions */}
                        {course.archived === 0 ? (
                          <div className="space-y-4">
                            {/* Oturum List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {courseSurveys.length === 0 ? (
                                <div className="md:col-span-2 text-center py-4 bg-transparent border border-dashed border-mist rounded-lg text-xs text-ashen uppercase font-medium">
                                  Henüz tanımlı oturum bulunmuyor. Aşağıdan yeni bir oturum ekleyebilirsiniz.
                                </div>
                              ) : (
                                courseSurveys.map((survey) => {
                                  const surveyUrl = getFullUrl(survey.id);
                                  const isSurveyActive = !!survey.active_date;
                                  
                                  return (
                                    <div key={survey.id} className="bg-soft-stone p-4 rounded-lg border border-mist space-y-3 relative group">
                                      {/* Delete button */}
                                      {editingSurveyId !== survey.id && (
                                        <button
                                          onClick={() => handleDeleteSurvey(survey.id)}
                                          className="absolute top-3 right-3 text-ashen hover:text-clay transition-colors p-1 rounded cursor-pointer"
                                          title="Oturumu Sil"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}

                                      <div className="flex justify-between items-center pr-6 gap-2">
                                        {editingSurveyId === survey.id ? (
                                          <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <input
                                              type="text"
                                              value={editingSurveyTitle}
                                              onChange={(e) => setEditingSurveyTitle(e.target.value)}
                                              className="flex-1 bg-paper-white border border-mist rounded px-2 py-1 text-xs font-semibold text-carbon-ink focus:outline-none focus:border-graphite"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleUpdateSurveyTitle(survey.id)}
                                              className="p-1 hover:text-clay text-carbon-ink transition-colors cursor-pointer shrink-0"
                                              title="Kaydet"
                                            >
                                              <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingSurveyId(null);
                                                setEditingSurveyTitle('');
                                              }}
                                              className="p-1 hover:text-clay text-ashen transition-colors cursor-pointer shrink-0"
                                              title="Vazgeç"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span className="text-xs font-semibold text-carbon-ink uppercase truncate">{survey.title}</span>
                                            <button
                                              onClick={() => {
                                                setEditingSurveyId(survey.id);
                                                setEditingSurveyTitle(survey.title);
                                              }}
                                              className="text-ashen hover:text-carbon-ink p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                              title="İsmi Güncelle"
                                            >
                                              <Edit3 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                        {isSurveyActive ? (
                                          <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded text-[9px] font-bold bg-paper-white text-carbon-ink border border-carbon-ink">
                                            ● AKTİF ({survey.active_date})
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded text-[9px] font-bold bg-transparent text-ashen border border-mist">
                                            ○ PASİF
                                          </span>
                                        )}
                                      </div>

                                      {isSurveyActive ? (
                                        <button
                                          onClick={() => handleToggleSurveyActive(survey.id, survey.active_date)}
                                          className="w-full py-1.5 px-3 border border-clay hover:bg-[#fdf3f0] text-clay rounded-lg text-xs font-medium uppercase transition-colors cursor-pointer text-center"
                                        >
                                          Oturumu Kapat (Katılıma Son Ver)
                                        </button>
                                      ) : (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            placeholder="Tarih (örn: 13.07.2026)"
                                            value={selectedDates[`survey-${survey.id}`] !== undefined ? selectedDates[`survey-${survey.id}`] : getTodayString()}
                                            onChange={(e) => setSelectedDates(prev => ({ ...prev, [`survey-${survey.id}`]: e.target.value }))}
                                            className="flex-1 bg-paper-white border border-mist rounded-lg text-xs font-semibold text-carbon-ink focus:border-graphite focus:outline-none placeholder-pebble px-3 py-1.5"
                                          />
                                          <button
                                            onClick={() => handleToggleSurveyActive(survey.id, survey.active_date, selectedDates[`survey-${survey.id}`] || getTodayString())}
                                            className="py-1.5 px-4 bg-carbon-ink text-paper-white hover:bg-transparent hover:text-carbon-ink rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-carbon-ink text-center whitespace-nowrap shrink-0"
                                          >
                                            Aktif Et
                                          </button>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1.5 pt-1 border-t border-paper-white">
                                        <input
                                          type="text"
                                          readOnly
                                          value={surveyUrl}
                                          className="flex-1 bg-paper-white border border-mist rounded-lg text-[10px] font-mono text-ashen focus:outline-none px-3 py-1.5"
                                        />
                                        <button
                                          onClick={() => copyToClipboard(surveyUrl, `${survey.id}-copy`)}
                                          className="p-1.5 btn-outline rounded-lg text-graphite hover:bg-soft-stone transition-colors cursor-pointer border border-mist"
                                          title="Linki Kopyala"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => openQrModal(surveyUrl, `${course.code} - ${survey.title}`)}
                                          className="p-1.5 btn-outline rounded-lg text-graphite hover:bg-soft-stone transition-colors cursor-pointer border border-mist"
                                          title="QR Kod Göster"
                                        >
                                          <QrCode className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      {copySuccessId === `${survey.id}-copy` && (
                                        <p className="text-[10px] text-carbon-ink font-bold flex items-center gap-0.5 uppercase">
                                          <CheckCircle2 className="h-3 w-3 text-clay" /> Kopyalandı
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Create New Survey Form Inline */}
                            <div className="bg-paper-white p-6 rounded-[16px] border border-soft-stone">
                              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block mb-2">Yeni Oturum Tanımla</span>
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const title = e.target.elements.surveyTitle.value;
                                  if (!title || !title.trim()) return;
                                  handleCreateSurvey(course.id, title);
                                  e.target.reset();
                                }} 
                                className="flex gap-2"
                              >
                                <input
                                  type="text"
                                  name="surveyTitle"
                                  placeholder="Oturum Başlığı (örn: Vize Sonrası)"
                                  className="flex-1 bg-paper-white border border-mist focus:border-graphite px-4 py-2.5 text-xs text-carbon-ink focus:outline-none placeholder-pebble rounded-lg"
                                  required
                                />
                                <button
                                  type="submit"
                                  className="px-5 py-2.5 bg-carbon-ink text-paper-white font-medium rounded-lg text-xs hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                                >
                                  Oturum Ekle
                                </button>
                              </form>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-soft-stone p-4 rounded-lg text-xs text-ashen flex items-center gap-2 uppercase tracking-wider">
                            <Archive className="h-4 w-4 shrink-0 text-ashen" />
                            <span>Bu genel oturum arşivlendiği için oturumları yeni katılıma kapatılmıştır. Yukarıdan tekrar aktif hale getirebilirsiniz.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* QR Code Presentation Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-carbon-ink/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="gleap-card max-w-md w-full p-8 relative flex flex-col items-center bg-paper-white border border-soft-stone shadow-xl rounded-[24px] animate-in fade-in duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 text-ashen hover:text-carbon-ink rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h3 className="text-lg font-medium text-carbon-ink text-center mb-1 uppercase tracking-tight font-anthropic-serif">
              Öğrenciler İçin Anket QR Kodu
            </h3>
            <p className="text-ashen text-xs text-center mb-6 max-w-xs uppercase font-medium">
              {activeQrTitle}
            </p>

            <div className="p-4 bg-paper-white rounded-lg border border-mist mb-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeQrUrl)}`}
                alt="Survey QR Code"
                width={220}
                height={220}
                className="rounded"
              />
            </div>

            <div className="w-full text-center space-y-2">
              <span className="text-[10px] font-bold text-ashen block uppercase tracking-wider">Sınıfa yansıtmak veya doğrudan bağlantıyı kopyalamak için:</span>
              <code className="block bg-soft-stone border border-mist p-2.5 rounded-lg text-xs font-mono text-carbon-ink font-bold break-all select-all">
                {activeQrUrl}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Questions Editor Modal */}
      {showQuestionsModal && (
        <div className="fixed inset-0 bg-carbon-ink/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="gleap-card max-w-xl w-full p-8 my-8 relative bg-paper-white border border-soft-stone shadow-xl rounded-[24px] animate-in fade-in duration-200 flex flex-col">
            <button
              onClick={() => setShowQuestionsModal(false)}
              className="absolute top-4 right-4 p-1.5 text-ashen hover:text-carbon-ink rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h3 className="text-lg font-medium text-carbon-ink mb-1 uppercase tracking-tight font-anthropic-serif">
              Genel Oturum Kriterlerini Yönet
            </h3>
            <p className="text-ashen text-xs mb-6 uppercase font-medium">
              {selectedCourse?.code} - {selectedCourse?.name} oturumuna ait oylama kriterlerini düzenleyin.
            </p>

            {hasSubmissions && (
              <div className="mb-4 p-3.5 border border-clay text-clay bg-[#fdf3f0] rounded-lg text-xs flex gap-2 font-semibold uppercase tracking-wider">
                <AlertCircle className="h-4 w-4 text-clay shrink-0 mt-0.5" />
                <div>
                  <strong>⚠️ Oturum Kriterleri Kilitlendi:</strong> Bu genel oturuma ait doldurulmuş öğrenci anketleri bulunuyor. İstatistiklerin bozulmaması için sorular üzerinde değişiklik yapılamaz.
                </div>
              </div>
            )}

            {/* Questions list */}
            {questionsLoading ? (
              <div className="text-center py-8 text-ashen text-xs uppercase font-medium animate-pulse">Sorular yükleniyor...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-mist bg-transparent rounded-lg text-ashen text-xs uppercase font-medium mb-6">
                Tanımlı soru bulunmamaktadır. Aşağıdan soru ekleyin.
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-[220px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex justify-between items-start p-4 bg-soft-stone border border-transparent rounded-lg gap-4">
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-carbon-ink uppercase leading-snug block">
                        {idx + 1}. {q.question_text}
                      </span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="bg-paper-white border border-mist text-ashen rounded px-2 py-0.5 text-[10px] font-semibold uppercase">
                          {q.question_type === 'choice' ? 'Çoktan Seçmeli (Şıklı)' : q.question_type === 'checkbox' ? 'Çoklu Seçimli (Checkbox)' : 'Yıldızlı Oylama'}
                        </span>
                        {q.options && q.options.length > 0 && (
                          <span className="text-[10px] text-ashen uppercase">
                            Şıklar: {q.options.join(', ')}
                          </span>
                        )}
                        {q.image_url && (
                          <a href={q.image_url} target="_blank" rel="noreferrer" className="text-[10px] text-clay hover:underline flex items-center gap-0.5 font-bold uppercase">
                            <Image className="h-3 w-3" /> Görsel
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={hasSubmissions}
                      className="p-1.5 bg-transparent hover:bg-paper-white text-ashen hover:text-clay rounded-lg border border-mist hover:border-clay transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={hasSubmissions ? "Katılım sağlanmış oturum soruları silinemez" : "Soruyu Sil"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bulk JSON Import Collapse Block */}
            {!questionsLoading && !hasSubmissions && (
              <div className="mb-4 pt-3 border-t border-soft-stone">
                <button
                  type="button"
                  onClick={() => setShowBulkJson(!showBulkJson)}
                  className="text-xs font-medium text-carbon-ink hover:underline flex items-center gap-1 cursor-pointer uppercase"
                >
                  {showBulkJson ? '❌ Toplu Yükleme Panelini Kapat' : '📝 Toplu Soru Ekle (JSON Formatında)'}
                </button>

                {showBulkJson && (
                  <form onSubmit={handleBulkQuestionsImport} className="mt-3 p-3 bg-soft-stone border border-transparent rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1 duration-155">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider">
                        JSON Formatında Soru Listesi
                      </label>
                      <pre className="p-2 bg-paper-white border border-mist rounded-lg text-[9px] font-mono text-ashen overflow-x-auto">
{`[
  {
    "text": "Oturumu nasıl buldunuz?",
    "type": "rating"
  },
  {
    "text": "Oturum hızı nasıldı?",
    "type": "choice",
    "options": ["Çok Hızlı", "Orta", "Yavaş"]
  },
  {
    "text": "İlgi çeken konular hangileriydi?",
    "type": "checkbox",
    "options": ["Konu A", "Konu B", "Konu C"]
  }
]`}
                      </pre>
                    </div>

                    <textarea
                      rows={5}
                      required
                      placeholder="JSON verisini buraya yapıştırın..."
                      value={bulkJsonText}
                      onChange={(e) => setBulkJsonText(e.target.value)}
                      className="w-full p-2.5 bg-paper-white border border-mist rounded-lg text-xs font-mono text-carbon-ink focus:outline-none placeholder-pebble"
                    />

                    {bulkImportError && (
                      <p className="p-3.5 border border-clay text-clay bg-[#fdf3f0] rounded-lg text-xs font-semibold uppercase">
                        {bulkImportError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBulkJson(false);
                          setBulkImportError('');
                          setBulkJsonText('');
                        }}
                        className="px-3 py-1.5 btn-outline rounded-lg text-ashen text-[10px] font-bold cursor-pointer uppercase"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 btn-secondary rounded-lg text-[10px] font-medium cursor-pointer"
                      >
                        Soruları İçe Aktar (Mevcutları Siler)
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Add question form */}
            {!questionsLoading && !hasSubmissions && (
              <form onSubmit={handleAddQuestion} className="space-y-4 pt-4 border-t border-soft-stone">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ashen uppercase tracking-wider">Yeni Soru Ekle</span>
                  <span className={`font-mono font-bold ${questions.length >= 6 ? 'text-clay' : 'text-ashen'}`}>
                    Sayı: {questions.length}/6
                  </span>
                </div>
                
                <div className="space-y-3">
                  {/* Question Text */}
                  <div>
                    <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">Soru Metni</label>
                    <input
                      type="text"
                      required
                      placeholder="Genel oturum değerlendirme kriteri yazın..."
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      disabled={questions.length >= 6}
                      className="w-full px-3 py-2.5 gleap-input placeholder-pebble text-xs disabled:opacity-50"
                    />
                  </div>

                  {/* Question Type & Image upload group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Question Type Selection */}
                    <div>
                      <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">Soru Tipi</label>
                      <select
                        value={newQuestionType}
                        onChange={(e) => setNewQuestionType(e.target.value)}
                        disabled={questions.length >= 6}
                        className="w-full px-3 py-2.5 bg-paper-white border border-mist rounded-lg text-xs font-semibold text-carbon-ink focus:border-graphite focus:outline-none p-3"
                      >
                        <option value="rating">Derecelendirme (1-5 Yıldız)</option>
                        <option value="choice">Çoktan Seçmeli (Şıklı - Tekli Seçim)</option>
                        <option value="checkbox">Çoklu Seçimli (Checkbox - Çoklu Seçim)</option>
                      </select>
                    </div>

                    {/* Image Upload Input */}
                    <div>
                      <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">Soru Resmi (İsteğe Bağlı)</label>
                      <input
                        id="question-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewQuestionImage(e.target.files[0] || null)}
                        disabled={questions.length >= 6}
                        className="w-full text-xs text-ashen file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-mist file:text-[10px] file:font-semibold file:uppercase file:bg-soft-stone file:text-carbon-ink file:cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Choice Options Input */}
                  {(newQuestionType === 'choice' || newQuestionType === 'checkbox') && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">
                        Seçenekler (Virgülle ayırarak girin)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Çok Katılıyorum, Katılıyorum, Katılmıyorum"
                        value={newQuestionOptions}
                        onChange={(e) => setNewQuestionOptions(e.target.value)}
                        disabled={questions.length >= 6}
                        className="w-full px-3 py-2.5 gleap-input placeholder-pebble text-xs disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-between items-center gap-4">
                  {questionsError && (
                    <p className="flex-1 text-xs font-semibold text-clay border border-clay p-2.5 rounded-lg bg-[#fdf3f0] text-center uppercase">
                      {questionsError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={questions.length >= 6 || imageUploading}
                    className="ml-auto px-6 py-3 btn-secondary rounded-lg text-xs font-medium shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {imageUploading ? 'Yükleniyor...' : 'Soru Ekle'}
                  </button>
                </div>

                {questions.length >= 6 && (
                  <p className="text-[10px] text-ashen italic uppercase">
                    * Maksimum soru limitine (6 adet) ulaşıldı. Yeni soru eklemek için mevcut sorulardan birini silmeniz gerekir.
                  </p>
                )}
              </form>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowQuestionsModal(false)}
                className="px-5 py-2.5 btn-outline rounded-lg text-xs font-medium cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-carbon-ink/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="gleap-card max-w-md w-full p-8 relative bg-paper-white border border-soft-stone shadow-xl rounded-[24px] animate-in fade-in duration-200">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 p-1.5 text-ashen hover:text-carbon-ink rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h3 className="text-lg font-medium text-carbon-ink mb-1 uppercase tracking-tight font-anthropic-serif">
              Şifreni Değiştir
            </h3>
            <p className="text-ashen text-xs mb-6 uppercase font-medium">
              Hesabınızın güvenliği için yeni şifrenizi belirleyin.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">
                  Mevcut Şifre
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-paper-white border border-mist rounded-lg text-xs font-semibold text-carbon-ink focus:outline-none focus:border-graphite"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-paper-white border border-mist rounded-lg text-xs font-semibold text-carbon-ink focus:outline-none focus:border-graphite"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-ashen uppercase tracking-wider mb-1">
                  Yeni Şifre (Tekrar)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-paper-white border border-mist rounded-lg text-xs font-semibold text-carbon-ink focus:outline-none focus:border-graphite"
                />
              </div>

              {passwordError && (
                <p className="text-xs font-semibold text-clay border border-clay p-2.5 rounded-lg bg-[#fdf3f0] text-center uppercase">
                  {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <p className="text-xs font-semibold text-[#1f7a42] border border-[#d2eedc] p-2.5 rounded-lg bg-[#f0faf3] text-center uppercase">
                  {passwordSuccess}
                </p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-5 py-2.5 btn-outline rounded-lg text-xs font-medium cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="px-6 py-2.5 bg-carbon-ink hover:bg-black text-white hover:text-white rounded-lg text-xs font-medium shrink-0 disabled:opacity-50 cursor-pointer uppercase"
                >
                  {isPasswordSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
