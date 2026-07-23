'use strict';
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ThumbsUp, ArrowLeft, Star, GraduationCap, AlertCircle, Sparkles } from 'lucide-react';

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

export default function MasterCourseSurveyPage({ params }) {
  const { courseId } = use(params);
  const router = useRouter();

  const [courseInfo, setCourseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Form answers map
  const [answers, setAnswers] = useState({});
  const [openEndedText, setOpenEndedText] = useState('');

  useEffect(() => {
    async function fetchDetails() {
      try {
        setError('');
        setLoading(true);

        const isTestMode = typeof window !== 'undefined' && (
          window.location.search.includes('reset=1') || 
          window.location.search.includes('test=1')
        );

        const testQuery = isTestMode ? '&test=1' : '';
        const res = await fetch(`/api/survey?courseId=${courseId}${testQuery}`);
        
        let data;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(`Sunucu yanıt hatası: ${text.substring(0, 80)}`);
        }

        if (!res.ok) {
          throw new Error(data.error || 'Oturum detayları alınamadı.');
        }

        if (!isTestMode && data.alreadySubmitted) {
          setAlreadySubmitted(true);
          return;
        }

        setCourseInfo(data);
        
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
  }, [courseId]);

  const handleRatingChange = (questionId, ratingValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: ratingValue
    }));
  };

  const handleChoiceChange = (questionId, choiceValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: choiceValue
    }));
  };

  const handleCheckboxToggle = (questionId, optionValue) => {
    setAnswers(prev => {
      const currentList = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (currentList.includes(optionValue)) {
        return { ...prev, [questionId]: currentList.filter(item => item !== optionValue) };
      } else {
        return { ...prev, [questionId]: [...currentList, optionValue] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseInfo) return;

    // Validate required questions
    for (const q of courseInfo.questions) {
      const ans = answers[q.id];
      if (q.question_type === 'rating' && (!ans || ans === 0)) {
        alert(`Lütfen "${q.question_text}" sorusunu yıldız vererek değerlendirin.`);
        return;
      }
      if (q.question_type === 'choice' && (!ans || !ans.trim())) {
        alert(`Lütfen "${q.question_text}" sorusu için bir seçenek işaretleyin.`);
        return;
      }
      if (q.question_type === 'checkbox' && (!Array.isArray(ans) || ans.length === 0)) {
        alert(`Lütfen "${q.question_text}" sorusu için en az bir seçenek işaretleyin.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const answersArray = courseInfo.questions.map(q => {
        const rawAns = answers[q.id];
        let choiceStr = null;
        let ratingNum = null;

        if (q.question_type === 'choice') {
          choiceStr = String(rawAns);
        } else if (q.question_type === 'checkbox') {
          choiceStr = Array.isArray(rawAns) ? rawAns.join(', ') : String(rawAns);
        } else {
          ratingNum = Number(rawAns);
        }

        return {
          questionId: q.id,
          rating: ratingNum,
          choiceAnswer: choiceStr
        };
      });

      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: courseInfo.survey_id,
          answers: answersArray,
          openEndedText: openEndedText.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gönderim başarısız oldu.');
      }

      setSuccess('Değerlendirmeniz ve cevaplarınız başarıyla kaydedilmiştir. Katılımınız için çok teşekkür ederiz!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="inline-block w-8 h-8 border-4 border-soft-stone border-t-carbon-ink rounded-full animate-spin"></div>
        <p className="text-ashen mt-4 text-xs font-mono uppercase tracking-wider">Etkinlik Oturumu Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="gleap-card max-w-md w-full p-8 text-center bg-paper-white border border-soft-stone rounded-[24px] shadow-xl space-y-4">
          <div className="inline-flex p-3 bg-[#fdf3f0] border border-[#fbe5dc] rounded-full text-clay mb-2">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-carbon-ink font-anthropic-serif">Etkinlik Duyurusu</h2>
          <p className="text-xs text-ashen leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="gleap-card max-w-md w-full p-8 text-center bg-paper-white border border-soft-stone rounded-[24px] shadow-xl space-y-4">
          <div className="inline-flex p-3 bg-soft-stone border border-mist rounded-full text-carbon-ink mb-2">
            <ThumbsUp className="h-8 w-8 text-clay" />
          </div>
          <h2 className="text-lg font-bold text-carbon-ink font-anthropic-serif uppercase">Daha Önce Katıldınız</h2>
          <p className="text-xs text-ashen leading-relaxed">
            Bu günkü oturum için katılımınız daha önce kaydedilmiştir. Değerli katkılarınız için teşekkür ederiz.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="gleap-card max-w-md w-full p-8 text-center bg-paper-white border border-soft-stone rounded-[24px] shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="inline-flex p-3 bg-[#fdf3f0] border border-[#fbe5dc] rounded-full text-clay mb-2">
            <ThumbsUp className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-carbon-ink font-anthropic-serif uppercase">Teşekkür Ederiz!</h2>
          <p className="text-xs text-ashen leading-relaxed">{success}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans py-8 px-4">
      <main className="max-w-xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-soft-stone rounded-full text-[10px] font-bold text-clay uppercase tracking-widest border border-mist">
            <Sparkles className="h-3 w-3" /> {courseInfo?.course_code} - {courseInfo?.course_name}
          </div>
          <h1 className="text-2xl font-bold text-carbon-ink font-anthropic-serif tracking-tight uppercase">
            {courseInfo?.survey_title}
          </h1>
          {courseInfo?.instructor_name && (
            <p className="text-xs text-ashen uppercase font-medium">
              Eğitmen / Konuşmacı: {courseInfo.instructor_name}
            </p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[24px] shadow-sm space-y-6">
          <div className="space-y-6">
            {courseInfo?.questions?.map((q, index) => (
              <div key={q.id} className="p-4 bg-soft-stone rounded-xl border border-mist space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-clay uppercase tracking-wider block">
                    Soru {index + 1}
                  </span>
                  <p className="text-xs font-bold text-carbon-ink leading-snug">
                    {q.question_text}
                  </p>
                </div>

                {q.image_url && (
                  <div className="my-2 rounded-lg overflow-hidden border border-mist">
                    <img src={q.image_url} alt="Soru Görseli" className="w-full h-auto max-h-56 object-cover" />
                  </div>
                )}

                {/* Rating stars */}
                {q.question_type === 'rating' && (
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingChange(q.id, star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= (answers[q.id] || 0)
                              ? 'text-clay fill-clay'
                              : 'text-pebble hover:text-clay/50'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Choice radio buttons */}
                {q.question_type === 'choice' && q.options && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          answers[q.id] === opt
                            ? 'bg-paper-white border-carbon-ink text-carbon-ink shadow-sm'
                            : 'bg-paper-white/50 border-mist text-ashen hover:border-graphite'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question_${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleChoiceChange(q.id, opt)}
                          className="accent-clay h-4 w-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox buttons */}
                {q.question_type === 'checkbox' && q.options && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, oIdx) => {
                      const selectedList = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                      const isChecked = selectedList.includes(opt);
                      return (
                        <label
                          key={oIdx}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-paper-white border-carbon-ink text-carbon-ink shadow-sm'
                              : 'bg-paper-white/50 border-mist text-ashen hover:border-graphite'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={opt}
                            checked={isChecked}
                            onChange={() => handleCheckboxToggle(q.id, opt)}
                            className="accent-clay h-4 w-4 rounded"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Open Ended Comment */}
            <div className="p-4 bg-soft-stone rounded-xl border border-mist space-y-2">
              <label className="block text-[10px] font-bold text-clay uppercase tracking-wider">
                Görüş, Öneri veya Sorularınız (İsteğe Bağlı)
              </label>
              <textarea
                rows={3}
                placeholder="Düşüncelerinizi buraya yazabilirsiniz..."
                value={openEndedText}
                onChange={(e) => setOpenEndedText(e.target.value)}
                className="w-full p-3 bg-paper-white border border-mist rounded-lg text-xs text-carbon-ink focus:border-graphite focus:outline-none placeholder-pebble"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-carbon-ink text-paper-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? 'Gönderiliyor...' : 'Anketi Tamamla ve Gönder'}
          </button>
        </form>
      </main>
    </div>
  );
}
