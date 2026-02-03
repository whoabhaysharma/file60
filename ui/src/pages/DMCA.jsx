import React from 'react';
import '../styles/index.css';

export default function DMCA() {
    return (
        <div className="min-h-screen bg-black text-white font-mono p-8 md:p-16 max-w-4xl mx-auto selection:bg-[#00ff41] selection:text-black">
            <header className="mb-12 border-b border-gray-800 pb-8">
                <a href="/" className="text-[#00ff41] hover:underline mb-4 block">&larr; Return to Terminal</a>
                <h1 className="text-4xl font-black uppercase mb-2">DMCA / Copyright Policy</h1>
            </header>

            <div className="space-y-12 text-gray-300 leading-relaxed">
                <section>
                    <p className="mb-4">FILE60 respects copyright laws.</p>
                    <p className="mb-4">If you believe your copyrighted work has been hosted on FILE60 without authorization, please provide:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>Identification of the copyrighted work</li>
                        <li>The temporary URL</li>
                        <li>Contact information</li>
                        <li>A statement of good-faith belief</li>
                        <li>A statement of accuracy under penalty of perjury</li>
                    </ul>
                    <p className="mt-8 font-bold text-white">Reported content will be removed promptly.</p>
                </section>
            </div>

            <footer className="mt-20 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
                &copy; {new Date().getFullYear()} FILE60 SYSTEM. ALL RIGHTS RESERVED.
            </footer>
        </div>
    );
}
