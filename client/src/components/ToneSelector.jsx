const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'concise', label: 'Concise' },
];

export default function ToneSelector({ tone, onToneChange }) {
  return (
    <div className="flex items-center gap-1">
      {tones.map((t) => (
        <button
          key={t.value}
          onClick={() => onToneChange(t.value)}
          className={`
            px-3 py-1 text-xs font-medium rounded-full transition-colors
            ${
              tone === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
