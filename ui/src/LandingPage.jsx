import React, { useEffect, useState } from 'react';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Smart Redirect Logic
    const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
    const hasVisited = localStorage.getItem('file60_user_visited') === 'true';
    const shouldStay = new URLSearchParams(window.location.search).get('stay') === 'true';

    if (hasVisited && !isBot && !shouldStay) {
      window.location.href = '/app/';
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col selection:bg-accent selection:text-black">
      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center transition-all duration-300 border-b-4 ${scrolled ? 'bg-black/90 backdrop-blur border-accent py-4 shadow-[0_4px_0_0_rgba(0,255,65,0.3)]' : 'bg-transparent border-transparent py-6'
          }`}
      >
        <h1 className="text-4xl font-black tracking-tighter -skew-x-6 text-white group cursor-default">
          FILE<span className="text-accent">60</span><span className="animate-pulse">_</span>
        </h1>
        <nav className="hidden md:flex gap-8 font-bold text-sm uppercase tracking-widest">
          {['Features', 'Privacy', 'Terms'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative hover:text-accent transition-colors before:content-['>'] before:opacity-0 hover:before:opacity-100 before:absolute before:-left-4 before:text-accent transition-all"
            >
              {item}
            </a>
          ))}
        </nav>
        <a
          href="/app/"
          className="bg-accent text-black px-6 py-2 font-black uppercase text-sm border-2 border-accent hover:bg-black hover:text-accent transition-all shadow-[4px_4px_0_0_#ffffff] hover:shadow-[2px_2px_0_0_#ffffff] hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          Launch_Terminal
        </a>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Background Grid & Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] pointer-events-none"></div>
        <div className="scanlines absolute inset-0 pointer-events-none opacity-20"></div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-block mb-6 px-3 py-1 border border-accent/30 text-accent/70 text-xs font-bold tracking-[0.2em] uppercase rounded-full animate-pulse">
            System Online // V.3.0.0
          </div>
          <h2 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase mb-8 leading-[0.8] tracking-tighter mix-blend-screen">
            Anonymous<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-600">File Drop</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-400 font-bold uppercase mb-12 max-w-3xl mx-auto leading-relaxed border-l-4 border-accent pl-6 text-left md:text-center md:border-l-0 md:pl-0">
            Share sensitive data. <span className="text-white">No logs.</span> <span className="text-white">No sign-up.</span> <span className="text-white">Self-destruct.</span><br />
            The internet never forgets, but <span className="bg-accent text-black px-1">we do.</span>
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <a
              href="/app/"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-xl font-black uppercase bg-white text-black border-4 border-white hover:bg-black hover:text-white transition-all shadow-[8px_8px_0_0_#00ff41] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            >
              Start_Upload
              <span className="ml-2 group-hover:animate-ping">_</span>
            </a>
            <a
              href="#features"
              className="px-8 py-4 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 group"
            >
              System Info <span className="group-hover:translate-y-1 transition-transform">↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-zinc-900 border-t border-zinc-800 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-accent/20 px-4 py-1 text-accent text-xs font-mono uppercase tracking-widest">
          System Capabilities
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              title: "No Logs Policy",
              desc: "We don't know who you are. Server logs are wiped automatically. Total denial.",
              icon: "Ø"
            },
            {
              title: "E2E Encryption",
              desc: "Files are encrypted in transit. Your data remains your data until it vanishes.",
              icon: "lock"
            },
            {
              title: "Self-Destruct",
              desc: "Set expiration timers. Once expired, data is digitally incinerated. No backups.",
              icon: "bomb"
            }
          ].map((feature, i) => (
            <div key={i} className="group p-8 border border-white/10 bg-black hover:border-accent transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl group-hover:text-accent group-hover:opacity-20 transition-all select-none">{feature.icon}</div>
              <h3 className="text-2xl font-black uppercase mb-4 text-white group-hover:text-accent transition-colors flex items-center gap-3">
                <span className="text-accent text-sm">0{i + 1}.</span> {feature.title}
              </h3>
              <p className="font-bold text-sm text-gray-500 leading-relaxed group-hover:text-gray-300 transition-colors">
                {feature.desc}
              </p>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Policies Section */}
      <section className="grid md:grid-cols-2 bg-black border-t border-zinc-800">
        <div id="privacy" className="p-12 md:p-24 border-b md:border-b-0 md:border-r border-zinc-800 hover:bg-zinc-900/50 transition-colors group">
          <h3 className="text-3xl font-black uppercase mb-8 text-white group-hover:text-accent transition-colors">Privacy_Protocol</h3>
          <div className="text-xs font-bold space-y-6 text-gray-500 font-mono leading-loose">
            <p><strong className="text-white block mb-1">&gt; DATA COLLECTION</strong>We collect only uploaded files & metadata (size, type). No names. No emails. No IP logging.</p>
            <p><strong className="text-white block mb-1">&gt; COOKIES</strong>Session cookies only. Third-party vendors (Google) may use cookies for ads. Opt-out at Ads Settings.</p>
            <p><strong className="text-white block mb-1">&gt; DATA RETENTION</strong>Auto-deletion post-expiration. Metadata purged simultaneously. Irrecoverable.</p>
            <p><strong className="text-white block mb-1">&gt; CONSENT</strong>Use of File60 constitutes agreement to this protocol.</p>
          </div>
        </div>
        <div id="terms" className="p-12 md:p-24 hover:bg-zinc-900/50 transition-colors group">
          <h3 className="text-3xl font-black uppercase mb-8 text-white group-hover:text-alert transition-colors">Terms_of_Service</h3>
          <div className="text-xs font-bold space-y-6 text-gray-500 font-mono leading-loose">
            <p><strong className="text-white block mb-1">&gt; USAGE</strong>Do not upload malware, CP, or copyrighted material. Illegal content = Instant ban & report.</p>
            <p><strong className="text-white block mb-1">&gt; LIABILITY</strong>Service provided "as is". We are not liable for data loss. Don't upload your only copy.</p>
            <p><strong className="text-white block mb-1">&gt; TERMINATION</strong>We reserve the right to nuke files or block access at any time without notice.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-8 bg-black text-center font-bold text-xs uppercase border-t border-zinc-800 text-gray-600 flex flex-col gap-2">
        <p>&copy; {new Date().getFullYear()} FILE60 SYSTEM. ALL RIGHTS RESERVED.</p>
        <p className="text-[10px] opacity-50">Secure File Transfer Protocol // Encrypted</p>
      </footer>
    </div>
  );
}
