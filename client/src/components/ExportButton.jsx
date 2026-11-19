import { Download } from 'lucide-react';

export default function ExportButton({ onExport, disabled }) {
  if (disabled) return null;

  return (
    <button
      onClick={onExport}
      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      title="Export conversation"
    >
      <Download size={18} />
    </button>
  );
}
