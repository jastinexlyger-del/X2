import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
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
  Circle 
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode: string;
  isLoading?: boolean;
}

interface AIMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  bgColor: string;
}

const AI_MODES: AIMode[] = [
  {
    id: 'beauty',
    name: 'Beauty & Style',
    icon: <Sparkles className="w-5 h-5" />,
    color: '#EC4899',
    textColor: 'text-pink-400',
    bgColor: 'bg-pink-500'
  },
  {
    id: 'writing',
    name: 'Writing Assistant',
    icon: <PenTool className="w-5 h-5" />,
    color: '#8B5CF6',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500'
  },
  {
    id: 'code',
    name: 'Code Helper',
    icon: <Code className="w-5 h-5" />,
    color: '#10B981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500'
  },
  {
    id: 'general',
    name: 'General AI',
    icon: <Brain className="w-5 h-5" />,
    color: '#3B82F6',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500'
  }
];

function App() {
  const [currentMode, setCurrentMode] = useState<AIMode>(AI_MODES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Get conversation history for context
  const getConversationHistory = () => {
    return messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };

  const handleModeChange = (mode: AIMode) => {
    if (mode.id !== currentMode.id) {
      setCurrentMode(mode);
      geminiService.setMode(mode.id);
      
      // Add mode switch message
      const switchMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Switched to ${mode.name} Mode. How can I help you?`,
        timestamp: new Date(),
        mode: mode.id
      };
      
      setMessages(prev => [...prev, switchMessage]);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const messageContent = inputMessage.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
      mode: currentMode.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Generate real AI response
    const generateResponse = async () => {
      try {
        const conversationHistory = getConversationHistory();
        const aiResponseText = await geminiService.generateResponse(messageContent, conversationHistory);
        
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

    generateResponse();
  };

  const handleNewChat = () => {
    setMessages([]);
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Welcome to ${currentMode.name} Mode. How can I help you?`,
      timestamp: new Date(),
      mode: currentMode.id
    };
    setMessages([welcomeMessage]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      
      const fileMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `Uploaded ${isImage ? 'image' : 'file'}: ${file.name}`,
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, fileMessage]);

      setIsTyping(true);

      // Generate AI response to file
      const analyzeFile = async () => {
        try {
          let aiResponseText;
          
          if (isImage) {
            aiResponseText = await geminiService.analyzeImage(file, "Please analyze this image and provide insights based on the current mode.");
          } else {
            aiResponseText = `I can see you've uploaded "${file.name}". While I can't directly process this file type, I'd be happy to help you with any questions about it or assist you in the current ${currentMode.name} mode.`;
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
            content: "I'm having trouble analyzing this file right now. Please try again later.",
            timestamp: new Date(),
            mode: currentMode.id
          };
          setMessages(prev => [...prev, errorResponse]);
        } finally {
          setIsTyping(false);
        }
      };

      analyzeFile();
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleVoiceMessage = (transcript: string) => {
    if (transcript.trim()) {
      const voiceMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `🎤 ${transcript}`,
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, voiceMessage]);

      setIsTyping(true);

      // Generate AI response to voice message
      const generateVoiceResponse = async () => {
        try {
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
        } catch (error) {
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: "I'm having trouble processing your voice message right now. Please try again.",
            timestamp: new Date(),
            mode: currentMode.id
          };
          setMessages(prev => [...prev, errorResponse]);
        } finally {
          setIsTyping(false);
        }
      };

      generateVoiceResponse();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // For now, simulate speech-to-text with a placeholder
        // In a real implementation, you'd use a speech-to-text service
        handleVoiceMessage("This is a simulated transcription of your voice message. In a production app, this would be the actual transcribed text from your speech.");
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
        }
      }, 3000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg text-white">XL</span>
            </div>
            <div>
              <div className="text-sm text-gray-400">XLYGER</div>
              <div className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                XLYGER AI
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-4">Select Mode</h3>
          <div className="space-y-2">
            {AI_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-700 ${
                  currentMode.id === mode.id 
                    ? `${mode.bgColor} text-white shadow-lg transform scale-105` 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {mode.icon}
                <span className="font-medium">{mode.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-6">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>NEW CHAT</span>
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="p-6 mt-auto">
          <h3 className="text-gray-400 text-sm font-medium mb-4">Quick Prompts</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
              "Help me get started"
            </button>
            <button className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
              "What can you do?"
            </button>
            <button className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors">
              "Show me examples"
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className={`w-16 h-16 ${currentMode.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {currentMode.icon}
                </div>
                <h2 className={`text-2xl font-bold ${currentMode.textColor} mb-2`}>
                  {currentMode.name}
                </h2>
                <p className="text-gray-400">How can I help you today?</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const messageMode = AI_MODES.find(mode => mode.id === message.mode) || currentMode;
              return (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-gray-600' 
                        : `${messageMode.bgColor}`
                    }`}>
                      {message.type === 'user' ? (
                        <span className="text-sm font-bold">U</span>
                      ) : (
                        <span className="text-sm font-bold">A</span>
                      )}
                    </div>
                    <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-4 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-gray-700 text-white'
                          : `bg-gray-800 border border-gray-700 ${messageMode.textColor}`
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-3xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${currentMode.bgColor}`}>
                  <span className="text-sm font-bold">A</span>
                </div>
                <div className="flex-1">
                  <div className={`inline-block p-4 rounded-lg bg-gray-800 border border-gray-700 ${currentMode.textColor}`}>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-800 rounded-lg transition-colors"
              title="Upload file"
            >
              <Image className="w-5 h-5" />
            </button>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${
                isRecording ? 'text-red-400 animate-pulse' : 'text-pink-400 hover:text-pink-300'
              }`}
              title={isRecording ? 'Stop recording' : 'Record voice'}
            >
              <Mic className="w-5 h-5" />
            </button>
            
            <button
              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-800 rounded-lg transition-colors"
              title="Video call"
            >
              <Video className="w-5 h-5" />
            </button>
            
            <button
              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-800 rounded-lg transition-colors"
              title="Voice note"
            >
              <Circle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send a message..."
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="p-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            Free Research Preview. XLYGER AI may produce inaccurate information.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;