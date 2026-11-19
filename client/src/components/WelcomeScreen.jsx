import { BookOpen, Code, FileText, Lightbulb } from 'lucide-react';

const suggestions = [
  {
    text: 'Explain a complex technical concept',
    icon: BookOpen,
  },
  {
    text: 'Help me write better code',
    icon: Code,
  },
  {
    text: 'Summarize a document',
    icon: FileText,
  },
  {
    text: 'Brainstorm a new project idea',
    icon: Lightbulb,
  },
];

export default function WelcomeScreen({ onSendMessage }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          How can I help you today?
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Your space for clear thinking, useful answers and productive
          conversations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.text}
                onClick={() => onSendMessage(item.text)}
                className="flex items-start gap-3 p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <Icon
                  size={18}
                  className="text-gray-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0 transition-colors"
                />
                <span className="text-sm text-gray-700">{item.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
