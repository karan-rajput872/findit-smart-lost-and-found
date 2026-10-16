import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Phone,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  fetchClaimMessagesApi,
  sendClaimMessageApi,
  fetchClaimContactApi,
} from '../services/api';
import type { Message, ContactInfo, Claim } from '../types';

interface ClaimChatModalProps {
  claim: Claim;
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimChatModal: React.FC<ClaimChatModalProps> = ({
  claim,
  isOpen,
  onClose,
}) => {
  const { user } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isClaimant = user.id === claim.claimantId;
  const otherPartyName = isClaimant
    ? claim.itemOwnerName || 'Item Reporter'
    : claim.claimantName || 'Claimant';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!claim.id) return;
    try {
      if (isInitial) setIsLoading(true);
      const data = await fetchClaimMessagesApi(claim.id);
      setMessages(data);
      if (isInitial) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (err: unknown) {
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation.');
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [claim.id, scrollToBottom]);

  const loadContact = useCallback(async () => {
    if (!claim.id) return;
    try {
      const contact = await fetchClaimContactApi(claim.id);
      setContactInfo(contact);
    } catch {
      // ignore
    }
  }, [claim.id]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      loadMessages(true);
      loadContact();

      // Setup continuous polling every 3.5s for real-time smoothness
      pollTimerRef.current = setInterval(() => {
        loadMessages(false);
      }, 3500);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [isOpen, loadMessages, loadContact]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const newMsg = await sendClaimMessageApi(claim.id, trimmed);
      setInputText('');
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl h-[88vh] max-h-[720px] rounded-2xl shadow-2xl border border-[#2E384D] flex flex-col overflow-hidden my-auto"
        style={{ backgroundColor: '#131824' }}
      >
        {/* Chat Header */}
        <div
          className="flex items-center justify-between p-4 px-5 border-b border-[#242C3F] shrink-0"
          style={{ backgroundColor: '#181F2F' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-findit-primary/10 border border-findit-primary/20 flex items-center justify-center text-findit-primary font-bold text-sm">
              {otherPartyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="chat-modal-title" className="text-sm font-bold text-white">
                  {otherPartyName}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-findit-card border border-findit-border text-findit-subtle">
                  {isClaimant ? 'Item Finder' : 'Claimant'}
                </span>
              </div>
              <p className="text-xs text-findit-subtle line-clamp-1">
                Item: <span className="text-white font-medium">{claim.itemTitle || 'Lost & Found Listing'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick WhatsApp / Call actions if mutual consent granted */}
            {contactInfo?.mutualConsent && contactInfo.whatsappUrl && (
              <a
                href={contactInfo.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                title="Open WhatsApp chat"
              >
                <span>WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {contactInfo?.mutualConsent && contactInfo.phoneNumber && (
              <a
                href={`tel:${contactInfo.phoneNumber}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-findit-card text-findit-text border border-findit-border hover:text-white hover:border-findit-primary transition-colors"
                title="Call phone number"
              >
                <Phone className="w-3 h-3" />
                <span>Call</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-findit-subtle hover:text-white hover:bg-findit-card transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Mutual Consent Notice Bar */}
        <div className="py-1.5 px-4 bg-findit-card/40 border-b border-findit-border/60 flex items-center justify-between text-[11px] text-findit-subtle shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-findit-primary shrink-0" />
            <span>Verified FindIt Communication</span>
          </div>
          {contactInfo?.mutualConsent ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              Mutual Contact Consent Active
            </span>
          ) : (
            <span className="text-findit-subtle flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Phone details private until mutual consent
            </span>
          )}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-0 bg-findit-bg/40">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-findit-subtle">
              <RefreshCw className="w-5 h-5 animate-spin text-findit-primary" />
              <span className="text-xs">Connecting secure channel...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-findit-card border border-findit-border flex items-center justify-center text-findit-primary mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Start the return coordination
              </h3>
              <p className="text-xs text-findit-muted mb-4 leading-relaxed">
                Send a message to discuss when and where on campus to safely hand over the item.
              </p>
              <div className="text-[11px] text-findit-subtle bg-findit-card/80 p-3 rounded-xl border border-findit-border text-left w-full space-y-1">
                <span className="font-semibold text-white block">Suggested prompt:</span>
                <p className="text-findit-muted italic">
                  &quot;Hello! Thank you for verifying the item. Let&apos;s coordinate a safe pickup at the campus library or student center.&quot;
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user.id;
              const timeFormatted = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-fadeIn`}
                >
                  <div className="flex items-baseline gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-findit-subtle">
                      {isMine ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-findit-subtle/70">
                      {timeFormatted}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-sm ${
                      isMine
                        ? 'bg-findit-primary text-white rounded-tr-xs'
                        : 'bg-findit-card border border-findit-border text-findit-text rounded-tl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-findit-border bg-findit-card/80 shrink-0">
          {error && (
            <p className="text-xs text-red-400 mb-2 px-1">{error}</p>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 max-h-28 min-h-[42px] border border-[#2E384D] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none transition-all"
              style={{ backgroundColor: '#0B0E17' }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="h-[42px] px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 shrink-0"
              aria-label="Send message"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
