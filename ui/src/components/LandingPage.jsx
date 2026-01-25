import React from 'react';
import { FileUploadZone } from './FileUploadZone.jsx';

export function LandingPage({ onFileSelect, isUploading, uploadProgress, onEnterDashboard }) {
    return (
        <div className="w-full h-full overflow-y-auto bg-grid text-black font-mono">
            {/* Header */}
            <header className="p-6 border-b-4 border-black bg-white flex justify-between items-center sticky top-0 z-40 shadow-sm">
                <h1 className="text-4xl font-black tracking-tighter">FILE60</h1>
                <button
                    onClick={onEnterDashboard}
                    className="bg-black text-white px-6 py-2 font-bold hover:bg-accent hover:text-black transition-colors border-2 border-transparent hover:border-black uppercase text-sm"
                >
                    Enter Terminal
                </button>
            </header>

            <main className="max-w-7xl mx-auto p-6 md:p-12 grid md:grid-cols-2 gap-12">

                {/* Left Column: Content */}
                <div className="space-y-12">
                    <section>
                        <h2 className="text-6xl md:text-8xl font-black leading-[0.85] mb-6">
                            DATA <br/>
                            SHOULD <br/>
                            BE FREE
                        </h2>
                        <p className="text-xl font-bold border-l-8 border-accent pl-6 py-2 bg-white shadow-brutal">
                            Anonymous file sharing for the digital underground.
                            No logs. No signups. No bullshit.
                        </p>
                    </section>

                    <section className="grid grid-cols-1 gap-6">
                         <div className="bg-white p-6 border-4 border-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                            <h3 className="text-2xl font-black mb-2 uppercase bg-black text-white inline-block px-2">Ephemeral</h3>
                            <p className="font-bold text-sm mt-2">Files are automatically nuked after 60 minutes (or customized duration). No traces left behind.</p>
                        </div>
                        <div className="bg-white p-6 border-4 border-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                            <h3 className="text-2xl font-black mb-2 uppercase bg-black text-white inline-block px-2">Secure</h3>
                            <p className="font-bold text-sm mt-2">End-to-end encryption optional. We don't want to know what you're hosting.</p>
                        </div>
                        <div className="bg-white p-6 border-4 border-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                            <h3 className="text-2xl font-black mb-2 uppercase bg-black text-white inline-block px-2">Fast</h3>
                            <p className="font-bold text-sm mt-2">Powered by edge networks. Lightning fast uploads and downloads from anywhere.</p>
                        </div>
                    </section>
                </div>

                {/* Right Column: Upload */}
                <div className="flex flex-col justify-start pt-12 md:pt-0">
                     <div className="sticky top-32">
                        <div className="bg-white p-4 border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] mb-8">
                            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                                <span className="font-bold text-xs uppercase">System Status</span>
                                <span className="font-bold text-xs text-green-600 animate-pulse">● ONLINE</span>
                            </div>
                            <FileUploadZone
                                onFileSelect={onFileSelect}
                                isUploading={isUploading}
                                uploadProgress={uploadProgress}
                            />
                            <div className="mt-4 text-xs font-bold text-center opacity-50">
                                BY UPLOADING YOU AGREE TO THE PROTOCOLS
                            </div>
                        </div>

                        <div className="p-6 bg-black text-white border-4 border-black">
                             <h3 className="text-xl font-black mb-4 text-accent">LATEST TRANSMISSIONS</h3>
                             <ul className="space-y-2 text-sm font-mono opacity-80">
                                 <li className="flex justify-between"><span>&gt; encrypted_archive.zip</span> <span>24MB</span></li>
                                 <li className="flex justify-between"><span>&gt; evidence_01.mp4</span> <span>156MB</span></li>
                                 <li className="flex justify-between"><span>&gt; leaked_docs.pdf</span> <span>4.2MB</span></li>
                             </ul>
                        </div>
                    </div>
                </div>

            </main>

            <footer className="border-t-4 border-black bg-white p-8 mt-12 text-center">
                 <p className="font-bold text-sm">FILE60 // EST. 2024</p>
                 <p className="text-xs opacity-60 mt-2">DECENTRALIZED • ANONYMOUS • UNGOVERNABLE</p>
            </footer>
        </div>
    );
}
