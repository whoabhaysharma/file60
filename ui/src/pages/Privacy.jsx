import React from 'react';
import '../styles/index.css';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-black text-white font-mono p-8 md:p-16 max-w-4xl mx-auto selection:bg-[#00ff41] selection:text-black">
            <header className="mb-12 border-b border-gray-800 pb-8">
                <a href="/" className="text-[#00ff41] hover:underline mb-4 block">&larr; Return to Terminal</a>
                <h1 className="text-4xl font-black uppercase mb-2">Privacy Policy</h1>
                <p className="text-gray-500 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
            </header>

            <div className="space-y-12 text-gray-300 leading-relaxed">
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Information We Process</h2>
                    <p className="mb-4">FILE60 does not require user accounts. We may temporarily process:</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                        <li>Uploaded file content (for hosting only)</li>
                        <li>Basic technical data (such as IP address and browser information) for security and abuse prevention</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Data Retention</h2>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                        <li>Uploaded files are automatically deleted after a maximum of 60 minutes</li>
                        <li>Limited technical logs may be retained briefly for operational purposes</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Cookies</h2>
                    <p>FILE60 may use minimal cookies required for basic functionality and analytics.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Third-Party Services</h2>
                    <p>Third-party providers, including analytics or advertising services, may collect information according to their own policies.</p>
                </section>
            </div>

            <footer className="mt-20 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
                &copy; {new Date().getFullYear()} FILE60 SYSTEM. ALL RIGHTS RESERVED.
            </footer>
        </div>
    );
}
