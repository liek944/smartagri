import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, Search, Send, Mic, Volume2, CheckCircle, AlertCircle,
  X, Users, ArrowLeft, ChevronRight
} from 'lucide-react';
import { User, Conversation, ChatMessage } from '../../types';
import { api } from '../../api';

// --- Audio helpers (reused from ChatWindow) ---

function getSupportedMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function AudioPlayer({ src }: { src: string }) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    let objectUrl = '';
    try {
      const commaIdx = src.indexOf(',');
      const header = src.slice(0, commaIdx);
      const b64data = src.slice(commaIdx + 1);
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'audio/mp4';
      const byteChars = atob(b64data);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      objectUrl = URL.createObjectURL(new Blob([byteArray], { type: mime }));
      setBlobUrl(objectUrl);
    } catch { setHasError(true); }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (hasError) return <span className="text-xs opacity-60 italic">Audio unavailable</span>;
  if (!blobUrl) return <span className="text-xs opacity-50">Loading...</span>;
  return <audio src={blobUrl} controls className="h-8 max-w-full" onError={() => setHasError(true)} />;
}

// --- Types ---

interface MessagesPageProps {
  currentUser: User;
  conversations: Conversation[];
  onConversationsChange: (convs: Conversation[]) => void;
  socketRef: React.MutableRefObject<Socket | null>;
}

type View = 'inbox' | 'directory' | 'chat';

// --- Component ---

