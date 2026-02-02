import React from 'react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg font-mono flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b-4 border-black bg-white">
        <h1 className="text-4xl font-black tracking-tighter -skew-x-6">FILE<br/>60.</h1>
        <nav className="hidden md:flex gap-6 font-bold text-sm uppercase">
          <a href="#features" className="hover:text-accent transition-colors">Features</a>
          <a href="#privacy" className="hover:text-accent transition-colors">Privacy</a>
          <a href="#terms" className="hover:text-accent transition-colors">Terms</a>
        </nav>
        <a href="/app/" className="bg-black text-white px-6 py-2 font-black uppercase text-sm hover:bg-accent hover:text-black transition-all shadow-brutal-sm">
          Launch Terminal
        </a>
      </header>

      {/* Hero */}
      <section className="p-12 md:p-24 flex flex-col items-center justify-center text-center bg-grid border-b-4 border-black relative overflow-hidden">
        <div className="scanlines absolute inset-0 pointer-events-none"></div>
        <div className="bg-white p-8 md:p-12 border-4 border-black shadow-brutal relative z-10 max-w-4xl">
          <h2 className="text-5xl md:text-7xl font-black uppercase mb-6 leading-[0.8]">
            Anonymous<br/><span className="text-accent bg-black px-2">File Drop</span>
          </h2>
          <p className="text-xl font-bold uppercase mb-8 max-w-2xl mx-auto opacity-80">
            Share sensitive data. No logs. No sign-up. Self-destructing files.
            The internet never forgets, but we do.
          </p>
          <a href="/app/" className="inline-block bg-accent text-black border-4 border-black px-8 py-4 text-xl font-black uppercase hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] shadow-brutal transition-all">
            Start Uploading
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="p-12 bg-white border-b-4 border-black">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="border-4 border-black p-6 shadow-brutal-sm hover:shadow-brutal transition-all bg-[#e5e5e5]">
            <h3 className="text-2xl font-black uppercase mb-4">No Logs Policy</h3>
            <p className="font-bold text-sm opacity-70">We don't know who you are, what you uploaded, or who you sent it to. Server logs are wiped automatically.</p>
          </div>
          <div className="border-4 border-black p-6 shadow-brutal-sm hover:shadow-brutal transition-all bg-[#e5e5e5]">
            <h3 className="text-2xl font-black uppercase mb-4">End-to-End Encryption</h3>
            <p className="font-bold text-sm opacity-70">Files are encrypted in transit. We ensure your data remains your data.</p>
          </div>
          <div className="border-4 border-black p-6 shadow-brutal-sm hover:shadow-brutal transition-all bg-[#e5e5e5]">
            <h3 className="text-2xl font-black uppercase mb-4">Self-Destruct</h3>
            <p className="font-bold text-sm opacity-70">Set expiration timers. Once a file expires, it is digitally incinerated. No backups.</p>
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="grid md:grid-cols-2">
        <div id="privacy" className="p-12 border-b-4 md:border-b-0 md:border-r-4 border-black bg-white">
            <h3 className="text-3xl font-black uppercase mb-6">Privacy Policy</h3>
            <div className="text-xs font-bold space-y-4 opacity-80">
                <p><strong>1. Data Collection:</strong> We collect only the files you upload and the metadata required to serve them (file size, type, expiration). We do not collect personal information like names or emails.</p>
                <p><strong>2. Cookies & Third Parties:</strong> We use cookies to maintain your session. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet. Users may opt out of personalized advertising by visiting Ads Settings.</p>
                <p><strong>3. Data Retention:</strong> Files are automatically deleted after their expiration time. Metadata is purged simultaneously.</p>
                <p><strong>4. Consent:</strong> By using File60, you consent to this privacy policy.</p>
            </div>
        </div>
        <div id="terms" className="p-12 bg-white">
            <h3 className="text-3xl font-black uppercase mb-6">Terms of Service</h3>
            <div className="text-xs font-bold space-y-4 opacity-80">
                <p><strong>1. Usage:</strong> You agree not to upload illegal content, including but not limited to malware, copyrighted material without permission, or CSAM. We strictly cooperate with law enforcement regarding illegal content.</p>
                <p><strong>2. Liability:</strong> File60 is provided "as is". We are not liable for data loss or damages resulting from the use of this service.</p>
                <p><strong>3. Termination:</strong> We reserve the right to block access or delete files that violate these terms without notice.</p>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-8 bg-black text-white text-center font-bold text-xs uppercase border-t-4 border-black">
        <p>&copy; {new Date().getFullYear()} FILE60 SYSTEM. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
