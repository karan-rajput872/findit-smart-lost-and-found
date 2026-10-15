import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FilePlus,
  MapPin,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { FormInput } from '../components/common/FormInput';
import { UploadZone } from '../components/items/UploadZone';
import { useApp } from '../context/AppContext';
import { CATEGORIES, CAMPUSES } from '../data/mockData';
import type { ItemCategory, ItemType } from '../types';

export const ReportItemPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem, user } = useApp();

  // Query parameter support (e.g. /report?type=lost)
  const defaultType = (searchParams.get('type') as ItemType) || 'lost';

  const [type, setType] = useState<ItemType>(defaultType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [campus, setCampus] = useState(user.campus || CAMPUSES[0]);
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const qType = searchParams.get('type');
    if (qType === 'lost' || qType === 'found') {
      setType(qType);
    }
  }, [searchParams]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Item title is required.';
    if (!description.trim()) errs.description = 'Please provide a detailed description.';
    if (!location.trim()) errs.location = 'Specific location/building is required.';
    if (!date) errs.date = 'Date is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // Default fallback image if none uploaded
    const finalImage =
      imageUrl ||
      (type === 'lost'
        ? 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80');

    try {
      // Add item to backend / state
      const newId = await addItem({
        type,
        title,
        category,
        description,
        date,
        campus,
        location: `${campus}, ${location}`,
        imageUrl: finalImage,
        reporterName: `${user.fullName} (You)`,
        reporterContact: user.email,
      });

      navigate(`/dashboard/items/${newId}`);
    } catch (err: unknown) {
      console.error('Failed to report item:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setErrors((prev) => ({
        ...prev,
        form: msg,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={type === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}
        description="Submit a detailed report for a lost personal belonging or an item found on campus."
      />

      <div className="p-6 sm:p-8 rounded-2xl bg-findit-card border border-findit-border shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.form && (
            <div className="p-3.5 rounded-xl bg-findit-danger/10 border border-findit-danger/30 text-xs text-findit-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Report Type Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('lost')}
                className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  type === 'lost'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm'
                    : 'bg-findit-bg text-findit-muted border-findit-border hover:bg-findit-bg/80'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span>I Lost an Item</span>
              </button>

              <button
                type="button"
                onClick={() => setType('found')}
                className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  type === 'found'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                    : 'bg-findit-bg text-findit-muted border-findit-border hover:bg-findit-bg/80'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span>I Found an Item</span>
              </button>
            </div>
          </div>

          {/* Item Title */}
          <FormInput
            label="Item Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Navy Blue Hydro Flask with Stickers or Dell XPS 15 Charger"
            error={errors.title}
            required
          />

          {/* Category & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-4 py-2.5 rounded-xl bg-findit-card border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label="Incident Date"
              type="date"
              icon={Calendar}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={errors.date}
              required
            />
          </div>

          {/* Campus & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                Campus Location
              </label>
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-findit-card border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none"
              >
                {CAMPUSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label="Specific Spot / Room"
              icon={MapPin}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Science Library, 2nd Floor Study Room 204"
              error={errors.location}
              required
            />
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
              Description & Identifying Details
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide color, brand, condition, unique markings, or contents. (Note: For security, avoid disclosing private unlock codes or secret PINs)."
              className={`w-full px-4 py-3 rounded-xl bg-findit-card border text-sm text-findit-text placeholder-findit-subtle focus:ring-1 outline-none transition-all ${
                errors.description
                  ? 'border-findit-danger focus:border-findit-danger focus:ring-findit-danger'
                  : 'border-findit-border focus:border-findit-primary focus:ring-findit-primary'
              }`}
              required
            />
            {errors.description && (
              <p className="text-xs text-findit-danger flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Image Selection / Preview */}
          <UploadZone
            previewUrl={imageUrl}
            onImageSelected={setImageUrl}
            onClear={() => setImageUrl('')}
          />

          {/* Submit Action */}
          <div className="pt-4 border-t border-findit-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-findit-subtle">
              <HelpCircle className="w-4 h-4 text-findit-secondary shrink-0" />
              <span>Listing will be instantly visible in the campus demo directory.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FilePlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Publishing Report...' : 'Publish Item Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
