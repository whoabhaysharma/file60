import React, { useRef } from 'react';
import { MAX_FILE_SIZE } from '../constants';

interface UploaderProps {
  onUploadStart: (file: File) => void;
  isUploading: boolean;
  progress: number;
}

const Uploader: React.FC<UploaderProps> = ({ onUploadStart, isUploading, progress }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert("FILE TOO LARGE (MAX 100MB)");
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert("INVALID FORMAT. ONLY IMAGES OR VIDEOS ALLOWED.");
      return;
    }
    onUploadStart(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border-b-[3px] md:border-b-0 md:border-r-[3px] border-black flex flex-col p-[30px] relative z-10 h-[350px] md:h-auto flex-shrink-0 md:flex-shrink">
      
      {/* Brand Title */}
      <div className="font-['Arial_Black'] text-[4rem] leading-[0.8] tracking-[-3px] mb-[30px] skew-x-[-5deg]">
        FILE<br/>60.
      </div>

      {/* Click Zone */}
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className="flex-grow border-[3px] border-black bg-[#f0f0f0] bg-pattern-stripe flex flex-col justify-center items-center cursor-pointer relative transition-colors hover:bg-[#00ff41] text-black group overflow-hidden"
      >
        
        {/* Default Content */}
        {!isUploading && (
          <>
            <div className="font-[900] text-2xl uppercase bg-white p-[10px] border-[3px] border-black shadow-[5px_5px_0_#000] text-center z-10">
              UPLOAD MEDIA
            </div>
            <div className="mt-[10px] font-bold text-xs bg-black text-white px-2 py-1 z-10">
              IMG / VID ONLY
            </div>
          </>
        )}

        {/* Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white flex flex-col justify-center items-center p-5 z-20 animate-pulse">
             <div className="font-[900] text-[1.5rem]">UPLOADING</div>
             <div className="w-full h-[30px] border-[3px] border-black mt-2">
                <div 
                  className="h-full bg-black transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
             </div>
             <div className="mt-1 font-bold">{progress}%</div>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default Uploader;
