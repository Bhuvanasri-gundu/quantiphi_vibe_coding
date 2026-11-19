import { useState } from 'react';
import { useChat } from './hooks/useChat';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    tone,
    selectConversation,
    sendMessage,
    createNewChat,
    deleteConversation,
    searchConversations,
    regenerateResponse,
    setTone,
    stopStreaming,
    exportConversation,
  } = useChat();

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="flex h-screen bg-white font-sans antialiased text-gray-900 overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={selectConversation}
        onNewChat={createNewChat}
        onDeleteConversation={deleteConversation}
        onSearch={searchConversations}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <ChatWindow
        messages={messages}
        currentConversation={currentConversation}
        isLoading={isLoading}
        error={error}
        tone={tone}
        onToneChange={setTone}
        onSendMessage={sendMessage}
        onRegenerate={regenerateResponse}
        onExport={exportConversation}
        onToggleSidebar={toggleSidebar}
        onStopStreaming={stopStreaming}
      />
    </div>
  );
}
