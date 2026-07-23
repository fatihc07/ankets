'use strict';
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ThumbsUp, ArrowLeft, Star, GraduationCap, AlertCircle } from 'lucide-react';

const fetch = (url, options) => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const cleanUrl = (typeof url === 'string' && url.startsWith('/') && (!basePath || !url.startsWith(basePath)))
    ? `${basePath}${url}`
    : url;
  if (typeof window !== 'undefined') {
    return window.fetch(cleanUrl, options);
  }
  return globalThis.fetch(cleanUrl, options);
};

export default function DynamicSurveyPage({ params }) {
  const { surveyId } = use(params);
  const router = useRouter();

  const [courseInfo, setCourseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Form answers map: { [questionId]: rating (number) or choice (string) }
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState('');

  useEffect(() => {
    async function fetchDetails() {
      try {
        setError('');
        setLoading(true);
        const res = await fetch(`/api/survey?surveyId=${surveyId}`);
        
        let data;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(`Sunucu geçersiz yanıt verdi (Durum: ${res.status}). Hata detayı: ${text.substring(0, 80)}`);
        }

        if (!res.ok) {
          throw new Error(data.error || 'Oturum detayları alınamadı.');
        }

        const isTestMode = typeof window !== 'undefined' && (
          window.location.search.includes('reset=1') || 
          window.location.search.includes('test=1')
        );

        if (!isTestMode && data.alreadySubmitted) {
          setAlreadySubmitted(true);
          if (typeof window !== 'undefined' && data.active_date) {
            localStorage.setItem(`survey_submitted_${surveyId}_${data.active_date}`, 'true');
          }
          return;
        }

        if (!isTestMode && typeof window !== 'undefined' && data.active_date) {
          const localCheck = localStorage.getItem(`survey_submitted_${surveyId}_${data.active_date}`);
          if (localCheck === 'true') {
            setAlreadySubmitted(true);
            return;
          }
        } else if (isTestMode && typeof window !== 'undefined' && data.active_date) {
          localStorage.removeItem(`survey_submitted_${surveyId}_${data.active_date}`);
        }

        setCourseInfo(data);
        
        // Initialize answers map
        const initialAnswers = {};
        if (data.questions) {
          data.questions.forEach(q => {
            if (q.question_type === 'checkbox') {
              initialAnswers[q.id] = [];
            } else {
              initialAnswers[q.id] = q.question_type === 'choice' ? '' : 0;
            }
          });
        }
        setAnswers(initialAnswers);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [surveyId]);

  const handleRatingChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleChoiceChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId, value) => {
    setAnswers(prev => {
      const currentList = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (currentList.includes(value)) {
        return {
          ...prev,
          [questionId]: currentList.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [questionId]: [...currentList, value]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare answers array
    const answersArray = courseInfo.questions.map(q => {
      const val = answers[q.id];
      const isChoice = q.question_type === 'choice';
      const isCheckbox = q.question_type === 'checkbox';
      
      let finalChoiceVal = null;
      if (isChoice) {
        finalChoiceVal = val || '';
      } else if (isCheckbox) {
        finalChoiceVal = Array.isArray(val) ? JSON.stringify(val) : '[]';
      }

      return {
        questionId: q.id,
        rating: (isChoice || isCheckbox) ? null : (val || 0),
        choiceAnswer: finalChoiceVal
      };
    });

    // Verify all questions are answered
    const incomplete = answersArray.some(ans => {
      const q = courseInfo.questions.find(quest => quest.id === ans.questionId);
      if (q.question_type === 'choice') {
        return !ans.choiceAnswer;
      } else if (q.question_type === 'checkbox') {
        return !ans.choiceAnswer || ans.choiceAnswer === '[]';
      } else {
        return ans.rating === 0;
      }
    });

    if (incomplete) {
      setError('Lütfen listedeki tüm soruları cevaplayınız.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: courseInfo.survey_id,
          answers: answersArray,
          openEndedText
        })
      });

      let data;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Sunucu geçersiz yanıt verdi (Durum: ${res.status}). Detay: ${text.substring(0, 80)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Cevaplar gönderilemedi.');
      }

      if (typeof window !== 'undefined' && courseInfo.active_date) {
        localStorage.setItem(`survey_submitted_${courseInfo.survey_id}_${courseInfo.active_date}`, 'true');
      }
      setSuccess('Cevaplarınız başarıyla kaydedildi! Katkınız için teşekkür ederiz.');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-background">
        <div className="inline-block w-8 h-8 border-4 border-soft-stone border-t-carbon-ink rounded-full animate-spin"></div>
        <p className="text-ashen mt-4 text-xs uppercase font-medium">Değerlendirme soruları yükleniyor...</p>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen max-w-md mx-auto px-6 text-center bg-background animate-in fade-in duration-200">
        <div className="w-16 h-16 border border-mist rounded-lg flex items-center justify-center text-carbon-ink bg-paper-white mb-6">
          <ThumbsUp className="h-8 w-8" />
        </div>
        <h2 className="text-heading-sm font-anthropic-serif text-carbon-ink uppercase tracking-tight mb-2">Zaten Katılım Sağladınız</h2>
        <p className="text-ashen mb-6 text-xs uppercase font-medium">
          Bu oturum için daha önce geri bildirimde bulundunuz. Değerli katkılarınız için çok teşekkür ederiz!
        </p>
        <Link href="/" className="inline-flex items-center gap-2 text-carbon-ink hover:underline text-xs uppercase font-medium">
          <ArrowLeft className="h-4 w-4" /> Portal Ana Sayfasına Dön
        </Link>
      </div>
    );
  }

  if (error && !courseInfo) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen max-w-md mx-auto px-6 text-center bg-background">
        <div className="p-4 border border-clay text-clay bg-[#fdf3f0] rounded-lg mb-6 text-xs uppercase font-medium">
          {error}
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-carbon-ink hover:underline text-xs uppercase font-medium">
          <ArrowLeft className="h-4 w-4" /> Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  if (courseInfo && !courseInfo.active_date) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen max-w-md mx-auto px-6 text-center bg-background">
        <div className="w-16 h-16 border border-mist rounded-lg flex items-center justify-center text-ashen bg-paper-white mb-6">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-heading-sm font-anthropic-serif text-carbon-ink uppercase tracking-tight mb-2">Oturum Aktif Değil</h2>
        <p className="text-ashen mb-6 text-xs uppercase font-medium">
          Bu oturum henüz hocanız tarafından aktif edilmemiştir. Lütfen ders veya etkinlik esnasında hocanızın oturumu başlatmasını bekleyin.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 text-carbon-ink hover:underline text-xs uppercase font-medium">
          <ArrowLeft className="h-4 w-4" /> Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen py-12 px-6 relative bg-background text-foreground font-sans">
      <div className="max-w-2xl w-full mx-auto z-10 space-y-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2 text-ashen hover:text-carbon-ink text-xs uppercase font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Portal Ana Sayfası
          </Link>
          <span className="px-3 py-1 text-xs font-mono rounded-lg border border-mist bg-paper-white text-carbon-ink uppercase font-semibold">
            {courseInfo.survey_title}
          </span>
        </div>

        {/* Course Header */}
        <div className="text-center bg-paper-white p-8 rounded-[16px] border border-soft-stone shadow-sm">
          <div className="inline-flex items-center justify-center p-2.5 bg-soft-stone rounded-lg border border-mist mb-3">
            <GraduationCap className="h-5 w-5 text-carbon-ink" />
          </div>
          <span className="text-[10px] font-bold text-ashen uppercase tracking-widest font-mono block">
            {courseInfo.course_code}
          </span>
          <h1 className="text-heading font-anthropic-serif text-carbon-ink tracking-tight mt-1.5 mb-2 leading-none">
            {courseInfo.course_name}
          </h1>
          <p className="text-ashen text-xs uppercase">
            Öğretim Üyesi: <span className="text-carbon-ink font-semibold">{courseInfo.instructor_name}</span>
          </p>
        </div>

        {success ? (
          <div className="gleap-card p-10 text-center space-y-5 bg-paper-white rounded-[16px] border border-soft-stone shadow-sm">
            <div className="inline-flex items-center justify-center p-4 border border-mist bg-soft-stone rounded-lg text-carbon-ink mb-2">
              <ThumbsUp className="h-8 w-8 text-carbon-ink" />
            </div>
            <h2 className="text-heading font-anthropic-serif text-carbon-ink uppercase tracking-tight">Katkınız İçin Teşekkürler</h2>
            <p className="text-ashen text-center text-body-voice">{success}</p>
            <p className="text-[10px] text-ashen uppercase font-medium">Giriş sayfasına yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="gleap-card p-8 sm:p-10 space-y-8 bg-paper-white rounded-[16px] border border-soft-stone shadow-sm">
            
            {/* Dynamic Questions Rendering */}
            {courseInfo.questions.length === 0 ? (
              <div className="text-center py-8 text-ashen flex items-center justify-center gap-2 text-xs uppercase font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Bu oturum için henüz değerlendirme kriteri oluşturulmamış.</span>
              </div>
            ) : (
              <div className="space-y-8">
                {courseInfo.questions.map((q, idx) => {
                  const currentValue = answers[q.id];
                  const isChoice = q.question_type === 'choice';

                  return (
                    <div key={q.id} className="space-y-3 pb-6 border-b border-soft-stone last:border-b-0 last:pb-0">
                      <span className="block text-xs sm:text-sm font-semibold uppercase tracking-wider text-carbon-ink leading-snug">
                        {idx + 1}. {q.question_text} <span className="text-clay">*</span>
                      </span>

                      {/* Optional Question Image */}
                      {q.image_url && (
                        <div className="my-3 max-w-full sm:max-w-lg bg-soft-stone p-1.5 rounded-lg border border-mist">
                          <img
                            src={q.image_url}
                            alt={`Soru ${idx + 1} Görseli`}
                            className="rounded max-h-60 object-contain w-full"
                          />
                        </div>
                      )}

                      {/* Conditional rendering based on question type */}
                      {q.question_type === 'checkbox' ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {q.options && q.options.map((opt) => {
                            const isSelected = Array.isArray(currentValue) && currentValue.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleCheckboxChange(q.id, opt)}
                                className={`px-4 py-2.5 rounded-lg border text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-carbon-ink text-paper-white border-carbon-ink shadow-sm'
                                    : 'bg-paper-white hover:bg-soft-stone text-graphite border-mist'
                                }`}
                              >
                                <span className={`w-3.5 h-3.5 border rounded flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                  isSelected 
                                    ? 'border-paper-white bg-paper-white text-carbon-ink' 
                                    : 'border-pebble bg-paper-white text-transparent'
                                }`}>
                                  ✓
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : isChoice ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {q.options && q.options.map((opt) => {
                            const isSelected = currentValue === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleChoiceChange(q.id, opt)}
                                className={`px-4 py-2.5 rounded-lg border text-xs font-semibold uppercase transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-carbon-ink text-paper-white border-carbon-ink shadow-sm'
                                    : 'bg-paper-white hover:bg-soft-stone text-graphite border-mist'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRatingChange(q.id, star)}
                              className="p-1 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`h-7 w-7 ${
                                  star <= currentValue ? 'text-clay fill-clay' : 'text-pebble'
                                }`}
                              />
                            </button>
                          ))}
                          {currentValue > 0 && (
                            <span className="ml-3 text-xs font-medium text-ashen font-mono">({currentValue}/5)</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* General Open-Ended Box */}
            {courseInfo.questions.length > 0 && (
              <div className="pt-6 border-t border-soft-stone">
                <label className="block text-xs font-semibold uppercase tracking-wider text-carbon-ink mb-2.5">
                  Bu oturum hakkındaki ek görüş ve önerileriniz (Opsiyonel)
                </label>
                <textarea
                  rows={4}
                  value={openEndedText}
                  onChange={(e) => setOpenEndedText(e.target.value)}
                  placeholder="Görüş ve önerilerinizi buraya yazabilirsiniz..."
                  className="w-full px-4 py-3 bg-paper-white border border-mist focus:border-graphite text-sm text-carbon-ink placeholder-pebble rounded-lg outline-none transition-colors"
                />
              </div>
            )}

            {error && (
              <div className="p-3.5 border border-clay text-clay bg-[#fdf3f0] rounded-lg text-xs uppercase font-medium text-center">
                {error}
              </div>
            )}

            {courseInfo.questions.length > 0 && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 btn-primary font-semibold text-xs transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  'Gönderiliyor...'
                ) : (
                  <>
                    <ClipboardList className="h-4 w-4" /> Cevaplarımı Gönder
                  </>
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
