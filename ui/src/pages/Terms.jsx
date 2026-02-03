import React from 'react';
import '../styles/index.css';

export default function Terms() {
    return (
        <div className="min-h-screen bg-black text-white font-mono p-8 md:p-16 max-w-4xl mx-auto selection:bg-[#00ff41] selection:text-black">
            <header className="mb-12 border-b border-gray-800 pb-8">
                <a href="/" className="text-[#00ff41] hover:underline mb-4 block">&larr; Return to Terminal</a>
                <h1 className="text-4xl font-black uppercase mb-2">Terms of Service</h1>
                <p className="text-gray-500 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
            </header>

            <div className="space-y-12 text-gray-300 leading-relaxed">
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Service Description</h2>
                    <p>FILE60 provides temporary hosting for supported file types. Uploaded files are hosted for a maximum of 60 minutes and are automatically deleted after expiration.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Allowed Content</h2>
                    <p className="mb-2">Only text-based and web development files are allowed:</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                        <li>HTML</li>
                        <li>CSS</li>
                        <li>JavaScript</li>
                        <li>Plain text (.txt)</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Prohibited Content</h2>
                    <p className="mb-2">Users may not upload:</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-400">
                        <li>Copyrighted material without authorization</li>
                        <li>Media files or binaries</li>
                        <li>Executables, malware, or harmful scripts</li>
                        <li>Archives or compressed files</li>
                        <li>Adult or explicit content</li>
                        <li>Personal or sensitive information</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">No Security or Encryption Guarantees</h2>
                    <p className="mb-4">FILE60 does not provide end-to-end encryption or confidentiality guarantees. Users should not upload sensitive or confidential information.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Enforcement</h2>
                    <p>FILE60 may remove content at any time and restrict access in cases of misuse.</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-white mb-4 uppercase text-[#00ff41]">Disclaimer</h2>
                    <p>The service is provided “as is.” FILE60 is not responsible for data loss due to automatic expiration.</p>
                </section>
            </div>

            <footer className="mt-20 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
                &copy; {new Date().getFullYear()} FILE60 SYSTEM. ALL RIGHTS RESERVED.
            </footer>
        </div>
    );
}
