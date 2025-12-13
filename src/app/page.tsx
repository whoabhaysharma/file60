'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Marquee from '@/components/Marquee';
import Uploader from '@/components/Uploader';
import FileCard from '@/components/FileCard';
import GlobalDragOverlay from '@/components/GlobalDragOverlay';
import { FileItem } from '@/types';
import { STORAGE_KEY, EXPIRATION_TIME, UPLOAD_API_URL } from '@/constants';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Drag State
  const [dragActive, setDragActive] = useState(false);
  const [dragValid, setDragValid] = useState(true);

  // Load from storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFiles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
  }, []);

  // Timer Tick
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      
      // Auto-cleanup expired
      setFiles(prev => {
        const valid = prev.filter(f => currentTime < f.expires);
        if (valid.length !== prev.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
          return valid;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const saveFiles = (newFiles: FileItem[]) => {
    setFiles(newFiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFiles));
  };

  const addFile = (name: string, url: string, type: string) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      url: url,
      type,
      expires: Date.now() + EXPIRATION_TIME,
    };
    saveFiles([newFile, ...files]);
  };

  const removeFile = (id: string) => {
    saveFiles(files.filter(f => f.id !== id));
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get Presigned URL
      const res = await fetch(UPLOAD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type || 'application/octet-stream',
        }),
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await res.json();

      // 2. Upload File to R2
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
           addFile(file.name, publicUrl, file.type);
           setIsUploading(false);
        } else {
           alert('Upload failed');
           setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        alert('Upload failed: Network error');
        setIsUploading(false);
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);

    } catch (e) {
      console.error(e);
      alert('Upload failed');
      setIsUploading(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
    // All files are valid now
    setDragValid(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null) {
        setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // No validation needed for file type
      uploadFile(file);
    }
  }, [files]);

  return (
    <div 
      className="flex flex-col h-[100dvh] overflow-hidden relative"
      onDragEnter={handleDragEnter}
    >
      <GlobalDragOverlay 
        isVisible={dragActive} 
        isValid={dragValid} 
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      />

      <Marquee />

      <main className="flex-grow grid grid-cols-1 md:grid-cols-[400px_1fr] overflow-hidden md:h-full">
        <Uploader 
          onUploadStart={uploadFile} 
          isUploading={isUploading} 
          progress={uploadProgress} 
        />

        <div className="bg-[#e0e0e0] p-[30px] overflow-y-auto flex flex-col gap-5 h-full relative">
          {files.length === 0 ? (
            <div className="flex-grow flex justify-center items-center opacity-30 text-[3rem] font-[900] -rotate-[10deg] pointer-events-none select-none">
              NO MEDIA
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 pb-10">
              {files.map(file => (
                <FileCard 
                  key={file.id} 
                  file={file} 
                  now={now} 
                  onRemove={removeFile} 
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
