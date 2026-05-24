import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, Search, Send, Mic, Volume2, CheckCircle, AlertCircle,
  X, Users, ArrowLeft, ChevronRight, Image as ImageIcon, Camera, RotateCw,
  Reply, Trash2
} from 'lucide-react';
import { User, Conversation, ChatMessage, Product, ReplyRef } from '../../types';
import { api } from '../../api';
import SellerProfileModal from '../modals/SellerProfileModal';

// --- Long-press helper for mobile touch (reused from ChatWindow) ---

function createLongPressHandlers(onLongPress: () => void, delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let longPressTriggered = false;
  let touchActive = false;
  const MOVE_THRESHOLD = 10;

  const start = (e: React.TouchEvent) => {
    touchActive = true;
    longPressTriggered = false;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    timer = setTimeout(() => {
      longPressTriggered = true;
      onLongPress();
    }, delay);
  };

  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  const move = (e: React.TouchEvent) => {
    if (!timer) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancel();
  };

  const end = (e: React.TouchEvent) => {
    cancel();
    if (longPressTriggered) e.preventDefault();
    setTimeout(() => { touchActive = false; }, 0);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (touchActive) e.preventDefault();
  };

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
    onContextMenu: handleContextMenu,
  };
}

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
  products?: Product[];
  initialConversationId?: string | null;
  onInitialConversationHandled?: () => void;
}

type View = 'inbox' | 'directory' | 'chat';

// --- Component ---

