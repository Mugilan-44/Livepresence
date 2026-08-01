import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UploadDocumentModal({ onClose, onUploadDoc, activeUser, initialCategory }) {
  const [documentType, setDocumentType] = useState(initialCategory || 'National Identity (Aadhaar Card)');

  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB limit

  const handleSimulateFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setError('');
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 1 MB limit! Please choose a document smaller than 1 MB.`);
        setFileName('');
        setFileSize('');
        setFileUrl('');
        return;
      }

      setFileName(file.name);
      setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target.result;

        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setFileUrl(compressedDataUrl);
          };
          img.src = rawDataUrl;
        } else {
          setFileUrl(rawDataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileName && !fileUrl) {
      setError('Please select a document file (.pdf, .jpg, .png) under 1 MB to upload.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUploadDoc({
        userId: activeUser?.id,
        documentType,
        fileName: fileName || `${documentType.split(' ')[0]}_Document.pdf`,
        fileSize: fileSize || '500 KB',
        fileUrl
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Upload Verification Document</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Compliance & Verification Portal (Max 1 MB)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Select Document Category</label>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="National Identity (Aadhaar Card)">National Identity (Aadhaar Card)</option>
              <option value="Tax Identity (PAN Card)">Tax Identity (PAN Card)</option>
              <option value="Passport Document">Passport Document</option>
              <option value="Driving License">Driving License</option>
              <option value="10th Class SSLC Marksheet">10th Class SSLC Marksheet</option>
              <option value="12th Class Higher Secondary Marksheet">12th Class Higher Secondary Marksheet</option>
              <option value="Undergraduate Degree / Marksheet">Undergraduate Degree / Marksheet</option>
              <option value="Postgraduate Degree / Diploma">Postgraduate Degree / Diploma</option>
              <option value="Bank Passbook / Cancelled Cheque">Bank Passbook / Cancelled Cheque</option>
              <option value="Previous Relieving & Experience Letter">Previous Relieving & Experience Letter</option>
              <option value="Signed Employment Offer Letter">Signed Employment Offer Letter</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Choose File (.pdf, .jpg, .png)</label>
            <div className="mt-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 relative">
              <input
                type="file"
                onChange={handleSimulateFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <FileText className="w-8 h-8 mx-auto text-blue-500 mb-2 opacity-80" />
              <div className="text-slate-800 dark:text-slate-200 font-semibold">
                {fileName ? fileName : 'Click or drop file to attach'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {fileName ? `File size: ${fileSize}` : 'Supported formats: PDF, JPG, PNG (Max 1 MB)'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-500 mt-0.5" />
            <span>Document must be less than 1 MB. It will be encrypted and submitted to HR Admin for verification scoring.</span>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-2"
            >
              {loading ? 'Uploading...' : 'Upload & Submit for Audit'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
