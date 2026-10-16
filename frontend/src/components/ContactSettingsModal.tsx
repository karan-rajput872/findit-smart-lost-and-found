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
        className="relative w-full max-w-lg my-auto rounded-2xl shadow-2xl border border-[#2E384D] flex flex-col max-h-[92vh] overflow-hidden"
        style={{ backgroundColor: '#131824' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b border-[#242C3F] shrink-0"
          style={{ backgroundColor: '#181F2F' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="contact-modal-title" className="text-base font-bold text-white leading-snug">
                Contact & Coordination Settings
              </h2>
              <p className="text-xs text-slate-400">
                Safe item-return communication preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Privacy Guarantee Banner */}
          <div
            className="p-3.5 rounded-xl border border-indigo-500/25 flex items-start gap-3"
            style={{ backgroundColor: 'rgba(139, 124, 255, 0.08)' }}
          >
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-white block">Strict Campus Privacy</span>
              <p className="text-slate-300 leading-relaxed">
                Your phone numbers are <strong className="text-white font-semibold">never public</strong> on item cards or search. Numbers are only revealed after claim approval and <strong className="text-white font-semibold">explicit mutual consent</strong>.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Mobile Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+91 9876543210 or 10-digit number"
                className="w-full border border-[#2E384D] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all"
                style={{ backgroundColor: '#0B0E17' }}
              />
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-500" />
              Include country code (e.g. +91 for India, +1 for US/Canada)
            </p>
          </div>

          {/* Same as phone toggle */}
          <div
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#2E384D]"
            style={{ backgroundColor: '#181F2F' }}
          >
            <label htmlFor="same-phone-toggle" className="text-xs text-white font-medium cursor-pointer select-none">
              WhatsApp number is the same as mobile number
            </label>
            <input
              id="same-phone-toggle"
              type="checkbox"
              checked={whatsappSameAsPhone}
              onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-400 cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Dedicated WhatsApp Number (if different) */}
          {!whatsappSameAsPhone && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                WhatsApp Phone Number
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full border border-[#2E384D] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all"
                  style={{ backgroundColor: '#0B0E17' }}
                />
              </div>
            </div>
          )}

          {/* Preferred Return Coordination Method */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Preferred Return Coordination Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'findit_chat', label: 'FindIt Chat', desc: 'Secure in-app' },
                { id: 'whatsapp', label: 'WhatsApp', desc: 'Quick messaging' },
                { id: 'phone_call', label: 'Phone Call', desc: 'Direct voice' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferredMethod(opt.id as any)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    preferredMethod === opt.id
                      ? 'border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400/50'
                      : 'border-[#2E384D] text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                  style={{
                    backgroundColor:
                      preferredMethod === opt.id
                        ? 'rgba(139, 124, 255, 0.18)'
                        : '#181F2F',
                  }}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="flex items-center justify-between pt-4 mt-2 border-t border-[#242C3F]"
          >
            {user.phoneNumber || user.whatsappNumber ? (
              <button
                type="button"
                onClick={handleClearDetails}
                disabled={isSubmitting}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Clear numbers
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
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
