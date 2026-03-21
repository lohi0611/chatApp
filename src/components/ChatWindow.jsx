import { useEffect, useState, useRef } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import "./ChatWindow.css";

function ChatWindow({ user, selectedUser }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  
  // 📸 Advanced Media States
  const [mediaFiles, setMediaFiles] = useState([]); // Array of files {file, preview, type}
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null); // Lightbox
  const [isDragging, setIsDragging] = useState(false);
  
  const chatId = 
    user.uid < selectedUser.uid 
      ? `${user.uid}_${selectedUser.uid}` 
      : `${selectedUser.uid}_${user.uid}`;
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedUser]);

  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(nextMessages);
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!selectedUser) return;
    const userRef = doc(db, "users", selectedUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      setSelectedUserProfile(snapshot.data());
    });
    return () => unsubscribe();
  }, [selectedUser]);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    updateDoc(doc(db, "users", user.uid), { typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "users", user.uid), { typing: false });
    }, 2500);
  };


  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newMedia = files.map(file => ({ file, preview: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image" }));
    setMediaFiles(prev => [...prev, ...newMedia]);
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newMedia = files.map(file => ({ file, preview: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image" }));
      setMediaFiles(prev => [...prev, ...newMedia]);
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "chat_upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/dfvytzlqx/auto/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    return await res.json();
  };

  const sendMediaMessage = async () => {
    if (mediaFiles.length === 0 || !user) return;
    try {
      setIsUploading(true);
      const uploadedMedia = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        const data = await uploadToCloudinary(mediaFiles[i].file);
        uploadedMedia.push({ url: data.secure_url, type: mediaFiles[i].type });
      }
      await addDoc(collection(db, "chats", chatId, "messages"), {
        media: uploadedMedia,
        sender: user.displayName || user.email,
        senderEmail: user.email,
        text: message.trim(),
        timestamp: serverTimestamp(),
      });
      setMediaFiles([]);
      setMessage("");
      setIsUploading(false);
    } catch (err) { console.error(err); setIsUploading(false); }
  };

  const sendMessage = async () => {
    if (mediaFiles.length > 0) { sendMediaMessage(); return; }
    if (!message.trim() || !user) return;
    const text = message.trim();
    setMessage("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, "users", user.uid), { typing: false });
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text,
      sender: user.displayName || user.email,
      senderEmail: user.email,
      timestamp: serverTimestamp(),
    });
  };

  return (
    <div className={`chat-container ${isDragging ? "is-dragging" : ""}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} >
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-user">
          {selectedUser.photo ? ( <img src={selectedUser.photo} className="chat-header-avatar" alt="Avatar" /> ) : ( <div className="chat-header-avatar-fallback">{selectedUser.name?.[0]}</div> )}
          <div className="chat-header-info">
            <span className="chat-header-name">{selectedUser.name}</span>
            <span className={`chat-header-status ${selectedUserProfile?.online ? "online" : "offline"}`}>
              {selectedUserProfile?.typing ? <span className="typing-pulse">Typing...</span> : (selectedUserProfile?.online ? "Online" : "Offline")}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-area">
        {messages.map((msg, index) => {
          const isMe = msg.senderEmail === user.email;
          return (
            <div key={msg.id || index} className={`message-wrapper ${isMe ? "message-wrapper--own" : "message-wrapper--other"}`}>
              <div className={`message-bubble ${isMe ? "message-bubble--own" : "message-bubble--other"}`}>
                <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px", fontWeight: "700" }}>{isMe ? "You" : msg.sender}</div>
                {msg.media && (
                  <div className={`media-grid media-grid--${Math.min(msg.media.length, 4)}`}>
                    {msg.media.map((item, i) => (
                      <div key={i} className="media-item" onClick={() => setSelectedMedia(item)}>
                        {item.type === "video" ? ( <video src={item.url} muted playsInline autoPlay loop /> ) : ( <img src={item.url} alt="Shared" /> )}
                      </div>
                    ))}
                  </div>
                )}
                {msg.text && (
                  <div className="message-text">
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Lightbox / Global Player */}
      {selectedMedia && (
        <div className="lightbox-overlay" onClick={() => setSelectedMedia(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            {selectedMedia.type === "video" ? ( <video src={selectedMedia.url} controls autoPlay className="full-video" /> ) : ( <img src={selectedMedia.url} alt="Fullscreen" /> )}
            <button className="lightbox-close" onClick={() => setSelectedMedia(null)}>✖</button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        {/* 📚 Stacking Multi-Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="media-preview-row">
            {mediaFiles.map((m, i) => (
              <div key={i} className="media-preview-item">
                {m.type === "video" ? <video src={m.preview} muted /> : <img src={m.preview} alt="preview" />}
                <button className="remove-media" onClick={() => removeMedia(i)}>✖</button>
              </div>
            ))}
          </div>
        )}


        <div className="input-container">
          
          <button className="attachment-btn" onClick={() => mediaInputRef.current.click()}>➕</button>
          <input type="file" hidden ref={mediaInputRef} onChange={handleMediaSelect} multiple accept="image/*,video/*" />
          
          <input ref={inputRef} className="message-input" value={message} onChange={handleTyping} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && sendMessage()} />
          
          <button className="send-btn" onClick={sendMessage} disabled={(!message.trim() && mediaFiles.length === 0) || isUploading}>
            {isUploading ? "..." : "🚀"}
          </button>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragging && <div className="drag-drop-overlay">🚀 DROP TO SEND MEDIA</div>}
    </div>
  );
}

export default ChatWindow;
