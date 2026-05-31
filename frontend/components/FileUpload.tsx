'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  label?: string;
}

export default function FileUpload({ onUpload, accept = '.pdf', label = '上传 PDF 课件' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.pdf')) {
        await uploadFile(file);
      } else {
        setMessage('请上传 PDF 文件');
      }
    },
    [onUpload]
  );

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setMessage('');
    try {
      await onUpload(file);
      setMessage(`上传成功：${file.name}`);
    } catch (err) {
      setMessage('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
              <span className="text-slate-500">上传中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-slate-400" />
              <div>
                <p className="text-slate-600 font-medium">{label}</p>
                <p className="text-slate-400 text-sm mt-1">拖拽 PDF 文件到此处或点击选择</p>
              </div>
            </div>
          )}
        </label>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.includes('失败') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
