import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchClaimContactApi } from '../services/api';
import { ClaimChatModal } from './ClaimChatModal';
import type { Claim, ContactInfo } from '../types';

interface ClaimCoordinationCardProps {
  claim: Claim;
  isOwnerView?: boolean; // True if current user is the finder/reporter reviewing claims
  onStatusChange?: () => void;
  onOpenContactSettings?: () => void;
}

export const ClaimCoordinationCard: React.FC<ClaimCoordinationCardProps> = ({
  claim,
  isOwnerView = false,
  onStatusChange,
  onOpenContactSettings,
}) => {
  const { user, setContactConsent, completeReturn } = useApp();

  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClaimant = user.id === claim.claimantId;
  const isApproved = claim.status.toLowerCase() === 'approved';
  const isCompleted = claim.status.toLowerCase() === 'completed';

  const userHasConsent = isClaimant
    ? Boolean(claim.claimantContactShared)
    : Boolean(claim.ownerContactShared);

  const loadContactDetails = useCallback(async () => {
    if (!claim.id || (!isApproved && !isCompleted)) return;
    setIsLoadingContact(true);
    try {
      const data = await fetchClaimContactApi(claim.id);
      setContactInfo(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingContact(false);
    }
  }, [claim.id, isApproved, isCompleted]);

  useEffect(() => {
    loadContactDetails();
  }, [loadContactDetails, userHasConsent]);

  const handleToggleConsent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConsent = e.target.checked;
    setIsUpdatingConsent(true);
    setError(null);
    try {
      await setContactConsent(claim.id, newConsent);
      await loadContactDetails();
      if (onStatusChange) onStatusChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update contact consent.');
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmReturn = async () => {
    const remarks = window.prompt(
      'Optional: Add confirmation notes or handover meeting remarks for the claimant:',
      'Item handed over successfully on campus.'
    );
    if (remarks === null) return; // user cancelled prompt

    setIsCompleting(true);
    setError(null);
    try {
      await completeReturn(claim.id, { completionNotes: remarks });
      if (onStatusChange) onStatusChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete return confirmation.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (!isApproved && !isCompleted) {
    return null;
  }

  return (
    <>
      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-findit-surface border border-findit-primary/25 shadow-md space-y-4 animate-fadeIn">
        {/* Coordination Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-findit-border/80">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-findit-primary/15 text-findit-primary border border-findit-primary/25'
            }`}>
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isCompleted ? 'Item Returned Successfully' : 'Claim Verified & Approved'}
              </span>
              <span className="text-[11px] text-findit-subtle block">
                {isCompleted
                  ? 'Return confirmed. Coordination closed.'
                  : 'Return coordination is now unlocked for both participants.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* FindIt Internal Chat Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-findit-primary text-white hover:bg-findit-primary-light transition-all shadow-sm shadow-findit-primary/20"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open FindIt Chat</span>
            </button>

            {/* Handover completion button for Finder */}
            {isOwnerView && isApproved && (
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isCompleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isCompleting ? 'Updating...' : 'Confirm Handover'}</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contact Sharing & Mutual Consent Subsection */}
        <div className="rounded-xl bg-findit-card/60 border border-findit-border p-3.5 sm:p-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Direct Phone & WhatsApp Contact</span>
                {contactInfo?.mutualConsent ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Mutual Consent Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Consent Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-findit-subtle">
                Mutual consent is required before mobile numbers are shared.
              </p>
            </div>

            {/* Consent Toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer bg-findit-surface border border-findit-border hover:border-findit-border/80 px-3 py-1.5 rounded-xl transition-all">
              <input
                type="checkbox"
                checked={userHasConsent}
                onChange={handleToggleConsent}
                disabled={isUpdatingConsent}
                className="w-4 h-4 rounded border-findit-border bg-findit-card text-findit-primary focus:ring-findit-primary cursor-pointer accent-findit-primary"
              />
              <span className="text-xs text-white font-medium select-none">
                {userHasConsent ? 'I consented to share contact' : 'Share my contact details'}
              </span>
            </label>
          </div>

          {/* Contact Details Display */}
          {isLoadingContact ? (
            <div className="py-3 text-center text-xs text-findit-subtle">
              Verifying mutual consent permissions...
            </div>
          ) : contactInfo?.mutualConsent ? (
            <div className="pt-2 border-t border-findit-border/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-findit-subtle">
                  Contact details for <strong className="text-white">{contactInfo.otherPartyName}</strong>:
                </span>
                {contactInfo.preferredMethod && (
                  <span className="text-[11px] text-findit-subtle flex items-center gap-1">
                    <span>Preferred method:</span>
                    <strong className="text-findit-primary capitalize">
                      {contactInfo.preferredMethod.replace('_', ' ')}
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* WhatsApp Click-to-Chat Button */}
                {contactInfo.whatsappUrl ? (
                  <a
                    href={contactInfo.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contact on WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                ) : (
                  <span className="text-[11px] text-findit-subtle italic">
                    WhatsApp number not provided
                  </span>
                )}

                {/* Direct Phone Call Button */}
                {contactInfo.phoneNumber && (
                  <>
                    <a
                      href={`tel:${contactInfo.phoneNumber}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-findit-card text-white border border-findit-border hover:border-findit-primary hover:text-findit-primary-light transition-all shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5 text-findit-primary" />
                      <span>Call {contactInfo.phoneNumber}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyNumber(contactInfo.phoneNumber!)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-findit-card text-findit-subtle border border-findit-border hover:text-white transition-all"
                      title="Copy phone number"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-findit-border/60 flex items-start gap-2.5 text-xs text-findit-muted">
              <Lock className="w-4 h-4 text-findit-subtle shrink-0 mt-0.5" />
              <div>
                {!userHasConsent ? (
                  <p>
                    Check &quot;Share my contact details&quot; above to allow{' '}
                    <strong className="text-white">{contactInfo?.otherPartyName || 'the other party'}</strong> to connect with you via WhatsApp or phone call.
                  </p>
                ) : (
                  <p>
                    You have consented to share your contact info. Waiting for{' '}
                    <strong className="text-white">{contactInfo?.otherPartyName || 'the other party'}</strong> to consent before numbers are displayed. You can use <strong>FindIt Chat</strong> in the meantime!
                  </p>
                )}
                {onOpenContactSettings && !user.phoneNumber && (
                  <button
                    type="button"
                    onClick={onOpenContactSettings}
                    className="text-findit-primary hover:underline text-[11px] font-semibold mt-1 block"
                  >
                    + Add your mobile/WhatsApp number in Contact Settings
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Internal Messaging Modal */}
      <ClaimChatModal
        claim={claim}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
};
