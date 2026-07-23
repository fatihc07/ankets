'use strict';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, ClipboardCheck, ArrowRight, UserCheck, Sparkles } from 'lucide-react';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [activeSurveys, setActiveSurveys] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch('/api/courses/public');
        if (res.ok) {
          const data = await res.json();
          setCourses(data.courses || []);
          setActiveSurveys(data.activeSurveys || []);
        }
      } catch (err) {
        console.error('Error fetching public courses:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.instructor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground font-sans relative">
      {/* Navigation Header */}
      <header className="border-b border-mist bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-soft-stone rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-carbon-ink" />
            </div>
            <span className="font-anthropic-serif text-xl font-normal text-carbon-ink flex items-center gap-1.5">
              Bölüm Oturum Portalı <span className="text-clay text-sm">✦</span>
            </span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 btn-secondary text-sm font-medium flex items-center gap-2 cursor-pointer transition-all"
          >
            <UserCheck className="h-4 w-4" /> Akademisyen Girişi
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 relative">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fdf3f0] border border-[#fbe5dc] rounded-full text-clay text-xs font-semibold uppercase tracking-wider font-sans">
            <Sparkles className="h-3.5 w-3.5 text-clay" /> Katılım Portalı
          </div>
          
          <h1 className="text-heading sm:text-4xl md:text-5xl font-anthropic-serif text-carbon-ink leading-tight">
            Görüşlerinizi Paylaşın, <span className="italic text-clay">Eğitimi Geliştirin</span>
          </h1>
          
          <p className="text-ashen text-body sm:text-base max-w-xl mx-auto leading-relaxed font-sans">
            Aktif oturumlardan dilediğinizi seçerek oylama ve değerlendirme kriterlerini doldurun. Eğitim ve sunum kalitemizi birlikte geliştirelim.
          </p>
        </div>

        {/* Search Bar - Claude Input */}
        <div className="max-w-lg mx-auto mb-16">
          <input
            type="text"
            placeholder="Oturum adı, kodu veya akademisyen arayın..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-paper-white border border-mist focus:border-graphite text-sm text-carbon-ink placeholder-pebble rounded-lg outline-none transition-colors"
          />
        </div>

        {/* Courses Section */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-soft-stone border-t-carbon-ink rounded-full animate-spin"></div>
            <p className="text-ashen mt-4 text-xs uppercase font-medium">Oturum listesi yükleniyor...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-paper-white rounded-2xl border border-soft-stone max-w-xl mx-auto space-y-4 shadow-sm">
            <BookOpen className="h-10 w-10 text-ashen mx-auto" />
            <h3 className="text-heading-sm font-anthropic-serif text-carbon-ink">Henüz Kayıtlı Genel Oturum Yok</h3>
            <p className="text-ashen text-sm max-w-xs mx-auto">
              Aradığınız oturumun akademisyeni henüz kayıt yapmamış olabilir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => {
              const courseActiveSurveys = activeSurveys.filter(s => s.course_id === course.id) || [];
              
              return (
                <div key={course.id} className="gleap-card p-8 flex flex-col justify-between group bg-paper-white">
                  <div>
                    {/* Badge Row */}
                    <div className="flex justify-between items-center mb-6">
                      <span className="px-3 py-1 bg-soft-stone text-graphite text-xs font-mono rounded-lg font-semibold border border-transparent">
                        {course.code}
                      </span>
                      <span className="text-[12px] text-ashen uppercase font-medium">
                        {new Date(course.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    {/* Title & Instructor */}
                    <h3 className="text-heading-sm font-anthropic-serif text-carbon-ink mb-2 leading-tight">
                      {course.name}
                    </h3>
                    <p className="text-ashen text-xs uppercase mb-6 tracking-wide font-sans">
                      Öğretim Üyesi: <span className="text-carbon-ink font-semibold">{course.instructor_name}</span>
                    </p>
                  </div>

                  {/* Active surveys links using Claude Inline Link Style */}
                  <div className="space-y-3 pt-6 border-t border-soft-stone">
                    <span className="block text-[11px] font-bold text-ashen uppercase tracking-wider mb-2 font-sans">Aktif Değerlendirmeler</span>
                    {courseActiveSurveys.length === 0 ? (
                      <p className="text-sm text-pebble italic py-2">Şu an aktif bir katılım oturumu bulunmuyor.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {courseActiveSurveys.map((survey) => (
                          <Link
                            key={survey.id}
                            href={`/survey/${survey.id}`}
                            className="inline-flex items-center gap-1.5 text-graphite hover:text-carbon-ink hover:underline text-[15px] font-medium py-1"
                          >
                            {survey.title} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
