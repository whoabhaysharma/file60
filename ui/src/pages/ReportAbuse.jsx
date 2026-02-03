import React from 'react';
import '../styles/index.css';

export default function ReportAbuse() {
    return (
        <div className="min-h-screen bg-black text-white font-mono p-8 md:p-16 max-w-4xl mx-auto selection:bg-[#00ff41] selection:text-black">
            <header className="mb-12 border-b border-gray-800 pb-8">
                <a href="/" className="text-[#00ff41] hover:underline mb-4 block">&larr; Return to Terminal</a>
                <h1 className="text-4xl font-black uppercase mb-2">Report Abuse</h1>
            </header>

            <div className="space-y-12 text-gray-300 leading-relaxed">
                <section>
                    <p className="mb-4">If you encounter content that:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>Violates FILE60’s Terms</li>
                        <li>Is copyrighted without authorization</li>
                        <li>Contains malicious or harmful code</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41] mt-8">How to Report</h2>
                    <p className="mb-4">Please report it with:</p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                        <li>The temporary URL</li>
                        <li>A short description of the issue</li>
                    </ul>
                    <p className="mt-8 font-bold text-white border-l-4 border-[#00ff41] pl-4">Violating content is removed without notice.</p>
                </section>
            </div>

            <footer className="mt-20 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
                &copy; {new Date().getFullYear()} FILE60 SYSTEM. ALL RIGHTS RESERVED.
            </footer>
        </div>
    );
}
