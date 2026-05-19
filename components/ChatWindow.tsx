import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, X, Mic, Volume2, CheckCircle, AlertCircle, Image as ImageIcon, Camera, RotateCw } from 'lucide-react';
import { Conversation, ChatMessage, User } from '../types';

/**
 * Detect the best supported MIME type for audio recording.
 * Safari/iOS only supports audio/mp4. Chrome/Android supports audio/webm.
 * Falling back through the list ensures cross-browser compatibility.
 */
function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // Let the browser choose its default
}

/**
 * AudioPlayer: converts a base64 data URL to a Blob URL before rendering.
 *
 * WHY: iOS Chrome (WebKit) cannot reliably load data:audio/... URIs in <audio>
 * elements — it renders the native error indicator even though playback may
 * partially work. Blob URLs (blob://...) are fully supported everywhere.
 * We revoke the URL on unmount to avoid memory leaks.
 */
function AudioPlayer({ src }: { src: string }) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    try {
      // Parse the data URL: "data:<mime>;base64,<data>"
      const commaIdx = src.indexOf(',');
      const header = src.slice(0, commaIdx);        // e.g. "data:audio/mp4;base64"
      const b64data = src.slice(commaIdx + 1);      // the raw base64 string
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'audio/mp4';

      const byteChars = atob(b64data);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mime });
      objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    } catch {
      setHasError(true);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (hasError) {
    return <span className="text-xs opacity-60 italic">Audio unavailable</span>;
  }
  if (!blobUrl) {
    return <span className="text-xs opacity-50">Loading...</span>;
  }
  return (
    <audio
      src={blobUrl}
      controls
      className="h-8 max-w-full"
      onError={() => setHasError(true)}
    />
  );
}

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
}

export default function ChatWindow({ conversation, currentUser, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
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
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');
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

  const startRecording = async () => {
    setRecordingError(null);
    try {
      // Check if the API is even available (not available on HTTP in some browsers)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setRecordingError('Microphone not supported. Make sure the site is loaded over HTTPS.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Detect the right format for this browser/device (Safari needs mp4, Chrome uses webm)
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        const effectiveMime = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: effectiveMime });

        // Guard: warn if recording is very large (> 2MB as base64 ~= 1.5MB raw)
        if (audioBlob.size > 1_500_000) {
          setRecordingError('Recording too long — please keep voice messages under ~1 minute.');
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendAudioMessage(base64Audio);
        };
        reader.onerror = () => {
          setRecordingError('Failed to process audio. Please try again.');
        };
      };

      mediaRecorder.onerror = () => {
        setRecordingError('Recording failed. Please try again.');
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      // timeslice=250ms: flush chunks every 250ms so data isn't lost if stop() races with socket
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecordingError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setRecordingError('No microphone found on this device.');
      } else {
        setRecordingError('Could not access microphone. Try refreshing the page.');
      }
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
    if (!socketRef.current) return;
    socketRef.current.emit('send_message', {
      conversationId: conversation.id,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: 'Voice Message',
      audio: base64Audio,
      otherUserId: Object.keys(conversation.participantNames).find(uid => uid !== currentUser?.id)
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const otherUserId = Object.keys(conversation.participantNames).find(uid => uid !== currentUser?.id);

  useEffect(() => {
    // Connect to Socket.io
    socketRef.current = io();

    // Tell server we are online
    if (currentUser?.id) {
      socketRef.current.emit('user_connected', currentUser.id);
    }
    
    // Check initial status of the other user
    if (otherUserId) {
      socketRef.current.emit('check_status', otherUserId);
    }

    // Listen to status updates
    socketRef.current.on('user_status', ({ userId, status }: { userId: string, status: string }) => {
      if (userId === otherUserId) {
        setIsOnline(status === 'online');
      }
    });

    // Fetch initial messages
    fetch(`/api/messages/${conversation.id}`)
      .then(res => res.json())
      .then(data => setMessages(data));

    // Join room
    socketRef.current.emit('join_conversation', conversation.id);

    // Listen for new messages
    socketRef.current.on('new_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [conversation.id, currentUser?.id, otherUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !socketRef.current) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    socketRef.current.emit('send_message', {
      conversationId: conversation.id,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: msgText,
      image: imageToSend || undefined,
      otherUserId: Object.keys(conversation.participantNames).find(uid => uid !== currentUser?.id)
    });
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-[1000] overflow-hidden">
      {/* Header - Messenger Style */}
      <div className="p-3 border-b flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {Object.entries(conversation.participantNames).find(([uid]) => uid !== currentUser?.id)?.[1]?.[0] || '?'}
          </div>
          <div className="text-left">
            <p className="font-bold text-sm leading-none text-gray-800">
              {Object.entries(conversation.participantNames).find(([uid]) => uid !== currentUser?.id)?.[1] || 'Chat'}
            </p>
            {isOnline ? (
              <p className="text-[10px] text-green-500 font-bold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Active now
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 font-bold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> Offline
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
        </div>
      </div>

      {/* Messages - Messenger Style */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-white">

        
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser?.id;
          const showAvatar = idx === 0 || messages[idx-1].senderId !== msg.senderId;
          
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
                isMe 
                  ? 'bg-primary text-white rounded-br-sm' 
                  : 'bg-[#F0F2F5] text-gray-800 rounded-bl-sm'
              }`}>
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
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Selected Image Preview Panel */}
      {selectedImage && (
        <div className="mx-3 mb-2 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl flex items-center gap-3 relative">
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

      {/* Recording error banner */}
      {recordingError && (
        <div className="mx-3 mb-1 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span className="leading-snug">{recordingError}</span>
          <button onClick={() => setRecordingError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-3 bg-white flex gap-2 items-center">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          accept="image/*" 
          className="hidden" 
        />
        {isRecording ? (
          <div className="flex-grow flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs font-black text-red-500 uppercase tracking-widest">{formatDuration(recordingDuration)} Recording...</span>
            <button 
              type="button" 
              onClick={stopRecording}
              className="ml-auto bg-red-500 text-white rounded-full p-1 shadow-lg"
            >
              <CheckCircle size={16} />
            </button>
          </div>
        ) : (
          <>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full transition-colors text-primary hover:bg-primary/10"
              title="Send Image"
            >
              <ImageIcon size={20} />
            </button>
            <button 
              type="button" 
              onClick={startCamera}
              className="p-2 rounded-full transition-colors text-primary hover:bg-primary/10"
              title="Take Photo"
            >
              <Camera size={20} />
            </button>
            <button 
              type="button" 
              onClick={startRecording}
              className="p-2 rounded-full transition-colors text-primary hover:bg-primary/10"
              title="Record Voice Message"
            >
              <Mic size={20} />
            </button>
            <div className="flex-grow relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Aa"
                className="w-full px-4 py-2 bg-[#F0F2F5] border-none rounded-full focus:ring-0 text-sm"
              />
            </div>
            <button 
              type="submit" 
              disabled={!newMessage.trim() && !selectedImage}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:text-gray-300"
            >
              <Send size={20} fill={(newMessage.trim() || selectedImage) ? "currentColor" : "none"} />
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
              <div className="text-center p-5 bg-red-950/40 border border-red-900/30 rounded-2xl max-w-[240px] backdrop-blur-md">
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
              <div className="relative w-full max-w-[280px] aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center">
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
  );
}
