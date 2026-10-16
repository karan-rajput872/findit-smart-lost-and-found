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
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { ItemImage } from '../components/common/ItemImage';
import { useApp } from '../context/AppContext';

export const LandingPage: React.FC = () => {
  const { items } = useApp();
  const previewItems = items.slice(0, 3);

  return (
    <div className="flex flex-col gap-24 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-findit-primary/20 via-findit-secondary/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="text-center max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-findit-card border border-findit-border/80 text-xs font-semibold text-findit-secondary shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-findit-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-findit-secondary"></span>
            </span>
            Next-Gen Campus Lost & Found
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Lost Something? <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-findit-primary via-[#A89AFF] to-findit-secondary">
              Let's Find It.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-findit-muted max-w-2xl mx-auto leading-relaxed">
            The intelligent, campus-first lost and found platform. Report missing belongings in seconds,
            discover community listings, and securely reconnect with what matters.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/dashboard/report"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all duration-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report an Item</span>
            </Link>
            <Link
              to="/dashboard/browse"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-findit-text bg-findit-card hover:bg-findit-card-hover border border-findit-border transition-all"
            >
              <span>Explore Items</span>
              <ArrowRight className="w-4 h-4 text-findit-muted" />
            </Link>
          </div>

          <p className="text-xs text-findit-subtle pt-1">
            Free for all university students, faculty, and campus staff.
          </p>
        </div>

        {/* Hero Visual Mockup Preview */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          <div className="rounded-3xl bg-findit-card/80 border border-findit-border p-3 sm:p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-findit-border/60 px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <span className="text-xs text-findit-subtle ml-2 font-mono">findit.campus.network/live-feed</span>
              </div>
              <div className="text-[11px] font-semibold text-findit-secondary bg-findit-secondary/10 px-2.5 py-1 rounded-full border border-findit-secondary/20">
                Demo Feed Preview
              </div>
            </div>

            {/* Preview Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {previewItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-findit-bg/80 border border-findit-border p-3.5 text-left space-y-2.5"
                >
                  <div className="aspect-[16/10] rounded-xl overflow-hidden relative">
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
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <p className="text-[11px] text-findit-muted line-clamp-1 mt-0.5">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-findit-subtle pt-1 border-t border-findit-border/40">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-findit-secondary" />
                      {item.location.split(',')[0]}
                    </span>
                    <span className="text-findit-primary font-medium">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-xs uppercase tracking-widest font-extrabold text-findit-primary">
            Streamlined Recovery Workflow
          </h2>
          <h3 className="text-3xl font-bold text-white">How FindIt Works</h3>
          <p className="text-sm text-findit-muted">
            Four simple steps turn distressing campus losses into swift, verified reunions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Report in Seconds',
              desc: 'Submit photos, category, and location details for any misplaced or turned-in item.',
              icon: PlusCircle,
              color: 'text-findit-primary',
            },
            {
              step: '02',
              title: 'Smart Categorization',
              desc: 'Structured metadata makes discovery effortless across all campuses and departments.',
              icon: Sparkles,
              color: 'text-findit-secondary',
            },
            {
              step: '03',
              title: 'Protected Ownership Claim',
              desc: 'Claimants provide private identifying proof without publicly exposing unique markers.',
              icon: ShieldCheck,
              color: 'text-findit-primary',
            },
            {
              step: '04',
              title: 'Secure Campus Return',
              desc: 'Verify authorization and safely collect your item from designated campus desk locations.',
              icon: CheckCircle,
              color: 'text-emerald-400',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-2xl bg-findit-card border border-findit-border relative card-hover space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-findit-border/80 font-mono">
                  {item.step}
                </span>
                <div className={`p-2.5 rounded-xl bg-findit-bg border border-findit-border/80 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
              <h4 className="text-base font-bold text-white pt-2">{item.title}</h4>
              <p className="text-xs text-findit-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-findit-card to-findit-sidebar border border-findit-border">
          <div className="max-w-2xl mb-10 space-y-2">
            <h2 className="text-xs uppercase tracking-widest font-extrabold text-findit-secondary">
              Campus Intelligence
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Designed for Campus Scale & Privacy
            </h3>
            <p className="text-sm text-findit-muted">
              Built from the ground up to replace outdated paper logs, cluttered bulletin boards, and unstructured chat channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-findit-bg/80 border border-findit-border/80 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-findit-card w-fit text-findit-primary border border-findit-border">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Multi-Campus Geofencing</h4>
              <p className="text-xs text-findit-muted leading-relaxed">
                Filter and locate items by specific campus libraries, dining halls, recreation centers, or lab buildings.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-findit-bg/80 border border-findit-border/80 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-findit-card w-fit text-findit-secondary border border-findit-border">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Private Verification Shield</h4>
              <p className="text-xs text-findit-muted leading-relaxed">
                Serial numbers, wallpapers, and confidential identifying traits remain hidden until verified by staff.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-findit-bg/80 border border-findit-border/80 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-findit-card w-fit text-findit-primary w-fit border border-findit-border">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">AI Semantic Match Ready</h4>
              <p className="text-xs text-findit-muted leading-relaxed">
                Architected for sentence-transformer vector embeddings to connect lost and found listings automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Statistics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-8 space-y-1">
          <h3 className="text-lg font-bold text-white">Platform Activity Overview</h3>
          <p className="text-xs text-findit-subtle">
            (Campus-Wide Recovery & Activity Metrics)
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Campus Recoveries"
            value="1,420+"
            subtitle="Demo verified returns"
            icon={CheckCircle}
            iconColor="text-emerald-400"
          />
          <StatCard
            title="Avg Discovery Time"
            value="18 min"
            subtitle="From report to match"
            icon={Clock}
            iconColor="text-findit-primary"
          />
          <StatCard
            title="Participating Campuses"
            value="5 Sites"
            subtitle="University network"
            icon={MapPin}
            iconColor="text-findit-secondary"
          />
          <StatCard
            title="Active Student Community"
            value="12.8k"
            subtitle="Registered campus users"
            icon={Users}
            iconColor="text-blue-400"
          />
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <div className="p-10 rounded-3xl bg-gradient-to-r from-findit-primary/20 via-findit-card to-findit-secondary/20 border border-findit-border relative overflow-hidden space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Lost an item on campus today?
          </h2>
          <p className="text-sm text-findit-muted max-w-lg mx-auto leading-relaxed">
            Don't wait. Browse current lost and found submissions or submit your item report in under two minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/dashboard/report"
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all"
            >
              Submit Report Now
            </Link>
            <Link
              to="/dashboard/browse"
              className="px-6 py-3 rounded-xl text-sm font-bold text-findit-text bg-findit-bg hover:bg-findit-card border border-findit-border transition-colors"
            >
              Browse Directory
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
