import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  Check,
  AlertCircle,
  Smartphone,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ContactSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactSettingsModal: React.FC<ContactSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateContactProfile } = useApp();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [preferredMethod, setPreferredMethod] = useState<'findit_chat' | 'whatsapp' | 'phone_call'>('findit_chat');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync state when modal opens or user updates
  useEffect(() => {
    if (isOpen && user) {
      setPhoneNumber(user.phoneNumber || '');
      setWhatsappNumber(user.whatsappNumber || '');
      setWhatsappSameAsPhone(user.whatsappSameAsPhone !== false);
      setPreferredMethod(
        user.preferredContactMethod === 'whatsapp' || user.preferredContactMethod === 'phone_call'
          ? user.preferredContactMethod
          : 'findit_chat'
      );
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    if (whatsappSameAsPhone) {
      setWhatsappNumber(val);
    }
  };

  const handleSameAsPhoneToggle = (checked: boolean) => {
    setWhatsappSameAsPhone(checked);
    if (checked) {
      setWhatsappNumber(phoneNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await updateContactProfile({
        phoneNumber: phoneNumber.trim() || undefined,
        whatsappNumber: (whatsappSameAsPhone ? phoneNumber : whatsappNumber).trim() || undefined,
        whatsappSameAsPhone,
        preferredContactMethod: preferredMethod,
      });
      setSuccess('Contact preferences saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update contact preferences.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDetails = async () => {
    if (!window.confirm('Are you sure you want to remove your stored phone and WhatsApp numbers?')) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await updateContactProfile({
        phoneNumber: '',
        whatsappNumber: '',
        whatsappSameAsPhone: true,
        preferredContactMethod: 'findit_chat',
      });
      setPhoneNumber('');
      setWhatsappNumber('');
      setWhatsappSameAsPhone(true);
      setPreferredMethod('findit_chat');
      setSuccess('Contact details removed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error clearing details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg my-auto rounded-2xl shadow-2xl border border-findit-border bg-white flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-findit-border bg-findit-bg shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-findit-primary/15 border border-findit-primary/25 flex items-center justify-center text-findit-primary">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="contact-modal-title" className="text-base font-bold text-findit-text leading-snug">
                Contact & Coordination Settings
              </h2>
              <p className="text-xs text-findit-muted">
                Safe item-return communication preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-findit-muted hover:text-findit-text hover:bg-findit-card transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Privacy Guarantee Banner */}
          <div className="p-4 rounded-xl border border-[#CDE1CE] bg-[#E5EFE6] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-findit-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-findit-text block">Strict Campus Privacy</span>
              <p className="text-findit-muted leading-relaxed">
                Your phone numbers are <strong className="text-findit-text font-semibold">never public</strong> on item cards or search. Numbers are only revealed after claim approval and <strong className="text-findit-text font-semibold">explicit mutual consent</strong>.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#F6E5E2] border border-[#ECD1CC] flex items-center gap-2 text-xs text-[#A84A42]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-[#E5EFE6] border border-[#CDE1CE] flex items-center gap-2 text-xs text-[#3E6B4A]">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-findit-text uppercase tracking-wider">
              Mobile Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-findit-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+91 9876543210 or 10-digit number"
                className="w-full border border-findit-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-findit-text placeholder-findit-muted focus:border-findit-primary focus:outline-none focus:ring-1 focus:ring-findit-primary bg-white transition-all min-h-[44px]"
              />
            </div>
            <p className="text-[11px] text-findit-muted flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-findit-muted" />
              Include country code (e.g. +91 for India, +1 for US/Canada)
            </p>
          </div>

          {/* Same as phone toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-findit-border bg-findit-bg">
            <label htmlFor="same-phone-toggle" className="text-xs text-findit-text font-medium cursor-pointer select-none">
              WhatsApp number is the same as mobile number
            </label>
            <input
              id="same-phone-toggle"
              type="checkbox"
              checked={whatsappSameAsPhone}
              onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
              className="w-5 h-5 rounded border-findit-border text-findit-primary focus:ring-findit-primary cursor-pointer accent-findit-primary"
            />
          </div>

          {/* Dedicated WhatsApp Number (if different) */}
          {!whatsappSameAsPhone && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-semibold text-findit-text uppercase tracking-wider">
                WhatsApp Phone Number
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full border border-findit-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-findit-text placeholder-findit-muted focus:border-findit-primary focus:outline-none focus:ring-1 focus:ring-findit-primary bg-white transition-all min-h-[44px]"
                />
              </div>
            </div>
          )}

          {/* Preferred Return Coordination Method */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-findit-text uppercase tracking-wider">
              Preferred Return Coordination Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'findit_chat', label: 'FindIt Chat', desc: 'Secure in-app' },
                { id: 'whatsapp', label: 'WhatsApp', desc: 'Quick messaging' },
                { id: 'phone_call', label: 'Phone Call', desc: 'Direct voice' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferredMethod(opt.id as any)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[56px] ${
                    preferredMethod === opt.id
                      ? 'border-findit-primary text-findit-text bg-findit-primary/15 ring-1 ring-findit-primary'
                      : 'border-findit-border text-findit-muted hover:border-findit-primary/50 hover:text-findit-text bg-white'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-findit-muted block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-findit-border">
            {user.phoneNumber || user.whatsappNumber ? (
              <button
                type="button"
                onClick={handleClearDetails}
                disabled={isSubmitting}
                className="text-xs text-[#C25E54] hover:text-[#A84A42] font-semibold transition-colors min-h-[44px] px-2 flex items-center"
              >
                Clear numbers
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-findit-muted hover:text-findit-text hover:bg-findit-bg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover transition-all shadow-subtle disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
