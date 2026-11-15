import { useEffect, useState } from 'react';
import { Download, Copy, Check, FileCode2, FolderTree } from 'lucide-react';
import { api } from '../lib/api';

interface RnFile {
  relativePath: string;
  content: string;
}

export function ReactNativeExplorer() {
  const [files, setFiles] = useState<RnFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const downloadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/export-react-native`
      : '/api/export-react-native';

  useEffect(() => {
    api
      .getReactNativeFiles()
      .then((res) => {
        setFiles(res.files);
        if (res.files.length > 0) {
          const preferred =
            res.files.find((f) => f.relativePath.includes('video-call')) || res.files[0];
          setSelectedPath(preferred.relativePath);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedFile = files.find((f) => f.relativePath === selectedPath);

  const handleCopy = async () => {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDownloadUrl = async () => {
    await navigator.clipboard.writeText(downloadUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-teal-700">
              Expo SDK 52 · Expo Router · react-native-webrtc
            </p>
            <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
              React Native Mobile Source Code
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Complete Android and iOS mobile project wired to the exact same authentication, doctor registration, appointment booking, fee checkout, and WebRTC signaling endpoints running in this workspace.
            </p>
          </div>

          <a
            href="/api/export-react-native"
            download="medlink-react-native-expo.zip"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Project (.zip)
          </a>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="text-slate-500 mr-2">Direct download link:</span>
            <a
              href="/api/export-react-native"
              download="medlink-react-native-expo.zip"
              className="font-mono text-teal-700 hover:underline break-all"
            >
              {downloadUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={handleCopyDownloadUrl}
            className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
          Loading React Native project files...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* File Tree */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-slate-100">
              <FolderTree className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-800">
                react-native-app ({files.length} files)
              </span>
            </div>

            <div className="space-y-1">
              {files.map((file) => {
                const isActive = file.relativePath === selectedPath;
                return (
                  <button
                    key={file.relativePath}
                    type="button"
                    onClick={() => setSelectedPath(file.relativePath)}
                    className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-teal-900 font-semibold border border-teal-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileCode2 className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate">{file.relativePath}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Code Viewer */}
          <section className="lg:col-span-8 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-slate-300 truncate">
                react-native-app/{selectedFile?.relativePath}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-[600px] text-slate-200">
              <code>{selectedFile?.content}</code>
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
