import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  MapPin,
  ArrowRight,
  PlusCircle,
  Clock,
  CheckCircle,
  Users,
  Search,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { ItemImage } from '../components/common/ItemImage';
import { useApp } from '../context/AppContext';

export const LandingPage: React.FC = () => {
  const { items } = useApp();
  const previewItems = items.slice(0, 3);

  return (
    <div className="flex flex-col gap-16 sm:gap-24 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="pt-8 sm:pt-16 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-findit-border text-xs font-semibold text-findit-primary shadow-subtle">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-findit-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-findit-primary"></span>
            </span>
            Campus Lost & Found Platform
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-findit-text leading-[1.15]">
            Lost something? <br className="hidden sm:inline" />
            <span className="text-findit-primary">Let's help you find it.</span>
          </h1>

          <p className="text-base sm:text-lg text-findit-muted max-w-2xl mx-auto leading-relaxed">
            Report lost belongings, discover found items, and reconnect with what matters.
            Simple, safe, and built for everyone on campus.
          </p>

          {/* User-friendly Primary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 max-w-lg mx-auto">
            <Link
              to="/dashboard/report?type=lost"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all min-h-[46px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>I Lost Something</span>
            </Link>

            <Link
              to="/dashboard/report?type=found"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-findit-text bg-white hover:bg-findit-secondary_bg border border-findit-border shadow-subtle transition-all min-h-[46px]"
            >
              <PlusCircle className="w-4 h-4 text-findit-primary" />
              <span>I Found Something</span>
            </Link>

            <Link
              to="/dashboard/browse"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-findit-muted hover:text-findit-text transition-colors min-h-[46px]"
            >
              <Search className="w-4 h-4 text-findit-primary" />
              <span>Browse Items</span>
            </Link>
          </div>

          <p className="text-xs text-findit-subtle pt-1">
            Free and secure for students, faculty, and campus staff.
          </p>
        </div>

        {/* Hero Visual Live Preview */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <div className="rounded-3xl bg-white border border-findit-border p-4 sm:p-6 shadow-card text-left">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-findit-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5EFE6] border border-[#CEE0D0]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-findit-text">
                  Recently Reported on Campus
                </h3>
              </div>
              <Link
                to="/dashboard/browse"
                className="text-xs font-semibold text-findit-primary hover:underline inline-flex items-center gap-1"
              >
                <span>View all items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Preview Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {previewItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/dashboard/items/${item.id}`}
                  className="rounded-2xl bg-findit-bg border border-findit-border p-3 hover:bg-findit-secondary_bg transition-colors space-y-2.5 block"
                >
                  <div className="aspect-[16/10] rounded-xl overflow-hidden relative bg-white">
                    <ItemImage
                      src={item.imageUrl}
                      alt={item.title}
                      category={item.category}
                      itemType={item.type}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <StatusBadge type={item.type} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-findit-text truncate">{item.title}</h4>
                    <p className="text-[11px] text-findit-muted line-clamp-1 mt-0.5">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-findit-subtle pt-1.5 border-t border-findit-border/60">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-findit-primary shrink-0" />
                      <span className="truncate">{item.location.split(',')[0]}</span>
                    </span>
                    <span className="text-findit-primary font-semibold text-[10px] shrink-0">View Details</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2">
          <h2 className="text-xs uppercase tracking-widest font-extrabold text-findit-primary">
            Simple 4-Step Process
          </h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-findit-text">How FindIt Works</h3>
          <p className="text-sm text-findit-muted">
            Designed so anyone can easily report, locate, and claim their belongings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              step: '01',
              title: 'Report in Seconds',
              desc: 'Upload a photo and add simple details about what was lost or found.',
              icon: PlusCircle,
            },
            {
              step: '02',
              title: 'Smart Matching',
              desc: 'Our system automatically connects similar lost and found reports.',
              icon: Sparkles,
            },
            {
              step: '03',
              title: "Prove It's Yours",
              desc: 'Answer a simple clue or describe a unique detail only the real owner knows.',
              icon: ShieldCheck,
            },
            {
              step: '04',
              title: 'Safe Return',
              desc: 'Meet safely at a designated campus desk to collect your item.',
              icon: CheckCircle,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-findit-border card-hover space-y-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-findit-border font-mono">
                  {item.step}
                </span>
                <div className="p-2.5 rounded-xl bg-findit-bg border border-findit-border text-findit-primary">
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
              <h4 className="text-base font-bold text-findit-text pt-1">{item.title}</h4>
              <p className="text-xs text-findit-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="p-6 sm:p-10 md:p-12 rounded-3xl bg-findit-secondary_bg/60 border border-findit-border">
          <div className="max-w-2xl mb-8 space-y-2">
            <h2 className="text-xs uppercase tracking-widest font-extrabold text-findit-primary">
              Campus First
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-findit-text">
              Built for Campus Community & Privacy
            </h3>
            <p className="text-sm text-findit-muted">
              Replacing cluttered message boards and paper logs with a reliable, private campus tool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-white border border-findit-border space-y-2.5 shadow-subtle">
              <div className="p-2.5 rounded-xl bg-findit-bg w-fit text-findit-primary border border-findit-border">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-findit-text">Campus Locations</h4>
              <p className="text-xs text-findit-muted leading-relaxed">
                Filter and locate items by campus libraries, dining halls, student centers, or lecture halls.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-findit-border space-y-2.5 shadow-subtle">
              <div className="p-2.5 rounded-xl bg-findit-bg w-fit text-findit-primary border border-findit-border">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-findit-text">Privacy Protected</h4>
              <p className="text-xs text-findit-muted leading-relaxed">
                Private ownership clues and contact numbers are protected until you approve a return.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-findit-border space-y-2.5 shadow-subtle">
              <div className="p-2.5 rounded-xl bg-findit-bg w-fit text-findit-primary border border-findit-border">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-findit-text">Smart Suggestions</h4>
              <p className="text-xs text-findit-muted leading-relaxed">
                Instant suggestions connect matching lost and found reports so items are returned faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Activity Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-8 space-y-1">
          <h3 className="text-lg font-bold text-findit-text">Platform Activity</h3>
          <p className="text-xs text-findit-muted">
            Campus-wide item recovery and community metrics
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Items Returned"
            value="1,420+"
            subtitle="Verified campus returns"
            icon={CheckCircle}
            iconColor="text-findit-primary"
          />
          <StatCard
            title="Average Reunion Time"
            value="18 min"
            subtitle="From report to match"
            icon={Clock}
            iconColor="text-findit-primary"
          />
          <StatCard
            title="Campus Locations"
            value="5 Sites"
            subtitle="Central & North sites"
            icon={MapPin}
            iconColor="text-findit-primary"
          />
          <StatCard
            title="Active Community"
            value="12.8k"
            subtitle="Students & faculty"
            icon={Users}
            iconColor="text-findit-primary"
          />
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-findit-border shadow-card space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-findit-text">
            Lost or found an item today?
          </h2>
          <p className="text-sm text-findit-muted max-w-lg mx-auto leading-relaxed">
            Don't worry. Browse currently listed items or submit your report in under two minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/dashboard/report"
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-subtle transition-all min-h-[44px] flex items-center justify-center"
            >
              Report an Item
            </Link>
            <Link
              to="/dashboard/browse"
              className="px-6 py-3 rounded-xl text-sm font-bold text-findit-text bg-findit-bg hover:bg-findit-secondary_bg border border-findit-border transition-colors min-h-[44px] flex items-center justify-center"
            >
              Browse Items
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
