import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnnualReport } from '../../hooks/useDashboardData';
import { motion } from 'framer-motion';
import { IconArrowLeft, IconDownload, IconShare } from '@tabler/icons-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const AnnualReport = () => {
  const { year } = useParams();
  const { data: report, isLoading } = useAnnualReport(parseInt(year || '2024'));
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    // Temporarily disable scroll snapping for canvas rendering
    reportRef.current.style.overflowY = 'visible';
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      windowHeight: reportRef.current.scrollHeight
    });
    
    reportRef.current.style.overflowY = 'auto'; // Restore
    
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Cognify_Annual_Report_${year}.pdf`);
  };

  if (isLoading || !report) return <div className="h-screen flex items-center justify-center bg-[#121212] text-white">Loading your year...</div>;

  const identityData = Object.entries(report.identity_progress).map(([key, value]) => ({
    subject: key,
    A: (value as number) * 100,
    fullMark: 100,
  }));

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Sticky Header */}
      <div className="fixed top-0 w-full p-6 flex justify-between items-center z-50 mix-blend-difference">
        <Link to="/dashboard" className="flex items-center gap-2 text-white hover:text-[#6C4FF6] transition font-bold">
          <IconArrowLeft size={20} /> Back
        </Link>
        <div className="flex gap-4">
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-md transition">
            <IconDownload size={16} /> Save PDF
          </button>
          <button className="flex items-center gap-2 text-sm font-bold bg-[#6C4FF6] hover:bg-[#5b3ce0] px-4 py-2 rounded-full transition">
            <IconShare size={16} /> Share
          </button>
        </div>
      </div>

      {/* Snap Scrolling Container */}
      <div ref={reportRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth hide-scrollbar">
        
        {/* Intro Slide */}
        <section className="h-screen w-full snap-start flex flex-col items-center justify-center relative p-8">
          <div className="absolute inset-0 bg-gradient-to-b from-[#6C4FF6]/20 to-transparent" />
          <motion.h1 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-7xl md:text-9xl font-black text-center tracking-tighter"
          >
            {year}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl mt-4 text-slate-400 font-light"
          >
            Your Mind in Review
          </motion.p>
        </section>

        {/* Stats Slide */}
        <section className="h-screen w-full snap-start flex flex-col items-center justify-center p-8 bg-[#0a0a0a]">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold mb-12 text-[#6C4FF6]">Your Year in Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl">
              <div>
                <div className="text-5xl font-black mb-2">{report.total_content_analyzed}</div>
                <div className="text-sm text-slate-400 uppercase tracking-widest">Pieces Analyzed</div>
              </div>
              <div>
                <div className="text-5xl font-black mb-2">{report.total_hours_saved}h</div>
                <div className="text-sm text-slate-400 uppercase tracking-widest">Time Reclaimed</div>
              </div>
              <div>
                <div className="text-5xl font-black mb-2">{Math.round(report.average_goal_alignment * 100)}%</div>
                <div className="text-sm text-slate-400 uppercase tracking-widest">Avg Alignment</div>
              </div>
              <div>
                <div className="text-5xl font-black mb-2">{report.longest_streak}</div>
                <div className="text-sm text-slate-400 uppercase tracking-widest">Day Streak</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Identity Slide */}
        <section className="h-screen w-full snap-start flex flex-col md:flex-row items-center justify-center p-8 bg-[#1a1a1a]">
          <div className="md:w-1/2 md:pr-12 mb-8 md:mb-0">
            <motion.h2 
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            >
              You grew closer to your <span className="text-[#6C4FF6]">Ideal Self</span>.
            </motion.h2>
            <p className="text-xl text-slate-400 font-light">
              Your content diet aligned heavily with the "Deep Thinker" identity.
            </p>
          </div>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="h-[400px] w-full md:w-1/2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={identityData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#A7A9BE', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Alignment" dataKey="A" stroke="#6C4FF6" fill="#6C4FF6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </section>
        
      </div>
    </div>
  );
};

export default AnnualReport;
