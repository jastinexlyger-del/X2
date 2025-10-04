import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import { MediaService } from './services/mediaService';
import { cloudTtsService } from './services/cloudTtsService';
import { chatHistoryService, Conversation } from './services/chatHistoryService';
import { MediaPreview } from './components/MediaPreview';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import {
  MessageSquare,
  Sparkles,
  PenTool,
  Code,
  Brain,
  Plus,
  Send,
  Image,
  Mic,
  Video,
  Circle,
  MicOff,
  Pause,
  Play,
  Upload,
  X,
  Copy,
  Check,
  Volume2,
  VolumeX,
  History,
  Trash2,
  Save
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode: string;
  isLoading?: boolean;
  mediaFile?: File;
  mediaPreview?: string;
}

interface AIMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  bgColor: string;
  description: string;
}

const AI_MODES: AIMode[] = [
  {
    id: 'beauty',
    name: 'Beauty & Style',
    icon: <Sparkles className="w-5 h-5" />,
    color: '#EC4899',
    textColor: 'text-pink-400',
    bgColor: 'bg-pink-500',
    description: 'Get expert advice on skincare, makeup, fashion, and personal style'
  },
  {
    id: 'writing',
    name: 'Writing Assistant',
    icon: <PenTool className="w-5 h-5" />,
    color: '#8B5CF6',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500',
    description: 'Improve your writing with grammar, style, and creative assistance'
  },
  {
    id: 'code',
    name: 'Code Helper',
    icon: <Code className="w-5 h-5" />,
    color: '#10B981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500',
    description: 'Get help with programming, debugging, and software development'
  },
  {
    id: 'general',
    name: 'General AI',
    icon: <Brain className="w-5 h-5" />,
    color: '#EC4899',
    textColor: 'text-pink-400',
    bgColor: 'bg-pink-500',
    description: 'Ask anything and get intelligent, helpful responses'
  }
];

