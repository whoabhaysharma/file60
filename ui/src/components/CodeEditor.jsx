import React, { useEffect, useRef, useState } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/xml/xml.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import { CODE_MODES, MIME_TYPES } from '../utils/constants.js';
import { useApp } from '../context/AppContext.jsx';

export function CodeEditor({ onUpload, isUploading, uploadProgress }) {
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const [ext, setExt] = useState('html');
    const { isInitializing } = useApp();

    useEffect(() => {
        if (!containerRef.current || editorRef.current) return;

        editorRef.current = CodeMirror(containerRef.current, {
            value: '// PASTE YOUR CODE HERE...\n// BUGS GO ELSEWHERE.',
            mode: CODE_MODES.html,
            lineNumbers: true,
            lineWrapping: true,
            autofocus: false
        });

        editorRef.current.setSize('100%', '100%');

        return () => {
            if (editorRef.current) {
                // Just clear the reference, CodeMirror will be cleaned up by React
                editorRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('mode', CODE_MODES[ext] || 'text/plain');
        }
    }, [ext]);

    const handleUpload = () => {
        if (!editorRef.current || isInitializing) return;

        const code = editorRef.current.getValue().trim();
        if (!code) return;

        const fileName = {
            html: 'index.html',
            js: 'script.js',
            css: 'style.css',
            txt: 'raw.txt'
        }[ext];

        const blob = new Blob([code], { type: MIME_TYPES[ext] || 'text/plain' });
        const file = new File([blob], fileName, { type: MIME_TYPES[ext] || 'text/plain' });

        onUpload(file);

        // Clear editor after upload
        editorRef.current.setValue('// PASTE YOUR CODE HERE...');
    };

    return (
        <div className="flex-grow border-[4px] border-black bg-terminal shadow-brutal flex flex-col overflow-hidden h-full">
            <div className="bg-black border-b-[2px] border-white/10 p-2 flex justify-between items-center shrink-0">
                <div className="flex gap-1.5 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-alert" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                </div>
                <select
                    value={ext}
                    onChange={(e) => setExt(e.target.value)}
                    className="bg-terminal text-accent text-[9px] border-[1px] border-accent/50 px-2 py-0.5 uppercase font-bold outline-none"
                    disabled={isInitializing}
                >
                    <option value="html">index.html</option>
                    <option value="js">script.js</option>
                    <option value="css">style.css</option>
                    <option value="txt">raw.txt</option>
                </select>
            </div>
            <div ref={containerRef} className="flex-grow relative overflow-hidden bg-terminal min-h-0" />
            {isUploading ? (
                <div className="border-t-[4px] border-black py-4 px-4 bg-terminal shrink-0">
                    <div className="text-center w-full">
                        <div className="font-black text-xs uppercase text-accent">
                            STEALING WIFI...
                        </div>
                        <div className="progress-container !mt-2 !h-4 !border-accent !bg-terminal">
                            <div className="progress-bar !bg-accent" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <div className="upload-info text-accent !mt-1">
                            <div className="font-black">{Math.round(uploadProgress)}%</div>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleUpload}
                    disabled={isInitializing}
                    className={`active-press border-t-[4px] border-black py-4 font-black text-xs uppercase transition-colors shrink-0 ${!isInitializing
                        ? 'bg-accent hover:bg-white cursor-pointer'
                        : 'bg-gray-400 cursor-not-allowed opacity-60'
                        }`}
                >
                    {isInitializing ? 'INITIALIZING...' : 'SHIP IT TO PROD'}
                </button>
            )}
        </div>
    );
}
