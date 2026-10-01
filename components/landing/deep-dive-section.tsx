import { Highlighter, Headphones, BarChart3, Users, AlertCircle, Bot, BookMarked, BookOpen, Play, Volume2, AlertTriangle, CheckCircle2 } from "@/components/ui/icons"

export function DeepDiveSection() {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10 space-y-32">
        
        {/* =======================
            SECTION 1: STUDENT
        ======================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content Left */}
          <div className="order-2 lg:order-1 animate-landing-fade-in-up">
            {/* Badge — literal #006A6E on white bg = 5.4:1 ✓ */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#006A6E]/20 text-[#006A6E] font-semibold text-sm mb-6 drop-shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006A6E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006A6E]"></span>
              </span>
              Student Experience
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900 font-serif leading-tight">
              A distraction-free reader that <span className="text-[#B45309]">teaches back.</span>
            </h2>
            
            <p className="text-lg text-slate-700 mb-8 leading-relaxed">
              Why leave the textbook to search for answers? With Book Buddy, the book itself becomes the tutor. Highlight, listen, and chat directly with the context of the page.
            </p>

            <ul className="space-y-5">
              {[
                { icon: Highlighter, title: "Distraction-free Reading", desc: "Clean interface exactly respecting publisher layouts." },
                { icon: Bot, title: "Chat with Varta", desc: "Select a paragraph and ask Varta for an instant, citation-backed explanation." },
                { icon: BookMarked, title: "Sanchika Smart Notebook", desc: "All your highlights, flashcards, and AI explanations collected in one evolving archive." },
                { icon: Headphones, title: "Listen with Text-to-Speech", desc: "Natural voice narration for every book. Listen on the bus, study at the desk." }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0 text-[#006A6E]">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================
              STUDENT MOCKUP — Rich Reader Storyboard
              Shows: Tabs, EPUB reading, Varta chat, TTS bar, Sanchika
          ======================================================== */}
          <div className="order-1 lg:order-2 relative lg:ml-10">
            {/* Background Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#006A6E]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative w-full aspect-[4/3] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-200/80 overflow-hidden flex flex-col group">
              
              {/* ---- Tab Strip ---- */}
              <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-1 gap-0.5">
                {/* Active tab */}
                <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309] bg-white border-b-2 border-[#B45309] rounded-t-md shadow-sm">
                  <BookOpen className="w-3 h-3" /> Read
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700">
                  <Headphones className="w-3 h-3" /> Listen
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700">
                  <Bot className="w-3 h-3" /> Ask Varta
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700">
                  <BookMarked className="w-3 h-3" /> Sanchika
                </button>
              </div>

              {/* ---- Main Split: Reader + Varta Panel ---- */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Reading Area */}
                <div className="flex-1 flex">
                  {/* Page margin / scrollbar */}
                  <div className="w-8 bg-slate-50 border-r border-slate-100 flex flex-col items-center pt-4 gap-2 shrink-0">
                    <span className="text-[8px] text-slate-400 font-mono">142</span>
                    <div className="w-[3px] h-16 bg-slate-200 rounded-full mt-2 relative">
                      <div className="w-[3px] h-6 bg-[#006A6E]/40 rounded-full absolute top-2" />
                    </div>
                  </div>
                  
                  {/* Page content */}
                  <div className="flex-1 p-4 relative">
                    <h4 className="font-serif text-sm font-bold text-slate-800 mb-3 pb-1 border-b border-slate-100">
                      Chapter 7: Heat & Thermodynamics
                    </h4>
                    <div className="space-y-2.5 text-[9px] leading-relaxed text-slate-600">
                      <p>Heat is a form of energy that flows from a body at higher temperature to a body at lower temperature.</p>
                      {/* Highlighted line */}
                      <p className="bg-[#FEF08A] px-1 py-0.5 rounded border-l-2 border-[#F59E0B] text-slate-800 font-medium relative">
                        The specific heat capacity of water is 4186 J/kg·K, making it an excellent thermal buffer in biological systems.
                        {/* Selection handles */}
                        <span className="absolute -left-1 top-0 w-0.5 h-full bg-[#F59E0B] rounded" />
                      </p>
                      <p>When two substances at different temperatures are mixed, heat flows from the hotter to the cooler substance until thermal equilibrium is reached.</p>
                      <p className="text-slate-400">Convection occurs in fluids where heated particles rise and cooler particles sink, creating circulation currents...</p>
                    </div>

                    {/* "Saved to Sanchika" pill — appears near the highlight */}
                    <div className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 bg-[#006A6E]/10 text-[#006A6E] text-[8px] font-bold px-2.5 py-1 rounded-full border border-[#006A6E]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <BookMarked className="w-2.5 h-2.5" />
                      Saved to Sanchika
                    </div>
                  </div>
                </div>

                {/* Right: Varta Panel */}
                <div className="w-[38%] bg-slate-50/80 border-l border-slate-200 flex flex-col">
                  <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#006A6E]" />
                    <span className="text-[10px] font-bold text-slate-800">Varta</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 p-2.5 flex flex-col gap-2 overflow-hidden">
                    {/* User question */}
                    <div className="self-end bg-[#006A6E] text-white text-[8px] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[90%] leading-relaxed">
                      Why is water&apos;s specific heat so high?
                    </div>
                    {/* AI answer with citation */}
                    <div className="self-start bg-white border border-slate-200 text-slate-700 text-[8px] p-2 rounded-lg rounded-tl-none shadow-sm max-w-[95%] leading-relaxed">
                      Water&apos;s high specific heat (4186 J/kg·K) is due to hydrogen bonding between molecules, which requires significant energy to break.
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 bg-[#B45309]/10 text-[#B45309] text-[7px] font-bold px-1.5 py-0.5 rounded">
                          📄 p. 142, ¶2
                        </span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1.5 mt-auto">
                      <button className="flex-1 text-[7px] font-bold text-[#006A6E] bg-[#006A6E]/8 py-1.5 rounded-md border border-[#006A6E]/15 hover:bg-[#006A6E]/15 transition-colors">
                        Explain more
                      </button>
                      <button className="flex-1 text-[7px] font-bold text-[#B45309] bg-[#B45309]/8 py-1.5 rounded-md border border-[#B45309]/15 hover:bg-[#B45309]/15 transition-colors">
                        Create flashcard
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- Bottom: TTS / Audiobook Bar ---- */}
              <div className="h-9 bg-white border-t border-slate-100 flex items-center px-3 gap-2.5">
                <button className="w-5 h-5 rounded-full bg-[#006A6E] flex items-center justify-center shrink-0 hover:bg-[#006A6E]/80 transition-colors">
                  <Play className="w-2.5 h-2.5 text-white ml-0.5" />
                </button>
                {/* Progress bar */}
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-[35%] bg-gradient-to-r from-[#006A6E] to-[#006A6E]/70 rounded-full" />
                </div>
                <span className="text-[8px] text-slate-500 font-mono whitespace-nowrap">2:34 / 8:12</span>
                <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                  <Volume2 className="w-3 h-3 text-slate-400" />
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">TTS · Audiobook</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================
            SECTION 2: ADMIN/TEACHER
        ======================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* ========================================================
              ADMIN MOCKUP — Faculty Dashboard Snapshot
              Shows: Heatmap, assignment metrics, Varta stats, book tiles
          ======================================================== */}
          <div className="relative lg:mr-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#B45309]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative w-full aspect-[4/3] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-200/80 overflow-hidden flex flex-col group">
              
              {/* ---- Top Breadcrumb Bar ---- */}
              <div className="h-10 bg-slate-900 flex items-center px-4 gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-[#B45309] flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-white">Book Buddy Admin</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
                  <span className="text-[9px] text-slate-300 font-medium">Class 10 · Physics · </span>
                  <span className="text-[9px] text-[#FCD34D] font-bold">Heat & Thermodynamics</span>
                </div>
              </div>

              {/* ---- Main Content ---- */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Struggling Chapter Heatmap */}
                <div className="flex-[3] p-4 border-r border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Struggling Chapter Heatmap</h4>
                    <span className="text-[8px] text-slate-400">AI questions per chapter</span>
                  </div>
                  
                  <div className="space-y-2.5">
                    {[
                      { ch: "Ch 1: Basics", pct: 12, w: "12%", color: "bg-slate-300" },
                      { ch: "Ch 3: Conduction", pct: 34, w: "34%", color: "bg-[#006A6E]/50" },
                      { ch: "Ch 7: Thermodynamics", pct: 89, w: "89%", color: "bg-[#006A6E]", hot: true },
                      { ch: "Ch 9: Radiation", pct: 18, w: "18%", color: "bg-slate-300" },
                      { ch: "Ch 12: Applications", pct: 45, w: "45%", color: "bg-[#006A6E]/40" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`text-[8px] w-28 truncate shrink-0 ${item.hot ? 'text-[#006A6E] font-bold' : 'text-slate-600'}`}>
                          {item.ch}
                        </span>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full ${item.color} transition-all duration-700`}
                            style={{ width: item.w }}
                          />
                        </div>
                        <span className={`text-[8px] font-mono w-8 text-right ${item.hot ? 'text-[#006A6E] font-bold' : 'text-slate-500'}`}>
                          {item.pct}%
                        </span>
                        {item.hot && <AlertTriangle className="w-3 h-3 text-[#D97706] shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Metric Widgets */}
                <div className="flex-[2] p-3 flex flex-col gap-3">
                  {/* Assignments Complete */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/60 p-3 flex-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-[9px] font-bold text-green-800 uppercase tracking-wider">Assignments</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700 font-serif">82%</div>
                    <span className="text-[8px] text-green-600 font-medium">Complete this week</span>
                    {/* Mini progress ring */}
                    <div className="mt-2 h-1.5 bg-green-100 rounded-full overflow-hidden">
                      <div className="h-full w-[82%] bg-green-500 rounded-full" />
                    </div>
                  </div>

                  {/* Varta Questions */}
                  <div className="bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2]/30 rounded-xl border border-[#006A6E]/15 p-3 flex-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Bot className="w-3.5 h-3.5 text-[#006A6E]" />
                      <span className="text-[9px] font-bold text-[#006A6E] uppercase tracking-wider">Varta Qs</span>
                    </div>
                    <div className="text-2xl font-bold text-[#006A6E] font-serif">437</div>
                    <span className="text-[8px] text-[#006A6E]/70 font-medium">Questions this week</span>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-[7px] text-[#006A6E] font-bold bg-[#006A6E]/10 px-1.5 py-0.5 rounded">↑ 12%</span>
                      <span className="text-[7px] text-slate-400">vs last week</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- Bottom Row: Book Assignment + Skip Alert ---- */}
              <div className="h-[72px] border-t border-slate-100 flex">
                {/* Books assigned */}
                <div className="flex-1 p-2.5 border-r border-slate-100 flex items-center gap-2.5">
                  <div className="shrink-0">
                    <div className="text-[8px] font-bold text-slate-700 uppercase tracking-wider mb-1">Books Assigned</div>
                    <span className="text-[8px] text-slate-400">3 titles · this batch</span>
                  </div>
                  <div className="flex gap-1.5 ml-auto">
                    {/* Mini book tiles */}
                    <div className="w-8 h-11 rounded bg-gradient-to-b from-[#B45309] to-[#92400E] shadow-sm flex items-end justify-center pb-0.5">
                      <div className="w-5 h-0.5 bg-white/40 rounded" />
                    </div>
                    <div className="w-8 h-11 rounded bg-gradient-to-b from-[#006A6E] to-[#004D40] shadow-sm flex items-end justify-center pb-0.5">
                      <div className="w-5 h-0.5 bg-white/40 rounded" />
                    </div>
                    <div className="w-8 h-11 rounded bg-gradient-to-b from-[#0D1B6E] to-[#1A237E] shadow-sm flex items-end justify-center pb-0.5">
                      <div className="w-5 h-0.5 bg-white/40 rounded" />
                    </div>
                  </div>
                </div>
                {/* Chapters students skip */}
                <div className="flex-1 p-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-slate-700 uppercase tracking-wider">Chapters Skipped</div>
                    <span className="text-[8px] text-[#D97706] font-semibold">Ch 7, Ch 12</span>
                    <span className="text-[8px] text-slate-400"> · needs attention</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Right */}
          <div className="animate-landing-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#B45309]/20 text-[#B45309] font-semibold text-sm mb-6 drop-shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Teacher & Admin Experience
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900 font-serif leading-tight">
              See what they read. <br /><span className="text-[#006A6E]">Know what they skip.</span>
            </h2>
            
            <p className="text-lg text-slate-700 mb-8 leading-relaxed">
              Equip your faculty with X-ray vision. Understand class engagement, track assignment completion, and see precisely which chapters trigger the most AI questions.
            </p>

            <ul className="space-y-5">
              {[
                { icon: Users, title: "Assign Books to Batches", desc: "Instantly distribute required reading to specific semesters." },
                { icon: AlertCircle, title: "Struggling Chapter Heatmaps", desc: "Identify the exact pages where students spend the most time." },
                { icon: BarChart3, title: "Track Varta Question Volume", desc: "See what topics are so confusing they require the Varta engine." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0 text-[#B45309]">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>
    </section>
  )
}
