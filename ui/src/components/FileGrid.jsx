import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { FileCard } from './FileCard.jsx';
import { AdGateModal } from './AdGateModal.jsx';
import { useApi } from '../hooks/useApi.js';

export function FileGrid() {
    const { files, removeFile, updateFile } = useApp();
    const { extendFileExpiry, startExtendAdGate } = useApi();
    const [adGateFileId, setAdGateFileId] = useState(null);
    const [adGateToken, setAdGateToken] = useState(null);
    const [adWaitSeconds, setAdWaitSeconds] = useState(30);
    const [isExtendingViaAdGate, setIsExtendingViaAdGate] = useState(false);

    const handleExtend = async (id) => {
        try {
            const gate = await startExtendAdGate(id);
            setAdGateToken(gate.ad_gate_token);
            setAdWaitSeconds(gate.wait_seconds || 30);
            setAdGateFileId(id);
        } catch (error) {
            const message = error?.message || 'Failed to start ad gate.';
            window.alert(message);
        }
    };

    const handleAdGateConfirm = async () => {
        if (!adGateFileId || !adGateToken || isExtendingViaAdGate) return;
        try {
            setIsExtendingViaAdGate(true);
            const id = adGateFileId;
            setAdGateFileId(null);
            const token = adGateToken;
            setAdGateToken(null);
            const result = await extendFileExpiry(id, token);
            updateFile(id, { expires: result.expires_at, canExtend: result.can_extend !== false });
        } catch (error) {
            const message = error?.message || 'Failed to extend file expiry.';
            window.alert(message);
        } finally {
            setIsExtendingViaAdGate(false);
        }
    };

    const handleAdGateClose = () => {
        if (isExtendingViaAdGate) return;
        setAdGateFileId(null);
        setAdGateToken(null);
    };

    if (files.length === 0) {
        return (
            <div className="flex-grow flex items-center justify-center flex-col p-8 opacity-30 select-none">

                <div className="text-xl font-bold text-ink mt-8 px-4 py-2 uppercase z-10">
                    No Files Detected
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid gap-10"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
            {files.map(file => (
                <FileCard key={file.id} file={file} onRemove={removeFile} onExtend={handleExtend} />
            ))}
            <AdGateModal
                isOpen={Boolean(adGateFileId)}
                isSubmitting={isExtendingViaAdGate}
                waitSeconds={adWaitSeconds}
                onClose={handleAdGateClose}
                onConfirm={handleAdGateConfirm}
            />
        </div>
    );
}
