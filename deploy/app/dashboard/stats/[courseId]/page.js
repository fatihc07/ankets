'use strict';
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  ArrowLeft, Clipboard, FileText, TrendingUp, HelpCircle, 
  MessageSquare, Sparkles, AlertCircle, Info, Image
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function CourseStatsPage({ params }) {
  const { courseId } = use(params);
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [selectedDate, setSelectedDate] = useState('all'); // 'all' or specific date

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const url = `/api/courses/${courseId}/stats?date=${selectedDate}` + (selectedSurveyId ? `&surveyId=${selectedSurveyId}` : '');
        const res = await fetch(url);
        const statsData = await res.json();
        
        if (!res.ok) {
          throw new Error(statsData.error || 'İstatistik verileri yüklenemedi.');
        }
        setData(statsData);
        if (!selectedSurveyId && statsData.selectedSurveyId) {
          setSelectedSurveyId(String(statsData.selectedSurveyId));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [courseId, selectedDate, selectedSurveyId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-background">
        <div className="inline-block w-8 h-8 border-4 border-soft-stone border-t-carbon-ink rounded-full animate-spin"></div>
        <p className="text-ashen mt-4 text-xs uppercase font-medium">Veriler analiz ediliyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen max-w-md mx-auto px-6 text-center bg-background">
        <div className="p-4 border border-clay text-clay bg-[#fdf3f0] rounded-lg mb-6 text-xs uppercase font-medium">
          {error || 'Bir hata oluştu.'}
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-carbon-ink hover:underline text-xs uppercase font-medium">
          <ArrowLeft className="h-4 w-4" /> Panele Geri Dön
        </Link>
      </div>
    );
  }

  const { course, surveys, selectedSurveyTitle, submissionCount, comments, questionsStats, availableDates } = data;

  if (!surveys || surveys.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen max-w-md mx-auto px-6 text-center bg-background">
        <div className="w-16 h-16 border border-mist rounded-lg flex items-center justify-center text-ashen bg-paper-white mb-6">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-heading-sm font-anthropic-serif text-carbon-ink uppercase tracking-tight mb-2">Henüz Oturum Yok</h2>
        <p className="text-ashen mb-6 text-xs uppercase font-medium">
          Bu genel oturum için henüz bir oturum tanımlanmamıştır. Lütfen önce hoca panelinden bir oturum oluşturun.
        </p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-carbon-ink hover:underline text-xs uppercase font-medium">
          <ArrowLeft className="h-4 w-4" /> Panele Geri Dön
        </Link>
      </div>
    );
  }

  // Split questions into rating-based and choice-based
  const ratingQuestions = questionsStats.filter(q => q.type === 'rating');
  const choiceQuestions = questionsStats.filter(q => q.type === 'choice' || q.type === 'checkbox');

  // Truncate function for chart labels
  const truncateText = (text, max = 22) => {
    return text.length > max ? text.substring(0, max) + '...' : text;
  };

  // Chart configuration (Clay border with warm light orange fill)
  const chartData = {
    labels: ratingQuestions.map(q => truncateText(q.text)),
    datasets: [
      {
        label: `${selectedSurveyTitle || 'Oturum'} Ortalama Sonuçları`,
        data: ratingQuestions.map(q => q.avg.toFixed(2)),
        backgroundColor: '#fdf3f0', // Clay Tint
        borderColor: '#d97757', // Clay Orange Accent
        borderWidth: 1.5,
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#121212', // Carbon Ink
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#121212',
        bodyColor: '#121212',
        borderColor: '#efeeeb',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            return ratingQuestions[index].text;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: {
          color: '#7b7974', // Ashen
          stepSize: 1,
          font: {
            family: 'Inter, sans-serif',
            size: 10
          }
        },
        grid: {
          color: '#efeeeb' // Soft Stone
        }
      },
      x: {
        ticks: {
          color: '#121212', // Carbon Ink
          font: {
            family: 'Inter, sans-serif',
            weight: '500',
            size: 10
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Overall satisfaction score based on average of post ratings
  const calculateOverallSatisfaction = () => {
    const answeredQuestions = ratingQuestions.filter(q => q.avg > 0);
    if (answeredQuestions.length === 0) return 0;
    const sumOfAverages = answeredQuestions.reduce((sum, q) => sum + (q.avg / 5), 0);
    return (sumOfAverages / answeredQuestions.length) * 100;
  };

  // Calculate percentage helper for choice questions
  const getChoicePercent = (count, total) => {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen relative pb-16 bg-background text-foreground font-sans">
      {/* Header */}
      <header className="border-b border-mist bg-paper-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 text-ashen hover:text-carbon-ink rounded-lg border border-mist hover:bg-soft-stone transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-ashen uppercase tracking-widest font-mono block">
                {course.code} ANALİZİ
              </span>
              <h1 className="text-md font-medium text-carbon-ink uppercase mt-0.5 leading-none truncate font-anthropic-serif">
                {course.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Survey Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-ashen uppercase tracking-wider hidden lg:inline">Oturum:</span>
              <select
                value={selectedSurveyId}
                onChange={(e) => {
                  setSelectedSurveyId(e.target.value);
                  setSelectedDate('all'); // Reset date filter when changing survey
                }}
                className="bg-paper-white border border-mist focus:border-graphite px-3 py-2 rounded-lg text-xs font-semibold text-carbon-ink focus:outline-none cursor-pointer hover:bg-soft-stone"
              >
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-ashen uppercase tracking-wider hidden lg:inline">Tarih:</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-paper-white border border-mist focus:border-graphite px-3 py-2 rounded-lg text-xs font-semibold text-carbon-ink focus:outline-none cursor-pointer hover:bg-soft-stone"
              >
                <option value="all">Tüm Tarihler (Birleştirilmiş)</option>
                {availableDates && availableDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Body */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 space-y-8 z-10">

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block">
                Toplam Katılımcı
              </span>
              <span className="text-xl font-bold text-carbon-ink mt-1 block uppercase">
                {submissionCount} Öğrenci
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <Clipboard className="h-5 w-5" />
            </div>
          </div>

          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block">
                Değerlendirilen Oturum
              </span>
              <span className="text-sm font-bold text-carbon-ink mt-2 block truncate max-w-[200px] uppercase font-sans">
                {selectedSurveyTitle}
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block">
                Memnuniyet / Puan Ortalaması
              </span>
              <span className="text-xl font-bold text-carbon-ink mt-1 block flex items-center gap-1.5 uppercase font-sans">
                {submissionCount > 0 && ratingQuestions.length > 0 ? `${calculateOverallSatisfaction().toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Ratings Chart & Averages List Row */}
        {ratingQuestions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="gleap-card p-6 bg-paper-white border border-soft-stone lg:col-span-2 flex flex-col rounded-[16px] shadow-sm">
              <div className="mb-4">
                <span className="px-3 py-1 bg-soft-stone border border-mist text-ashen rounded-lg text-[10px] font-bold uppercase tracking-wider font-sans">
                  Ortalama Skorlar (Grafik)
                </span>
                <h3 className="text-sm font-semibold text-carbon-ink mt-1.5 uppercase font-anthropic-serif">
                  Soru Bazlı Memnuniyet Dağılımı
                </h3>
              </div>
              <div className="h-80 relative w-full flex-1">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <span className="px-3 py-1 bg-soft-stone border border-mist text-ashen rounded-lg text-[10px] font-bold uppercase tracking-wider font-sans">
                    Soru Listesi
                  </span>
                  <h3 className="text-sm font-semibold text-carbon-ink mt-1.5 uppercase font-anthropic-serif">
                    Detaylı Ortalama Puanlar
                  </h3>
                </div>
                
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {ratingQuestions.map((item) => {
                    return (
                      <div key={item.id} className="p-3.5 bg-soft-stone rounded-lg border border-transparent flex justify-between items-center gap-4">
                        <span className="text-xs font-semibold text-carbon-ink uppercase leading-snug line-clamp-2">
                          {item.text}
                        </span>
                        <span className="text-carbon-ink font-bold bg-paper-white px-2.5 py-1 rounded border border-mist text-xs font-mono shrink-0">
                          {item.avg > 0 ? `${item.avg.toFixed(1)} / 5.0` : 'Veri Yok'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6 text-[10px] text-ashen uppercase italic p-3 bg-soft-stone rounded-lg border border-transparent font-sans">
                * Değerlendirmeler 1 (en düşük) ile 5 (en yüksek) arasındadır.
              </div>
            </div>
          </div>
        )}

        {/* Choice Questions Distribution Analysis (Only shown if choice questions exist) */}
        {choiceQuestions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-carbon-ink flex items-center gap-2 uppercase font-anthropic-serif">
              <HelpCircle className="h-4 w-4 text-carbon-ink text-clay" /> Çoktan Seçmeli (Şıklı) Soruların Dağılım Analizi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {choiceQuestions.map((item) => (
                <div key={item.id} className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] shadow-sm flex flex-col space-y-4">
                  <div>
                    <span className="px-3 py-1 bg-soft-stone text-ashen rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {item.type === 'checkbox' ? 'Çoklu Seçimli (Checkbox)' : 'Çoktan Seçmeli'}
                    </span>
                    <h4 className="text-xs uppercase font-semibold text-carbon-ink tracking-wider mt-2 leading-snug">
                      {item.text}
                    </h4>
                  </div>

                  {/* Question Image in Stats if present */}
                  {item.image_url && (
                    <div className="max-w-xs bg-soft-stone p-1 rounded-lg border border-mist">
                      <img
                        src={item.image_url}
                        alt="Soru Görseli"
                        className="rounded max-h-36 object-contain w-full"
                      />
                    </div>
                  )}

                  {/* Option Bars */}
                  <div className="space-y-3 pt-1">
                    {item.options && item.options.map((opt) => {
                      const votes = item.choices?.[opt] || 0;
                      const percent = getChoicePercent(votes, submissionCount);

                      return (
                        <div key={opt} className="space-y-1 bg-soft-stone p-3.5 rounded-lg border border-transparent">
                          <span className="text-xs font-semibold text-carbon-ink uppercase block">{opt}</span>
                          <div className="flex justify-between items-center text-[10px] text-ashen font-medium uppercase tracking-wider font-sans">
                            <span>Katılım Oranı</span>
                            <span className="font-mono text-carbon-ink font-semibold">{votes} oy ({percent}%)</span>
                          </div>
                          <div className="w-full bg-paper-white h-2.5 rounded-lg overflow-hidden border border-mist">
                            <div
                              className="bg-clay h-full rounded-lg transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Comments Columns */}
        <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] shadow-sm">
          <h3 className="text-sm font-semibold text-carbon-ink mb-4 pb-2 border-b border-soft-stone uppercase flex items-center gap-2 font-anthropic-serif">
            <MessageSquare className="h-4 w-4 text-carbon-ink text-clay" /> Öğrencilerin Yazılı Yorum ve Geri Bildirimleri ({comments.length})
          </h3>
          {comments.length === 0 ? (
            <p className="text-ashen text-xs uppercase font-medium italic">Yazılı yorum bulunmuyor.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
              {comments.map((comment, index) => (
                <div key={index} className="p-4 bg-soft-stone rounded-lg border border-transparent text-xs text-carbon-ink leading-relaxed uppercase font-normal">
                  "{comment}"
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
