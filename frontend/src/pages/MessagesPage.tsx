import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  ExternalLink,
  Phone,
  ShieldCheck,
  Send,
  Lock,
  ArrowLeft,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  fetchActiveConversationsApi,
  fetchClaimMessagesApi,
  sendClaimMessageApi,
  fetchClaimContactApi,
} from '../services/api';
import type { ConversationSummary, Message, ContactInfo } from '../types';

export const MessagesPage: React.FC = () => {
  const { user } = useApp();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoadingConvs(true);
    try {
      const data = await fetchActiveConversationsApi();
      setConversations(data);
      if (isInitial && data.length > 0 && !selectedClaimId) {
        setSelectedClaimId(data[0].claimId);
      }
    } catch {
      // ignore
    } finally {
      if (isInitial) setIsLoadingConvs(false);
    }
  }, [selectedClaimId]);

  const loadConversationMessages = useCallback(async (claimId: string, isInitial = false) => {
    if (isInitial) setIsLoadingMsgs(true);
    try {
      const [msgs, contact] = await Promise.all([
        fetchClaimMessagesApi(claimId),
        fetchClaimContactApi(claimId).catch(() => null),
      ]);
      setMessages(msgs);
      setContactInfo(contact);

      if (isInitial) {
        setTimeout(scrollToBottom, 50);
      }
    } catch {
      // ignore
    } finally {
      if (isInitial) setIsLoadingMsgs(false);
    }
  }, [scrollToBottom]);

  // Initial load
  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  // Load selected claim conversation
  useEffect(() => {
    if (selectedClaimId) {
      loadConversationMessages(selectedClaimId, true);

      // Polling every 3.5s for selected conversation
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        loadConversationMessages(selectedClaimId, false);
      }, 3500);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedClaimId, loadConversationMessages]);

  const handleSelectConversation = (claimId: string) => {
    setSelectedClaimId(claimId);
    setShowMobileChat(true);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedClaimId || !inputText.trim() || isSending) return;

    const trimmed = inputText.trim();
    setIsSending(true);
    try {
      const newMsg = await sendClaimMessageApi(selectedClaimId, trimmed);
      setInputText('');
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
      loadConversations(false);
    } catch {
      // ignore
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

  const filteredConversations = conversations.filter(
    (c) =>
      c.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.otherPartyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find((c) => c.claimId === selectedClaimId);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-130px)] flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-findit-text tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-findit-primary" />
            <span>Messages & Return Coordination</span>
          </h1>
          <p className="text-xs text-findit-muted mt-0.5">
            Coordinate safe returns with verified item finders and owners.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 bg-white border border-findit-border rounded-2xl shadow-subtle overflow-hidden flex flex-col md:flex-row">
        {/* Left Pane: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-findit-border flex flex-col bg-white shrink-0 ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className="p-3.5 border-b border-findit-border bg-findit-bg">
            <div className="relative">
              <Search className="w-4 h-4 text-findit-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-findit-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-findit-text placeholder-findit-muted focus:border-findit-primary focus:outline-none focus:ring-1 focus:ring-findit-primary min-h-[40px]"
              />
            </div>
          </div>

          {/* List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-findit-border/60">
            {isLoadingConvs ? (
              <div className="p-8 text-center text-xs text-findit-muted flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-findit-primary" />
                <span>Loading active channels...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-findit-muted space-y-2">
                <Inbox className="w-8 h-8 text-findit-muted/50 mx-auto" />
                <p className="font-semibold text-findit-text">No active conversations</p>
                <p className="text-[11px] text-findit-muted">
                  Conversations unlock automatically when a claim is approved by the finder.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.claimId === selectedClaimId;
                return (
                  <button
                    key={conv.claimId}
                    type="button"
                    onClick={() => handleSelectConversation(conv.claimId)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-findit-primary/10 border-l-4 border-l-findit-primary'
                        : 'hover:bg-findit-bg'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-findit-bg border border-findit-border flex items-center justify-center text-findit-primary font-bold text-sm shrink-0">
                      {conv.otherPartyName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-findit-text truncate">
                          {conv.otherPartyName}
                        </span>
                        {conv.lastMessageTime && (
                          <span className="text-[10px] text-findit-muted shrink-0">
                            {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-semibold text-findit-primary truncate mb-1">
                        {conv.itemTitle}
                      </p>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-findit-muted truncate">
                          {conv.lastMessage || 'Channel opened. Send a message.'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-findit-primary text-white shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Room */}
        <div
          className={`flex-1 flex flex-col bg-[#FAF9F5] min-w-0 ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* Room Header */}
              <div className="p-3.5 px-4 sm:px-5 border-b border-findit-border bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowMobileChat(false)}
                    className="p-1.5 rounded-lg text-findit-muted hover:text-findit-text md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-findit-primary/15 border border-findit-primary/25 flex items-center justify-center text-findit-primary font-bold text-sm shrink-0">
                    {activeConv.otherPartyName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-findit-text truncate">
                        {activeConv.otherPartyName}
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFE6] text-[#3E6B4A] border border-[#CDE1CE]">
                        {activeConv.claimStatus}
                      </span>
                    </div>
                    <p className="text-xs text-findit-muted truncate">
                      Item: <span className="text-findit-text font-semibold">{activeConv.itemTitle}</span>
                    </p>
                  </div>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-2 shrink-0">
                  {contactInfo?.mutualConsent && contactInfo.whatsappUrl && (
                    <a
                      href={contactInfo.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-[#25D366]/15 text-[#1E7D43] border border-[#25D366]/30 hover:bg-[#25D366]/25 transition-all shadow-subtle"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  )}

                  {contactInfo?.mutualConsent && contactInfo.phoneNumber && (
                    <a
                      href={`tel:${contactInfo.phoneNumber}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-white text-findit-text border border-findit-border hover:border-findit-primary transition-all shadow-subtle"
                    >
                      <Phone className="w-3.5 h-3.5 text-findit-primary" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Status / Privacy Banner */}
              <div className="py-2 px-4 bg-findit-bg border-b border-findit-border flex items-center justify-between text-xs text-findit-muted shrink-0">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-findit-primary" />
                  <span>Internal FindIt Return Coordination</span>
                </span>
                {contactInfo?.mutualConsent ? (
                  <span className="text-[#3E6B4A] font-semibold text-[11px]">
                    Mutual Consent Active
                  </span>
                ) : (
                  <span className="text-findit-muted text-[11px] flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Mutual consent required for phone numbers
                  </span>
                )}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-0">
                {isLoadingMsgs ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-findit-muted">
                    <RefreshCw className="w-5 h-5 animate-spin text-findit-primary" />
                    <span className="text-xs">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-findit-border shadow-subtle flex items-center justify-center text-findit-primary mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-findit-text mb-1">
                      No messages yet
                    </h3>
                    <p className="text-xs text-findit-muted mb-4 leading-relaxed">
                      Say hello to {activeConv.otherPartyName} and decide where to safely meet on campus.
                    </p>
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
                          <span className="text-[11px] font-semibold text-findit-text">
                            {isMine ? 'You' : msg.senderName}
                          </span>
                          <span className="text-[10px] text-findit-muted">
                            {timeFormatted}
                          </span>
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-subtle ${
                            isMine
                              ? 'bg-findit-primary text-white rounded-tr-xs'
                              : 'bg-white border border-findit-border text-findit-text rounded-tl-xs'
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

              {/* Message Input Bar */}
              <div className="p-3 sm:p-4 border-t border-findit-border bg-white shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="flex-1 max-h-28 min-h-[44px] bg-white border border-findit-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-findit-text placeholder-findit-muted focus:border-findit-primary focus:outline-none focus:ring-1 focus:ring-findit-primary resize-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="h-[44px] px-5 rounded-xl font-bold text-xs text-white bg-findit-primary hover:bg-findit-primary-hover disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-subtle shrink-0"
                    aria-label="Send message"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-findit-muted space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white border border-findit-border shadow-subtle flex items-center justify-center text-findit-primary">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-findit-text">Select a conversation</h3>
              <p className="text-xs text-findit-muted max-w-sm">
                Choose a claim channel from the left panel to coordinate handover details and safe meeting times.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