function App() {
  const [currentMode, setCurrentMode] = useState<AIMode>(AI_MODES[3]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanup
  } = useMediaRecorder({
    onDataAvailable: async (audioBlob) => {
      await handleVoiceMessage(audioBlob);
    },
    onError: (error) => {
      console.error('Recording error:', error);
    },
    maxDuration: 60000 // 1 minute max
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Welcome to XLYGER AI! I'm your intelligent assistant powered by advanced AI. I can help you with various tasks including analyzing images, answering questions, writing assistance, coding help, and much more.

Current mode: **${currentMode.name}** - ${currentMode.description}

How can I assist you today?`,
      timestamp: new Date(),
      mode: currentMode.id
    };
    setMessages([welcomeMessage]);
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    const history = await chatHistoryService.getConversations();
    setConversations(history);
  };

  const saveCurrentConversation = async () => {
    if (messages.length <= 1) return;

    setSavingStatus('saving');

    if (currentConversationId) {
      await chatHistoryService.updateConversation(currentConversationId, messages);
    } else {
      const newId = await chatHistoryService.saveConversation(messages, currentMode.id);
      if (newId) {
        setCurrentConversationId(newId);
      }
    }

    await loadConversationHistory();
    setSavingStatus('saved');
    setTimeout(() => setSavingStatus('idle'), 2000);
  };

  const loadConversationById = async (conversationId: string) => {
    const loadedMessages = await chatHistoryService.loadConversation(conversationId);
    if (loadedMessages) {
      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setShowHistory(false);
      setSidebarOpen(false);
    }
  };

  const deleteConversationById = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await chatHistoryService.deleteConversation(conversationId);
      await loadConversationHistory();
      if (currentConversationId === conversationId) {
        handleNewChat();
      }
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSpeakMessage = async (messageId: string, content: string) => {
    // If already speaking this message, stop it
    if (speakingMessageId === messageId) {
      cloudTtsService.stop();
      setSpeakingMessageId(null);
      return;
    }

    // Stop any current speech
    cloudTtsService.stop();

    // Clean up markdown formatting for better speech
    const cleanContent = content.replace(/\*\*/g, '').replace(/\*/g, '').replace(/###/g, '').replace(/##/g, '').replace(/#/g, '');

    setSpeakingMessageId(messageId);

    try {
      await cloudTtsService.speak(cleanContent, () => {
        setSpeakingMessageId(null);
      });
    } catch (error) {
      console.error('Cloud TTS error:', error);
      setSpeakingMessageId(null);
    }
  };

  const getConversationHistory = () => {
    return messages.slice(-10).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };

  const handleModeChange = (mode: AIMode) => {
    if (mode.id !== currentMode.id) {
      setCurrentMode(mode);
      geminiService.setMode(mode.id);
      
      const switchMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Switched to **${mode.name}** mode. ${mode.description}

How can I help you in this mode?`,
        timestamp: new Date(),
        mode: mode.id
      };
      
      setMessages(prev => [...prev, switchMessage]);
    }
  };

  const handleSendMessage = async (messageContent?: string, file?: File) => {
    const content = messageContent || inputMessage.trim();
    if (!content && !file) return;

    let mediaPreview = '';
    if (file && file.type.startsWith('image/')) {
      try {
        mediaPreview = await MediaService.generateThumbnail(file);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content || `Shared ${file?.type.startsWith('image/') ? 'image' : 'file'}: ${file?.name}`,
      timestamp: new Date(),
      mode: currentMode.id,
      mediaFile: file,
      mediaPreview
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      let aiResponseText: string;
      
      if (file && file.type.startsWith('image/')) {
        aiResponseText = await geminiService.analyzeImage(file, content || "Please analyze this image and provide insights based on the current mode.");
      } else {
        const conversationHistory = getConversationHistory();
        aiResponseText = await geminiService.generateResponse(content, conversationHistory);
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponseText,
        timestamp: new Date(),
        mode: currentMode.id
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `New chat started in **${currentMode.name}** mode. ${currentMode.description}

How can I help you?`,
      timestamp: new Date(),
      mode: currentMode.id
    };
    setMessages([welcomeMessage]);
    setShowHistory(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = MediaService.validateFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      
      setSelectedFile(file);
      setShowMediaPreview(true);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleVoiceMessage = async (audioBlob?: Blob) => {
    try {
      // Check if speech recognition is supported
      if (!MediaService.isSpeechRecognitionSupported()) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: "Voice recognition is not supported in your browser. Please use a modern browser like Chrome or Edge, or type your message instead.",
          timestamp: new Date(),
          mode: currentMode.id
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      setIsTyping(true);
      
      // Add a temporary message showing we're processing
      const processingMessage: Message = {
        id: `processing-${Date.now()}`,
        type: 'user',
        content: '🎤 Processing voice message...',
        timestamp: new Date(),
        mode: currentMode.id,
        isLoading: true
      };
      setMessages(prev => [...prev, processingMessage]);

      try {
        // Convert blob to text using speech recognition
        const transcript = await MediaService.startSpeechRecognition();
        
        // Remove processing message and add actual voice message
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        
        const voiceMessage: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: `🎤 ${transcript}`,
          timestamp: new Date(),
          mode: currentMode.id
        };
        
        setMessages(prev => [...prev, voiceMessage]);
        
        // Generate AI response
        const conversationHistory = getConversationHistory();
        const aiResponseText = await geminiService.generateResponse(transcript, conversationHistory);
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiResponseText,
          timestamp: new Date(),
          mode: currentMode.id
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } catch (speechError) {
        // Remove processing message
        setMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: "I couldn't understand your voice message. Please try speaking clearly or type your message instead.",
          timestamp: new Date(),
          mode: currentMode.id
        };
        setMessages(prev => [...prev, errorMessage]);
      }
      
    } catch (error) {
      console.error('Voice processing error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: "There was an error processing your voice message. Please try typing instead.",
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartVoiceRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: "I couldn't access your microphone. Please check your browser permissions and try again.",
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const validation = MediaService.validateFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      
      setSelectedFile(file);
      setShowMediaPreview(true);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Drag and Drop Overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-pink-500 bg-opacity-20 border-4 border-dashed border-pink-400 z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-16 h-16 text-pink-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-pink-400">Drop your file here</p>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-gray-800 border-r border-gray-700 flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-lg text-white">XL</span>
            </div>
            <div>
              <div className="text-sm text-gray-400 font-medium">XLYGER</div>
              <div className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                XLYGER AI
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-2">Your intelligent AI assistant</p>
        </div>

        {/* Mode Selection */}
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wide">AI Modes</h3>
          <div className="space-y-3">
            {AI_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode)}
                className={`w-full flex items-start space-x-3 p-4 rounded-xl transition-all duration-200 hover:bg-gray-700 group ${
                  currentMode.id === mode.id
                    ? `${mode.bgColor} text-white shadow-lg transform scale-105` 
                    : 'bg-gray-700/50 text-gray-300 hover:text-white'
                }`}
              >
                <div className={`flex-shrink-0 ${currentMode.id === mode.id ? 'text-white' : mode.textColor}`}>
                  {mode.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium">{mode.name}</div>
                  <div className={`text-xs mt-1 ${currentMode.id === mode.id ? 'text-white/80' : 'text-gray-400'}`}>
                    {mode.description.split(' ').slice(0, 6).join(' ')}...
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span>NEW CHAT</span>
            </button>

            <button
              onClick={saveCurrentConversation}
              disabled={messages.length <= 1 || savingStatus === 'saving'}
              className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-xl transition-all duration-200 font-medium"
            >
              {savingStatus === 'saving' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Saving...</span>
                </>
              ) : savingStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="text-sm">SAVE CHAT</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-200 font-medium"
            >
              <History className="w-4 h-4" />
              <span className="text-sm">CHAT HISTORY</span>
            </button>
          </div>

          {/* Chat History */}
          {showHistory && (
            <div className="mt-6">
              <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wide">Saved Conversations</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No saved conversations yet</p>
                ) : (
                  conversations.map((conv) => {
                    const mode = AI_MODES.find(m => m.id === conv.mode) || AI_MODES[3];
                    return (
                      <div
                        key={conv.id}
                        onClick={() => loadConversationById(conv.id)}
                        className="group relative p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`flex-shrink-0 ${mode.textColor} mt-1`}>
                            {mode.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{conv.title}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteConversationById(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6">
            <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wide">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setInputMessage("Help me get started with XLYGER AI")}
                className="w-full text-left p-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                💡 "Help me get started"
              </button>
              <button 
                onClick={() => setInputMessage("What are your capabilities?")}
                className="w-full text-left p-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                🤖 "What can you do?"
              </button>
              <button 
                onClick={() => setInputMessage("Show me some examples")}
                className="w-full text-left p-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                📚 "Show me examples"
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Chat Header */}
        <div className="border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${currentMode.bgColor} rounded-lg flex items-center justify-center`}>
                {currentMode.icon}
              </div>
              <div className="hidden sm:block">
                <h2 className="font-semibold">{currentMode.name}</h2>
                <p className="text-sm text-gray-400">{currentMode.description}</p>
              </div>
              <div className="sm:hidden">
                <h2 className="font-semibold text-sm">{currentMode.name}</h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400 hidden sm:inline">Online</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {messages.map((message) => {
            const messageMode = AI_MODES.find(mode => mode.id === message.mode) || currentMode;
            return (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-2 sm:space-x-3 max-w-full sm:max-w-4xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                      : `${messageMode.bgColor}`
                  }`}>
                    {message.type === 'user' ? (
                      <span className="text-xs sm:text-sm font-bold">You</span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold">AI</span>
                    )}
                  </div>
                  <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-3 sm:p-4 rounded-2xl max-w-full ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : `bg-gray-800 border border-gray-700 text-gray-100`
                    }`}>
                      {message.mediaPreview && (
                        <div className="mb-2 sm:mb-3">
                          <img 
                            src={message.mediaPreview} 
                            alt="Uploaded content" 
                            className="max-w-full sm:max-w-xs rounded-lg"
                          />
                        </div>
                      )}
                      <div className={`leading-relaxed whitespace-pre-wrap text-sm sm:text-base ${message.isLoading ? 'opacity-70' : ''}`}>
                        {message.content.split('**').map((part, index) => 
                          index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                        )}
                      </div>
                      {message.type === 'ai' && (
                        <div className="flex justify-end mt-2 sm:mt-3 space-x-2">
                          <button
                            onClick={() => handleSpeakMessage(message.id, message.content)}
                            className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            title={speakingMessageId === message.id ? 'Stop speaking' : 'Listen to message'}
                          >
                            {speakingMessageId === message.id ? (
                              <>
                                <VolumeX className="w-3 h-3 animate-pulse" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 sm:mt-2 flex items-center space-x-2">
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.type === 'ai' && (
                        <span className={`px-2 py-1 rounded-full text-xs ${messageMode.bgColor} text-white hidden sm:inline`}>
                          {messageMode.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-2 sm:space-x-3 max-w-full sm:max-w-4xl">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentMode.bgColor}`}>
                  <span className="text-xs sm:text-sm font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <div className="inline-block p-3 sm:p-4 rounded-2xl bg-gray-800 border border-gray-700">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4 sm:p-6">
          {/* Media Controls */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sm:p-3 text-gray-400 hover:text-pink-400 hover:bg-gray-800 rounded-xl transition-all duration-200 group"
                title="Upload file"
              >
                <Image className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              
              <button
                onClick={isRecording ? stopRecording : handleStartVoiceRecording}
               disabled={!MediaService.isSpeechRecognitionSupported()}
                className={`p-2 sm:p-3 hover:bg-gray-800 rounded-xl transition-all duration-200 group ${
                 isRecording ? 'text-red-400 bg-red-400/10' : 
                 !MediaService.isSpeechRecognitionSupported() ? 'text-gray-600 cursor-not-allowed' :
                 'text-gray-400 hover:text-pink-400'
                }`}
               title={
                 !MediaService.isSpeechRecognitionSupported() ? 'Voice recording not supported in this browser' :
                 isRecording ? 'Stop recording' : 'Record voice'
               }
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5 animate-pulse" />
                ) : (
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
              </button>
              
              {isRecording && (
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:flex items-center space-x-1">
                    <div 
                      className="w-1 h-4 bg-red-400 rounded-full"
                      style={{ height: `${8 + audioLevel * 16}px` }}
                    ></div>
                    <div 
                      className="w-1 h-4 bg-red-400 rounded-full"
                      style={{ height: `${8 + audioLevel * 12}px` }}
                    ></div>
                    <div 
                      className="w-1 h-4 bg-red-400 rounded-full"
                      style={{ height: `${8 + audioLevel * 20}px` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm text-red-400 font-mono">
                    {formatDuration(duration)}
                  </span>
                  {isPaused ? (
                    <button onClick={resumeRecording} className="text-red-400">
                      <Play className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={pauseRecording} className="text-red-400">
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 hidden sm:block">
              Powered by Google Gemini AI
            </div>
          </div>

          {/* Message Input */}
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="w-full p-3 sm:p-4 bg-gray-800 border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 resize-none transition-all duration-200 text-sm sm:text-base"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              className="p-3 sm:p-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-3 sm:mt-4">
            XLYGER AI can make mistakes. Please verify important information. 
            <span className="text-pink-400 block sm:inline"> Made with ❤️ by Jastine Ayubu</span>
          </div>
        </div>
      </div>

      {/* Media Preview Modal */}
      {showMediaPreview && selectedFile && (
        <MediaPreview
          file={selectedFile}
          onClose={() => {
            setShowMediaPreview(false);
            setSelectedFile(null);
          }}
          onSend={(file, caption) => {
            handleSendMessage(caption, file);
            setShowMediaPreview(false);
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
}

export default App;