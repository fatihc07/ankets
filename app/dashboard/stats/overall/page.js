'use strict';
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, BarChart3, Clipboard, FileText, Sparkles, TrendingUp, Info } from 'lucide-react';
import * as d3 from 'd3';

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

export default function OverallStatsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const svgRef = useRef(null);

  useEffect(() => {
    async function fetchOverallStats() {
      try {
        const res = await fetch('/api/courses/stats/overall');
        const statsData = await res.json();
        
        if (!res.ok) {
          throw new Error(statsData.error || 'Genel istatistikler yüklenemedi.');
        }
        setData(statsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOverallStats();
  }, []);

  // D3.js Chart Drawing Hook
  useEffect(() => {
    if (!data || !data.coursesStats || data.coursesStats.length === 0 || !svgRef.current) return;

    const chartData = data.coursesStats;

    // Set up dimensions
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove(); // Clear previous render

    const margin = { top: 40, right: 30, bottom: 60, left: 50 };
    const width = 800;
    const height = 450;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main SVG container attributes
    svgElement
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    const g = svgElement.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const x0Scale = d3.scaleBand()
      .domain(chartData.map(d => d.code))
      .range([0, innerWidth])
      .paddingInner(0.2);

    const x1Scale = d3.scaleBand()
      .domain(['pre', 'post'])
      .range([0, x0Scale.bandwidth()])
      .padding(0.05);

    const yScale = d3.scaleLinear()
      .domain([0, 5])
      .range([innerHeight, 0]);

    // Color mapping (Soft Stone for Pre, Carbon Ink for Post)
    const colorScale = d3.scaleOrdinal()
      .domain(['pre', 'post'])
      .range(['#efeeeb', '#121212']);

    // Add subtle horizontal grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(5))
      .join("line")
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("stroke", "#e7e6e1") // Chalk grid lines
      .attr("stroke-width", 1);

    // Draw X-axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0Scale))
      .selectAll("text")
      .attr("fill", "#121212") // Carbon Ink
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("text-transform", "uppercase");

    // Draw Y-axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll("text")
      .attr("fill", "#7b7974") // Ashen
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "10px");

    // Set axis lines stroke colors
    g.selectAll(".domain").attr("stroke", "#efeeeb");
    g.selectAll(".tick line").attr("stroke", "#efeeeb");

    // Tooltip selection
    const tooltip = d3.select("#d3-tooltip");

    // Draw bars
    const courseGroups = g.selectAll(".course-group")
      .data(chartData)
      .join("g")
      .attr("class", "course-group")
      .attr("transform", d => `translate(${x0Scale(d.code)}, 0)`);

    // Pre bars
    courseGroups.append("rect")
      .attr("x", x1Scale('pre'))
      .attr("y", d => yScale(d.preAvg || 0))
      .attr("width", x1Scale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.preAvg || 0))
      .attr("fill", colorScale('pre'))
      .attr("rx", 4)
      .attr("stroke", "#b7b7b5")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", "0.8");
        tooltip
          .style("opacity", 1)
          .style("visibility", "visible")
          .html(`
            <div class="font-bold text-xs text-carbon-ink uppercase tracking-wider">${d.code} - ${d.name}</div>
            <div class="text-[10px] text-ashen mt-1 uppercase font-semibold">Dönem Başı Beklenti Ortalama:</div>
            <div class="text-sm font-bold text-clay font-mono">${d.preAvg > 0 ? d.preAvg.toFixed(2) + ' / 5.00' : 'Veri Yok'}</div>
            <div class="text-[9px] text-ashen mt-0.5 uppercase">Toplam Yanıt: ${d.preCount} öğrenci</div>
          `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.clientX + 15) + "px")
          .style("top", (event.clientY - 15) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", "1");
        tooltip.style("opacity", 0).style("visibility", "hidden");
      });

    // Draw Post bars
    courseGroups.append("rect")
      .attr("x", x1Scale('post'))
      .attr("y", d => yScale(d.postAvg || 0))
      .attr("width", x1Scale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.postAvg || 0))
      .attr("fill", colorScale('post'))
      .attr("rx", 4)
      .attr("stroke", "#121212")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", "0.9");
        tooltip
          .style("opacity", 1)
          .style("visibility", "visible")
          .html(`
            <div class="font-bold text-xs text-carbon-ink uppercase tracking-wider">${d.code} - ${d.name}</div>
            <div class="text-[10px] text-ashen mt-1 uppercase font-semibold">Dönem Sonu Gerçekleşen Ortalama:</div>
            <div class="text-sm font-bold text-carbon-ink font-mono">${d.postAvg > 0 ? d.postAvg.toFixed(2) + ' / 5.00' : 'Veri Yok'}</div>
            <div class="text-[9px] text-ashen mt-0.5 uppercase">Toplam Yanıt: ${d.postCount} öğrenci</div>
          `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.clientX + 15) + "px")
          .style("top", (event.clientY - 15) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", "1");
        tooltip.style("opacity", 0).style("visibility", "hidden");
      });

  }, [data]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-background">
        <div className="inline-block w-8 h-8 border-4 border-soft-stone border-t-carbon-ink rounded-full animate-spin"></div>
        <p className="text-ashen mt-4 text-xs uppercase font-medium">Akademik analizler toparlanıyor...</p>
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

  const { totalCourses, totalPreCount, totalPostCount, coursesStats } = data;

  // Calculate overall satisfaction percentage across all courses
  const calculateDeptSatisfaction = () => {
    const coursesWithPost = coursesStats.filter(c => c.postAvg > 0);
    if (coursesWithPost.length === 0) return 0;
    const avgSum = coursesWithPost.reduce((sum, c) => sum + (c.postAvg / 5), 0);
    return (avgSum / coursesWithPost.length) * 100;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen relative pb-16 bg-background text-foreground font-sans">
      {/* D3 Tooltip Element */}
      <div
        id="d3-tooltip"
        className="absolute pointer-events-none opacity-0 invisible bg-paper-white border border-mist p-4 rounded-lg z-50 transition-opacity duration-150 max-w-xs uppercase tracking-wider text-carbon-ink shadow-lg"
        style={{ transition: 'opacity 0.15s ease-out' }}
      ></div>

      {/* Header */}
      <header className="border-b border-mist bg-paper-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 text-ashen hover:text-carbon-ink rounded-lg border border-mist hover:bg-soft-stone transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-widest font-mono">
                BÖLÜM ANALİZ MERKEZİ
              </span>
              <h1 className="text-md font-medium text-carbon-ink uppercase mt-0.5 leading-none font-anthropic-serif">
                Genel Akademik İstatistikler <span className="text-clay text-xs">✦</span>
              </h1>
            </div>
          </div>
          <div className="text-right text-xs text-ashen hidden sm:block uppercase font-medium">
            <span>D3.js Veri Analizi</span>
          </div>
        </div>
      </header>

      {/* Stats Body */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 space-y-8 z-10">
        
        {/* Department Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block font-sans">
                Toplam Ders Sayısı
              </span>
              <span className="text-xl font-bold text-carbon-ink mt-1 block uppercase">
                {totalCourses} ders
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block font-sans">
                Dönem Başı Katılım
              </span>
              <span className="text-xl font-bold text-carbon-ink mt-1 block uppercase">
                {totalPreCount} oylama
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <Clipboard className="h-5 w-5" />
            </div>
          </div>

          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block font-sans">
                Dönem Sonu Katılım
              </span>
              <span className="text-xl font-bold text-carbon-ink mt-1 block uppercase">
                {totalPostCount} oylama
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-ashen uppercase tracking-wider block font-sans">
                Ortalama Memnuniyet
              </span>
              <span className="text-xl font-bold text-carbon-ink mt-1 block flex items-center gap-1.5 uppercase">
                {totalPostCount > 0 ? `${calculateDeptSatisfaction().toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div className="p-3 bg-soft-stone border border-mist text-carbon-ink rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Dynamic D3 Chart Panel */}
        <div className="gleap-card p-6 bg-paper-white border border-soft-stone rounded-[16px] flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-soft-stone pb-4">
            <div>
              <h3 className="text-sm font-semibold text-carbon-ink flex items-center gap-2 uppercase font-anthropic-serif">
                <BarChart3 className="h-4 w-4" /> D3.js Ders Bazlı Karşılaştırma Grafiği
              </h3>
              <p className="text-ashen text-xs mt-0.5 uppercase font-medium">
                Tüm derslerin dönem başı beklenti (açık gri) ve dönem sonu gerçekleşme (warm near-black) puan ortalamaları.
              </p>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-[10px] font-bold text-ashen uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#efeeeb] border border-mist"></span>
                <span>Dönem Başı Beklentiler</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#121212] border border-[#121212]"></span>
                <span>Dönem Sonu Memnuniyet</span>
              </div>
            </div>
          </div>
          
          <div className="relative w-full overflow-x-auto">
            {coursesStats.length === 0 ? (
              <div className="h-80 flex flex-col justify-center items-center text-ashen text-xs uppercase font-medium">
                <span>Herhangi bir ders verisi bulunamadı.</span>
              </div>
            ) : (
              <div className="min-w-[650px] h-[450px]">
                <svg ref={svgRef} className="w-full h-full"></svg>
              </div>
            )}
          </div>
        </div>

        {/* Courses Detailed Stats Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-carbon-ink flex items-center gap-2 uppercase font-anthropic-serif">
            <Info className="h-4 w-4 text-carbon-ink animate-pulse text-clay" /> Ders Kıyaslama Tablosu
          </h3>

          {coursesStats.length === 0 ? (
            <div className="text-center py-12 bg-paper-white border border-soft-stone rounded-[16px]">
              <p className="text-ashen text-xs uppercase font-medium">Veri bulunmuyor.</p>
            </div>
          ) : (
            <div className="gleap-card overflow-hidden bg-paper-white border border-soft-stone rounded-[16px] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-carbon-ink">
                  <thead className="bg-soft-stone border-b border-mist text-carbon-ink font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Ders</th>
                      <th className="px-6 py-4">Öğrenci Sayısı (Pre/Post)</th>
                      <th className="px-6 py-4">Beklenti Ort.</th>
                      <th className="px-6 py-4">Memnuniyet Ort.</th>
                      <th className="px-6 py-4 text-right">Fark / Kayma (Shift)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-stone">
                    {coursesStats.map((c) => {
                      const shiftStyle = c.shift === 0
                        ? 'text-ashen font-medium'
                        : c.shift > 0
                          ? 'border border-carbon-ink text-carbon-ink bg-soft-stone px-3 py-1 rounded font-semibold text-xs'
                          : 'border border-clay text-clay bg-[#fdf3f0] px-3 py-1 rounded font-semibold text-xs';

                      return (
                        <tr key={c.id} className="hover:bg-soft-stone/30 transition-colors">
                          <td className="px-6 py-4.5 font-medium text-carbon-ink uppercase">
                            <span className="font-mono text-[10px] px-3 py-1 bg-paper-white border border-mist rounded-[8px] mr-2 font-bold">
                              {c.code}
                            </span>
                            {c.name}
                          </td>
                          <td className="px-6 py-4.5 font-medium text-ashen uppercase text-xs">
                            {c.preCount} / {c.postCount} oylama
                          </td>
                          <td className="px-6 py-4.5 font-medium text-carbon-ink font-mono">
                            {c.preCount > 0 ? c.preAvg.toFixed(2) : '-'}
                          </td>
                          <td className="px-6 py-4.5 font-medium text-carbon-ink font-mono">
                            {c.postCount > 0 ? c.postAvg.toFixed(2) : '-'}
                          </td>
                          <td className="px-6 py-4.5 text-right font-mono">
                            <span className={shiftStyle}>
                              {c.shift > 0 ? `+${c.shift.toFixed(2)}` : c.shift === 0 ? '0.00' : c.shift.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