export default function MessagesPage({
  currentUser, conversations, onConversationsChange, socketRef, products = [],
  initialConversationId, onInitialConversationHandled,
}: MessagesPageProps) {
  const [view, setView] = useState<View>('inbox');
  const [sellers, setSellers] = useState<User[]>([]);
  const [buyers, setBuyers] = useState<User[]>([]);
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedSellerForProfile, setSelectedSellerForProfile] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Feature: Reply
  const [replyingTo, setReplyingTo] = useState<ReplyRef | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Feature: Unsend
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async (mode?: 'user' | 'environment') => {
    const targetMode = mode === 'user' || mode === 'environment' ? mode : facingMode;
    // Release any existing stream first
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this browser or environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetMode },
        audio: false
      });
      setCameraStream(stream);
      cameraStreamRef.current = stream;
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera permissions in your settings.');
      } else {
        setCameraError('Could not access camera. Make sure it is not in use by another app.');
      }
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setCameraError(null);
    setFacingMode('user'); // Reset to default front camera
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(dataUrl);
        stopCamera();
      }
    }
  };
 
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSocketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');
  const activeConvRef = useRef<Conversation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5_000_000) {
      setRecordingError('Image is too large — please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.onerror = () => {
      setRecordingError('Failed to read image. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // Open a specific conversation when navigated here from Marketplace
  useEffect(() => {
    if (!initialConversationId) return;
    const conv = conversations.find(c => (c._id || c.id) === initialConversationId);
    if (conv) {
      setActiveConv(conv);
      setView('chat');
      onInitialConversationHandled?.();
    }
  }, [initialConversationId, conversations]);

  // Fetch directory (sellers for buyers, buyers for sellers)
  useEffect(() => {
    if (view === 'directory') {
      const isSeller = currentUser.role === 'farmer' || currentUser.role === 'artisan';
      if (isSeller && buyers.length === 0) {
        setLoadingSellers(true);
        api.buyers.list()
          .then(setBuyers)
          .catch(() => {})
          .finally(() => setLoadingSellers(false));
      } else if (!isSeller && sellers.length === 0) {
        setLoadingSellers(true);
        api.sellers.list()
          .then(setSellers)
          .catch(() => {})
          .finally(() => setLoadingSellers(false));
      }
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

    // Feature: listen for unsend events
    chatSocketRef.current.on('message_unsent', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => {
        const mid = m.id || (m as any)._id;
        if (mid === messageId) {
          return { ...m, unsent: true, text: '', audio: undefined, image: undefined };
        }
        return m;
      }));
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

  /** Scroll to a message and briefly highlight it */
  const scrollToMessage = useCallback((msgId: string) => {
    const el = messageRefs.current.get(msgId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  }, []);

  /** Feature: unsend a message */
  const handleUnsend = useCallback((msgId: string) => {
    if (!chatSocketRef.current || !activeConv) return;
    const convId = activeConv._id || activeConv.id;
    chatSocketRef.current.emit('unsend_message', {
      conversationId: convId,
      messageId: msgId,
      senderId: currentUser.id,
    });
    setContextMenuMsgId(null);
  }, [activeConv, currentUser.id]);

  // Send text message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !chatSocketRef.current || !activeConv) return;
    const convId = activeConv._id || activeConv.id;
    const otherUid = Object.keys(activeConv.participantNames).find(uid => uid !== currentUser.id);
    
    const imageToSend = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const replyPayload = replyingTo || undefined;
    setReplyingTo(null);

    chatSocketRef.current.emit('send_message', {
      conversationId: convId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: newMessage.trim(),
      image: imageToSend || undefined,
      replyTo: replyPayload,
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
  const isSeller = currentUser.role === 'farmer' || currentUser.role === 'artisan';
  const directoryUsers = isSeller ? buyers : sellers;
  const directoryLabel = isSeller ? 'Browse Buyers' : 'Browse Sellers';
  const directoryEmptyLabel = isSeller ? 'No buyers found' : 'No sellers found';
  const directoryEmptySubLabel = isSeller
    ? 'No registered buyers yet'
    : 'Start messaging farmers and craft producers';
  const directorySearchPlaceholder = isSeller
    ? 'Search buyers...'
    : 'Search farmers and craft producers...';

  const filteredSellers = useMemo(() => {
    const q = sellerSearch.toLowerCase();
    return directoryUsers
      .filter(s => s.id !== currentUser.id)
      .filter(s => !q || s.fullName.toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q));
  }, [directoryUsers, sellerSearch, currentUser.id]);

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
            {view === 'directory' ? <><MessageSquare size={16} /> Inbox</> : <><Users size={16} /> {directoryLabel}</>}
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
                <p className="text-sm text-gray-400 mb-6">{directoryEmptySubLabel}</p>
                <button
                  onClick={() => setView('directory')}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Browse {isSeller ? 'Buyers' : 'Sellers'}
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
                placeholder={directorySearchPlaceholder}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {loadingSellers ? (
              <div className="text-center py-16 text-gray-400 font-bold">Loading {isSeller ? 'buyers' : 'sellers'}...</div>
            ) : filteredSellers.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-primary/30" />
                </div>
                <p className="font-bold text-gray-400">{directoryEmptyLabel}</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div>
                {filteredSellers.map(seller => (
                  <div
                    key={seller.id}
                    className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Left: Avatar + Name (Clickable to view profile) */}
                    <button
                      onClick={() => {
                        setSelectedSellerForProfile(seller);
                        setIsProfileModalOpen(true);
                      }}
                      className="flex items-center gap-4 text-left flex-grow focus:outline-none group/avatar"
                      title="View Profile"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 transition-transform group-hover/avatar:scale-105 shadow-sm ${
                        isSeller
                          ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700'
                          : seller.role === 'farmer'
                            ? 'bg-gradient-to-br from-green-100 to-green-50 text-green-700'
                            : 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700'
                      }`}>
                        {seller.fullName[0]}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-gray-800 truncate block group-hover/avatar:text-primary transition-colors">
                          {seller.fullName}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest block ${
                              isSeller
                                ? 'text-blue-600'
                                : seller.role === 'farmer' ? 'text-green-600' : 'text-purple-600'
                            }`}>
                          {isSeller ? 'Buyer' : seller.role === 'artisan' ? 'Craft Producer' : 'Farmer'}
                        </span>
                      </div>
                    </button>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setSelectedSellerForProfile(seller);
                          setIsProfileModalOpen(true);
                        }}
                        className="px-4 py-2 border border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => openConversationWith(seller)}
                        className="px-4 py-2 bg-primary text-white hover:bg-primary/95 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-95"
                      >
                        <MessageSquare size={13} />
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && activeConv && (
        <div className="flex-grow bg-white rounded-3xl shadow-sm border border-gray-50 flex flex-col overflow-hidden relative">
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
          <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-white" onClick={() => contextMenuMsgId && setContextMenuMsgId(null)}>
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUser.id;
              const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
              const msgKey = msg.id || (msg as any)._id || String(idx);
              const isHighlighted = highlightedMsgId === msgKey;
              const isUnsent = !!msg.unsent;
              const showContextMenu = contextMenuMsgId === msgKey;

              const triggerReply = () => {
                if (isUnsent) return;
                setContextMenuMsgId(null);
                setReplyingTo({
                  id: msgKey,
                  senderId: msg.senderId,
                  senderName: msg.senderName,
                  text: msg.audio ? undefined : (msg.text || undefined),
                  hasAudio: !!msg.audio,
                  hasImage: !!msg.image,
                });
              };

              const longPressHandlers = createLongPressHandlers(() => {
                if (isUnsent) return;
                setContextMenuMsgId(msgKey);
              });

              return (
                <div
                  key={msgKey}
                  ref={(el) => {
                    if (el) messageRefs.current.set(msgKey, el);
                    else messageRefs.current.delete(msgKey);
                  }}
                  className={`flex items-end gap-2 ${
                    isMe ? 'justify-end' : 'justify-start'
                  } ${!showAvatar ? 'mt-1' : 'mt-4'} group/bubble relative`}
                >
                  {!isMe && showAvatar && (
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                      {msg.senderName[0]}
                    </div>
                  )}
                  {!isMe && !showAvatar && <div className="w-7" />}

                  {/* Desktop: reply + unsend buttons on left of sent messages */}
                  {isMe && !isUnsent && (
                    <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 order-first">
                      <button
                        onClick={() => handleUnsend(msgKey)}
                        className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Unsend"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={triggerReply}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                    </div>
                  )}

                  {/* Unsent message placeholder */}
                  {isUnsent ? (
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-[13px] leading-snug ${
                      isMe ? 'rounded-br-sm' : 'rounded-bl-sm'
                    } border border-dashed border-gray-300 bg-gray-50`}>
                      <p className="text-gray-400 italic text-[12px] select-none">Message unsent</p>
                    </div>
                  ) : (
                    <div
                      {...longPressHandlers}
                      className={`msg-bubble max-w-[75%] px-4 py-2 rounded-2xl text-[13px] leading-snug shadow-sm transition-colors duration-300 ${
                        isMe
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-[#F0F2F5] text-gray-800 rounded-bl-sm'
                      } ${isHighlighted ? '!bg-yellow-200 !text-gray-900' : ''}`}
                    >
                      {/* Quoted reply preview */}
                      {msg.replyTo && (
                        <button
                          type="button"
                          onClick={() => scrollToMessage(msg.replyTo!.id)}
                          className={`block w-full text-left mb-2 rounded-lg overflow-hidden border-l-4 ${
                            isMe ? 'border-white/60 bg-white/15 hover:bg-white/25' : 'border-primary/60 bg-primary/8 hover:bg-primary/15'
                          } px-2 py-1 transition-colors`}
                        >
                          <p className={`text-[10px] font-bold mb-0.5 ${
                            isMe ? 'text-white/80' : 'text-primary'
                          }`}>
                            {msg.replyTo.senderName}
                          </p>
                          <p className={`text-[11px] truncate opacity-80 ${
                            isMe ? 'text-white' : 'text-gray-600'
                          }`}>
                            {msg.replyTo.hasAudio ? '🎤 Voice message'
                              : msg.replyTo.hasImage ? '📷 Photo'
                              : (msg.replyTo.text || 'Message')}
                          </p>
                        </button>
                      )}

                      {msg.audio ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Volume2 size={14} className={isMe ? 'text-white' : 'text-primary'} />
                            <span className="text-[10px] uppercase font-bold opacity-70">Voice Message</span>
                          </div>
                          <AudioPlayer src={msg.audio} />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {msg.image && (
                            <img 
                              src={msg.image} 
                              alt="Message attachment" 
                              className="max-h-48 rounded-xl object-cover cursor-zoom-in hover:opacity-90 transition-opacity shadow-sm max-w-full"
                              onClick={() => setLightboxImage(msg.image || null)}
                            />
                          )}
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desktop: reply button on right side of received messages */}
                  {!isMe && !isUnsent && (
                    <button
                      onClick={triggerReply}
                      className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0"
                      title="Reply"
                    >
                      <Reply size={14} />
                    </button>
                  )}

                  {/* Mobile: context menu (long press) */}
                  {showContextMenu && (
                    <div
                      className={`absolute z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[140px] ${
                        isMe ? 'right-0 bottom-full mb-2' : 'left-9 bottom-full mb-2'
                      }`}
                    >
                      <button
                        onClick={triggerReply}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Reply size={14} className="text-gray-500" />
                        Reply
                      </button>
                      {isMe && (
                        <button
                          onClick={() => handleUnsend(msgKey)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                          Unsend
                        </button>
                      )}
                      <button
                        onClick={() => setContextMenuMsgId(null)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          {/* Reply preview bar */}
          {replyingTo && (
            <div className="mx-3 mb-1 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 shrink-0">
              <div className="flex-grow min-w-0">
                <p className="text-[10px] font-bold text-blue-500 mb-0.5">Replying to {replyingTo.senderName}</p>
                <p className="text-[11px] text-gray-600 truncate">
                  {replyingTo.hasAudio ? '🎤 Voice message'
                    : replyingTo.hasImage ? '📷 Photo'
                    : (replyingTo.text || 'Message')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="shrink-0 p-1 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Selected Image Preview Panel */}
          {selectedImage && (
            <div className="mx-3 mb-2 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl flex items-center gap-3 relative shrink-0">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm shrink-0">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="text-[11px] text-gray-500 font-medium truncate flex-grow">
                Ready to send image...
              </div>
            </div>
          )}

          {/* Recording error */}
          {recordingError && (
            <div className="mx-3 mb-1 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 shrink-0">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{recordingError}</span>
              <button onClick={() => setRecordingError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-50 flex gap-2 items-center shrink-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
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
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full transition-colors text-primary hover:bg-primary/10" title="Send Image">
                  <ImageIcon size={20} />
                </button>
                <button type="button" onClick={() => startCamera()} className="p-2 rounded-full transition-colors text-primary hover:bg-primary/10" title="Take Photo">
                  <Camera size={20} />
                </button>
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
                <button type="submit" disabled={!newMessage.trim() && !selectedImage} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:text-gray-300">
                  <Send size={20} fill={(newMessage.trim() || selectedImage) ? 'currentColor' : 'none'} />
                </button>
              </>
            )}
          </form>

          {/* Enlarged Image Lightbox */}
          {lightboxImage && (
            <div 
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm transition-all"
              onClick={() => setLightboxImage(null)}
            >
              <button 
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <img 
                src={lightboxImage} 
                alt="Enlarged Message attachment" 
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform" 
              />
            </div>
          )}

          {/* Camera Overlay */}
          {isCameraActive && (
            <div className="absolute top-[65px] inset-x-0 bottom-0 bg-neutral-950 flex flex-col z-50 text-white transition-opacity duration-200">
              {/* Camera Header */}
              <div className="p-3 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Camera Preview</span>
                <button 
                  type="button" 
                  onClick={stopCamera} 
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-neutral-300"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Video / Preview Area */}
              <div className="flex-grow flex items-center justify-center relative p-4 bg-neutral-900 overflow-hidden">
                {cameraError ? (
                  <div className="text-center p-5 bg-red-950/40 border border-red-900/30 rounded-2xl max-w-[280px] backdrop-blur-md">
                    <AlertCircle className="mx-auto mb-2.5 text-red-500" size={28} />
                    <p className="text-[11px] font-semibold leading-normal text-red-200">{cameraError}</p>
                    <button 
                      type="button"
                      onClick={() => startCamera(facingMode)} 
                      className="mt-3.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md shadow-red-900/30"
                    >
                      Try Again
                    </button>
                  </div>
                ) : !cameraStream ? (
                  <div className="text-center">
                    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-[10px] text-neutral-400 font-medium">Accessing camera...</p>
                  </div>
                ) : (
                  <div className="relative w-full max-w-[400px] aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                    />
                    <div className="absolute inset-0 border border-white/10 pointer-events-none rounded-xl" />
                  </div>
                )}
              </div>

              {/* Capture Controls */}
              {cameraStream && !cameraError && (
                <div className="p-4 bg-black/40 backdrop-blur-md flex justify-center items-center border-t border-white/5 shrink-0 relative">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/20 active:scale-95 transition-all shadow-lg relative group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white transition-transform group-hover:scale-90" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="absolute right-6 p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all border border-white/10 shadow-lg backdrop-blur-md"
                    title="Switch Camera"
                  >
                    <RotateCw size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Seller Profile Modal */}
      {selectedSellerForProfile && (
        <SellerProfileModal
          isOpen={isProfileModalOpen}
          seller={selectedSellerForProfile}
          products={products}
          currentUser={currentUser}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedSellerForProfile(null);
          }}
          onStartChat={openConversationWith}
        />
      )}
    </motion.div>
  );
}
