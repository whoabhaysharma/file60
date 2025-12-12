import React, { useState, useEffect } from 'react';
import { FileItem } from '../types';

interface FileCardProps {
  file: FileItem;
  now: number;
  onRemove: (id: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, now, onRemove }) => {
  const [copyState, setCopyState] = useState<'IDLE' | 'COPIED'>('IDLE');

  const diff = file.expires - now;
  const totalDuration = 60 * 60 * 1000;
  const pct = Math.max(0, (diff / totalDuration) * 100);
  
  const m = Math.floor(Math.max(0, diff) / 60000);
  const s = Math.floor((Math.max(0, diff) % 60000) / 1000);
  const timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  
  const isVideo = file.type.startsWith('video');
  const isWarn = diff < 10 * 60 * 1000; // Less than 10 mins

  const handleCopy = () => {
    navigator.clipboard.writeText(file.url).then(() => {
      setCopyState('COPIED');
      setTimeout(() => setCopyState('IDLE'), 1000);
    });
  };

  return (
    <div className="bg-white border-[3px] border-black shadow-hard hover:shadow-hard-hover transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] p-4 flex flex-col gap-4">
      {/* Media Preview Box */}
      <div className="w-full h-[200px] bg-black border-[3px] border-black relative flex justify-center items-center overflow-hidden scanlines group hover:border-[#00ff41]">
        
        {/* Corner Tag */}
        <div className="absolute top-0 left-0 bg-[#00ff41] text-black font-[900] text-[0.7rem] px-2 py-1 z-[5] border-b-2 border-r-2 border-black">
          [{isVideo ? 'VID' : 'IMG'}]
        </div>

        {/* Video Play Overlay Icon */}
        {isVideo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] text-[#00ff41] pointer-events-none transition-transform duration-100 group-hover:scale-110 drop-shadow-[4px_4px_0_#000]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Content */}
        {isVideo ? (
          <video 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 grayscale-[20%] contrast-[110%] group-hover:filter-none transition-all duration-200 pointer-events-none"
            src={file.url}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img 
            src={file.url} 
            alt="preview" 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 grayscale-[20%] contrast-[110%] group-hover:filter-none transition-all duration-200 pointer-events-none"
          />
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button 
          onClick={handleCopy}
          className={`
            flex-grow border-[2px] border-black font-bold text-lg p-3 shadow-hard-sm hover:shadow-hard-sm-hover active:shadow-none-active active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2
            ${copyState === 'COPIED' ? 'bg-white text-black' : 'bg-[#00ff41] text-black hover:bg-white'}
          `}
        >
          {copyState === 'COPIED' ? 'COPIED!' : 'COPY LINK'}
        </button>
        <button 
          onClick={() => onRemove(file.id)}
          className="bg-[#ff2a00] text-white w-[50px] border-[2px] border-black font-bold text-lg shadow-hard-sm hover:bg-black flex items-center justify-center active:shadow-none-active active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          X
        </button>
      </div>

      {/* Timer Bar */}
      <div className="border-[2px] border-black h-[24px] bg-[#ddd] relative overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 linear ${isWarn ? 'bg-[#ff2a00]' : 'bg-black'}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[0.8rem] font-bold text-white mix-blend-difference pointer-events-none">
          {timeString}
        </div>
      </div>
    </div>
  );
};

export default FileCard;
