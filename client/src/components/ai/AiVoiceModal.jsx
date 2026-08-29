import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { aiAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function AiVoiceModal({ isOpen, onClose }) {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: lang === 'hi' 
        ? 'नमस्ते किसान भाई! मैं आपका किसान सेतु एआई सहायक हूँ। आप बोलकर या लिखकर स्लॉट बुकिंग, मंडी कतार, क्वालिटी मानक या एमएसपी दरों के बारे में पूछ सकते हैं।'
        : 'Hello! I am your KisanSetu AI Assistant. You can ask me by voice or text about Mandi slot booking, token queue status, grain quality standards, or MSP rates.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speechSynthesisActive, setSpeechSynthesisActive] = useState(true);

  // Speech Recognition setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = () => {
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your query.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'pb' ? 'pa-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendQuery(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window && speechSynthesisActive) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendQuery = async (queryText = inputText) => {
    const q = queryText.trim();
    if (!q) return;

    // Add user query
    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await aiAPI.chatAssistant({ query: q, language: lang });
      if (res.data.success) {
        const botReply = res.data.response;
        setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
        speakText(botReply);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Server response error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[560px]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-kisan-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-snug flex items-center gap-2">
                KisanSetu Multilingual AI
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  Voice & NLP
                </span>
              </h3>
              <p className="text-xs text-slate-400">Ask in Hindi, Punjabi, Marathi, Telugu or English</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSpeechSynthesisActive(!speechSynthesisActive)}
              className={`p-2 rounded-lg border transition-colors ${
                speechSynthesisActive ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={speechSynthesisActive ? 'Voice Readout ON' : 'Voice Readout OFF'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'bot' && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[82%] whitespace-pre-line leading-relaxed shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-kisan-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Analyzing agricultural database...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-semibold uppercase flex-shrink-0">Try:</span>
          <button
            onClick={() => handleSendQuery('Wheat ka current MSP rate kya hai?')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0 border border-slate-700 transition-colors"
          >
            🌾 Wheat MSP Rate
          </button>
          <button
            onClick={() => handleSendQuery('Mera token number TK-101 kab aayega?')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0 border border-slate-700 transition-colors"
          >
            🎫 Token Status & ETA
          </button>
          <button
            onClick={() => handleSendQuery('Moisture percentage quality rules kya hain?')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0 border border-slate-700 transition-colors"
          >
            🧪 Quality Test Rules
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={startListening}
            className={`p-3 rounded-xl border transition-all ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title="Click and speak"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            placeholder={isListening ? 'Listening... Speak now!' : 'Type your query in Hindi or English...'}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kisan-500 placeholder-slate-500"
          />

          <button
            onClick={() => handleSendQuery()}
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-xl bg-kisan-600 hover:bg-kisan-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