export default function MessagesPage({
  currentUser, conversations, onConversationsChange, socketRef,
}: MessagesPageProps) {
  const [view, setView] = useState<View>('inbox');
  const [sellers, setSellers] = useState<User[]>([]);
  const [sellerSearch, setSellerSearch] = useState('');
  const [inboxSearch, setInboxSearch] = useState('');
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSocketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');
  const activeConvRef = useRef<Conversation | null>(null);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Fetch sellers directory
  useEffect(() => {
    if (view === 'directory' && sellers.length === 0) {
      setLoadingSellers(true);
      api.sellers.list()
        .then(setSellers)
        .catch(() => {})
        .finally(() => setLoadingSellers(false));
    }
  }, [view]);

  // Listen for real-time conversation reordering
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleConvUpdate = (data: { conversationId: string; lastMessage: string; lastMessageTimestamp: string }) => {
      onConversationsChange(
        [...conversations].map(c => {
          const cid = c._id || c.id;
          if (cid === data.conversationId) {
            return { ...c, lastMessage: data.lastMessage, lastMessageTimestamp: data.lastMessageTimestamp };
          }
          return c;
        }).sort((a, b) => {
          const ta = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
          const tb = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
          return tb - ta;
        })
      );
    };

    socket.on('conversation_updated', handleConvUpdate);
    return () => { socket.off('conversation_updated', handleConvUpdate); };
  }, [socketRef.current, conversations, onConversationsChange]);

  // Chat socket setup
  useEffect(() => {
    if (!activeConv) return;
    const convId = activeConv._id || activeConv.id;

    chatSocketRef.current = io();
    chatSocketRef.current.emit('user_connected', currentUser.id);

    const otherUid = Object.keys(activeConv.participantNames).find(uid => uid !== currentUser.id);
    if (otherUid) chatSocketRef.current.emit('check_status', otherUid);

    chatSocketRef.current.on('user_status', ({ userId, status }: { userId: string; status: string }) => {
      if (userId === otherUid) setIsOnline(status === 'online');
    });

    fetch(`/api/messages/${convId}`).then(r => r.json()).then(setMessages);
    chatSocketRef.current.emit('join_conversation', convId);

    chatSocketRef.current.on('new_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => { chatSocketRef.current?.disconnect(); };
  }, [activeConv?.id, activeConv?._id]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Open a conversation with a seller
  const openConversationWith = async (seller: User) => {
    try {
      const conv = await api.conversations.start({
        participants: [currentUser.id, seller.id],
        participantNames: { [currentUser.id]: currentUser.fullName, [seller.id]: seller.fullName },
      });
      setActiveConv(conv);
      setView('chat');
      // Add to conversations list if new
      if (!conversations.find(c => (c._id || c.id) === (conv._id || conv.id))) {
        onConversationsChange([conv, ...conversations]);
      }
    } catch (err) { console.error('Failed to start conversation:', err); }
  };

  const openExistingConversation = (conv: Conversation) => {
    setActiveConv(conv);
    setView('chat');
  };

  // Send text message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatSocketRef.current || !activeConv) return;
    const convId = activeConv._id || activeConv.id;
    const otherUid = Object.keys(activeConv.participantNames).find(uid => uid !== currentUser.id);
    chatSocketRef.current.emit('send_message', {
      conversationId: convId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: newMessage.trim(),
      otherUserId: otherUid,
    });
    setNewMessage('');
  };

  // Voice recording
  const startRecording = async () => {
    setRecordingError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setRecordingError('Microphone not supported over HTTP.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
        if (blob.size > 1_500_000) { setRecordingError('Recording too long.'); return; }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => sendAudioMessage(reader.result as string);
      };
      mr.onerror = () => { setRecordingError('Recording failed.'); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); };
      mr.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setRecordingError('Microphone permission denied.');
      else if (err.name === 'NotFoundError') setRecordingError('No microphone found.');
      else setRecordingError('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendAudioMessage = (base64Audio: string) => {
    if (!chatSocketRef.current || !activeConv) return;
    const convId = activeConv._id || activeConv.id;
    chatSocketRef.current.emit('send_message', {
      conversationId: convId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: 'Voice Message',
      audio: base64Audio,
      otherUserId: Object.keys(activeConv.participantNames).find(uid => uid !== currentUser.id),
    });
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Filtered lists
  const filteredSellers = useMemo(() => {
    const q = sellerSearch.toLowerCase();
    return sellers
      .filter(s => s.id !== currentUser.id)
      .filter(s => !q || s.fullName.toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q));
  }, [sellers, sellerSearch, currentUser.id]);

  const filteredConversations = useMemo(() => {
    const q = inboxSearch.toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => {
      const otherName = Object.entries(c.participantNames).find(([uid]) => uid !== currentUser.id)?.[1] || '';
      return otherName.toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q);
    });
  }, [conversations, inboxSearch, currentUser.id]);

  const timeAgo = (ts: string | undefined) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  // ---- Render ----

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {view === 'chat' && (
            <button
              onClick={() => { setView('inbox'); setActiveConv(null); }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
          )}
          <h2 className="text-3xl font-black text-primary flex items-center gap-3">
            <MessageSquare size={32} />
            {view === 'chat' ? (
              <span className="text-xl md:text-3xl truncate">
                {activeConv && Object.entries(activeConv.participantNames).find(([uid]) => uid !== currentUser.id)?.[1]}
              </span>
            ) : 'Messages'}
          </h2>
        </div>
        {view !== 'chat' && (
          <button
            onClick={() => setView(view === 'inbox' ? 'directory' : 'inbox')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm ${
              view === 'directory'
                ? 'bg-primary text-white shadow-primary/30'
                : 'bg-white text-primary border border-primary/20 hover:bg-primary/5'
            }`}
          >
            {view === 'directory' ? <><MessageSquare size={16} /> Inbox</> : <><Users size={16} /> Browse Sellers</>}
          </button>
        )}
      </div>

      {/* Inbox View */}
      {view === 'inbox' && (
        <div className="flex-grow overflow-hidden bg-white rounded-3xl shadow-sm border border-gray-50">
          {/* Search */}
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={inboxSearch} onChange={e => setInboxSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          {/* Conversation list */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {filteredConversations.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-primary/30" />
                </div>
                <p className="font-bold text-gray-400 mb-2">No conversations yet</p>
                <p className="text-sm text-gray-400 mb-6">Start messaging farmers and craft producers</p>
                <button
                  onClick={() => setView('directory')}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Browse Sellers
                </button>
              </div>
            ) : (
              <div>
                {filteredConversations.map(conv => {
                  const otherEntry = Object.entries(conv.participantNames).find(([uid]) => uid !== currentUser.id);
                  const otherName = otherEntry?.[1] || 'User';
                  const initial = otherName[0] || '?';
                  return (
                    <button
                      key={conv.id || conv._id}
                      onClick={() => openExistingConversation(conv)}
                      className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center text-primary font-black text-lg shrink-0">
                        {initial}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-800 truncate">{otherName}</span>
                          <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">{timeAgo(conv.lastMessageTimestamp)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directory View */}
      {view === 'directory' && (
        <div className="flex-grow overflow-hidden bg-white rounded-3xl shadow-sm border border-gray-50">
          <div className="p-4 border-b border-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={sellerSearch} onChange={e => setSellerSearch(e.target.value)}
                placeholder="Search farmers and craft producers..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {loadingSellers ? (
              <div className="text-center py-16 text-gray-400 font-bold">Loading sellers...</div>
            ) : filteredSellers.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-primary/30" />
                </div>
                <p className="font-bold text-gray-400">No sellers found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div>
                {filteredSellers.map(seller => (
                  <button
                    key={seller.id}
                    onClick={() => openConversationWith(seller)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
                      seller.role === 'farmer'
                        ? 'bg-gradient-to-br from-green-100 to-green-50 text-green-700'
                        : 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700'
                    }`}>
                      {seller.fullName[0]}
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="font-bold text-gray-800 truncate block">{seller.fullName}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        seller.role === 'farmer' ? 'text-green-600' : 'text-purple-600'
                      }`}>
                        {seller.role === 'artisan' ? 'Craft Producer' : 'Farmer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">Message</span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && activeConv && (
        <div className="flex-grow bg-white rounded-3xl shadow-sm border border-gray-50 flex flex-col overflow-hidden">
          {/* Chat header bar */}
          <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3 bg-white">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
              {Object.entries(activeConv.participantNames).find(([uid]) => uid !== currentUser.id)?.[1]?.[0] || '?'}
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800">
                {Object.entries(activeConv.participantNames).find(([uid]) => uid !== currentUser.id)?.[1] || 'Chat'}
              </p>
              {isOnline ? (
                <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Active now
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> Offline
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-white">
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUser.id;
              const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${!showAvatar ? 'mt-1' : 'mt-4'}`}
                >
                  {!isMe && showAvatar && (
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                      {msg.senderName[0]}
                    </div>
                  )}
                  {!isMe && !showAvatar && <div className="w-7" />}
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-[13px] leading-snug shadow-sm ${
                    isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-[#F0F2F5] text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.audio ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Volume2 size={14} className={isMe ? 'text-white' : 'text-primary'} />
                          <span className="text-[10px] uppercase font-bold opacity-70">Voice Message</span>
                        </div>
                        <AudioPlayer src={msg.audio} />
                      </div>
                    ) : msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          {/* Recording error */}
          {recordingError && (
            <div className="mx-3 mb-1 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{recordingError}</span>
              <button onClick={() => setRecordingError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-50 flex gap-2 items-center">
            {isRecording ? (
              <div className="flex-grow flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs font-black text-red-500 uppercase tracking-widest">{formatDuration(recordingDuration)} Recording...</span>
                <button type="button" onClick={stopRecording} className="ml-auto bg-red-500 text-white rounded-full p-1 shadow-lg">
                  <CheckCircle size={16} />
                </button>
              </div>
            ) : (
              <>
                <button type="button" onClick={startRecording} className="p-2 rounded-full transition-colors text-primary hover:bg-primary/10" title="Record Voice Message">
                  <Mic size={20} />
                </button>
                <div className="flex-grow relative">
                  <input
                    type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2.5 bg-[#F0F2F5] border-none rounded-full focus:ring-0 text-sm"
                  />
                </div>
                <button type="submit" disabled={!newMessage.trim()} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:text-gray-300">
                  <Send size={20} fill={newMessage.trim() ? 'currentColor' : 'none'} />
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </motion.div>
  );
}
