import React, { useState, useRef } from 'react';
import { Modal } from './base/modal/modal';
import { Button } from './base/buttons/button';
import { Icon } from '../utils';
import { parseAndUploadXAnalyticsCsv, XImportResult } from '../services/xSyncService';

interface ImportXModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: XImportResult) => void;
}

export const ImportXModal: React.FC<ImportXModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const text = await file.text();
      const result = await parseAndUploadXAnalyticsCsv(text);

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setErrorMsg(result.message || 'Failed to parse CSV file.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reading CSV file.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      aria-label="Import Real X (Twitter) Analytics"
      className="p-6 rounded-2xl bg-white border border-[var(--line)] shadow-2xl max-w-lg w-full flex flex-col gap-3"
    >
      <div className="space-y-4">
        <div>
          <h3 style={{ fontSize: '18px', letterSpacing: '-.02em', fontWeight: 600 }}>Import Real X (Twitter) Analytics</h3>
          <p className="text-[12.5px] text-neutral-500 mt-1">Upload your official analytics CSV from analytics.x.com to populate 100% real views, replies, and likes into your database.</p>
        </div>

        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[12.5px] leading-relaxed text-neutral-600">
          <p className="font-semibold text-neutral-900 mb-1">How to get your free export from X:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://analytics.x.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">analytics.x.com</a></li>
            <li>Click <strong>Export data</strong> in the top-right corner.</li>
            <li>Choose <strong>By Tweet</strong> or <strong>By Day</strong> and download the CSV.</li>
          </ol>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 bg-neutral-50/50 hover:bg-neutral-50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-neutral-200 flex items-center justify-center mx-auto mb-2 text-neutral-600">
            <Icon name="upload" size={20} />
          </div>
          <p className="text-[13px] font-semibold text-neutral-800">
            {isProcessing ? 'Processing and saving real data...' : 'Click to select or drop X Analytics CSV'}
          </p>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">Supports official .csv exports from X</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-lg">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
