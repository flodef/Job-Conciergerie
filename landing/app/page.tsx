'use client';

import Logo from '@/app/components/Logo';
import {
  IconBell,
  IconBolt,
  IconCalendar,
  IconCamera,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconClock,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconHome,
  IconMail,
  IconMapPin,
  IconMenu2,
  IconMessageCircle,
  IconMoon,
  IconPhone,
  IconRefresh,
  IconRocket,
  IconSend,
  IconShieldCheck,
  IconSparkles,
  IconStar,
  IconStarHalf,
  IconSun,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/* ───────────────────────────── Theme ───────────────────────────── */
type ThemeMode = 'dark' | 'light' | 'system';

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    setMode(stored || 'system');
    setReady(true);
  }, []);

  useEffect(() => {
    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const apply = () => setResolved(mq.matches ? 'light' : 'dark');
      apply();
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    } else {
      setResolved(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (resolved === 'light') root.classList.add('light');
    else root.classList.remove('light');
    if (mode === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', mode);
  }, [resolved, mode, ready]);

  const set = (m: ThemeMode) => setMode(m);
  return { mode, resolved, set };
}

/* ───────────────────────────── Theme Toggle ───────────────────────────── */
function ThemeToggle({ mode, set, size = 'sm' }: { mode: ThemeMode; set: (m: ThemeMode) => void; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 16 : 18;
  const padding = size === 'sm' ? 'p-1' : 'p-1.5';
  const options: { value: ThemeMode; icon: typeof IconSun; label: string }[] = [
    { value: 'light', icon: IconSun, label: 'Clair' },
    { value: 'dark', icon: IconMoon, label: 'Sombre' },
  ];
  return (
    <div
      className={`inline-grid grid-cols-3 gap-0.5 rounded-full ${padding} text-slate-400 shrink-0`}
      style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
    >
      <button
        type="button"
        onClick={() => set('system')}
        title="Système"
        aria-label="Système"
        aria-checked={mode === 'system'}
        role="radio"
        style={{ cursor: 'pointer' }}
        className={`rounded-full flex items-center justify-center transition-all ${size === 'sm' ? 'p-1.5' : 'p-2'} ${mode === 'system' ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white shadow-sm' : 'hover:text-white'}`}
      >
        <IconDeviceDesktop size={iconSize} className="hidden md:block" />
        <IconDeviceTablet size={iconSize} className="hidden sm:block md:hidden" />
        <IconDeviceMobile size={iconSize} className="sm:hidden" />
      </button>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => set(opt.value)}
          title={opt.label}
          aria-label={opt.label}
          aria-checked={mode === opt.value}
          role="radio"
          style={{ cursor: 'pointer' }}
          className={`rounded-full flex items-center justify-center transition-all ${size === 'sm' ? 'p-1.5' : 'p-2'} ${mode === opt.value ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white shadow-sm' : 'hover:text-white'}`}
        >
          <opt.icon size={iconSize} />
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────── Navbar ───────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, resolved, set } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('nav')) setMenuOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [menuOpen]);

  const links = [
    { href: '#fonctionnalites', label: 'Fonctionnalités' },
    { href: '#comment-ca-marche', label: 'Comment ça marche' },
    { href: '#temoignages', label: 'Témoignages' },
    { href: '#tarifs', label: 'Tarifs' },
    { href: '#contact', label: 'Contact', subject: 'demande-renseignement' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-xl font-bold">
          <Logo size={32} />
          <span className="gradient-text">Job Conciergerie</span>
        </a>
        <div className="hidden lg:flex items-center gap-5">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() =>
                l.subject && window.dispatchEvent(new CustomEvent('contactSubject', { detail: l.subject }))
              }
              className="text-sm text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => window.dispatchEvent(new CustomEvent('contactSubject', { detail: 'demo' }))}
            className="px-4 py-2 rounded-full bg-linear-to-r from-brand-500 to-accent-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Demander une démo
          </a>
          <ThemeToggle mode={mode} set={set} size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden text-slate-300 relative z-50"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ cursor: 'pointer' }}
          >
            {menuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div
          className="lg:hidden mt-3 mx-4 rounded-2xl p-6 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--nav-bg)', border: '1px solid var(--glass-border)' }}
        >
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => {
                setMenuOpen(false);
                l.subject && window.dispatchEvent(new CustomEvent('contactSubject', { detail: l.subject }));
              }}
              className="text-slate-300 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="flex items-center justify-between gap-4 pt-2">
            <a
              href="#contact"
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new CustomEvent('contactSubject', { detail: 'demo' }));
              }}
              className="px-5 py-2 rounded-full bg-linear-to-r from-brand-500 to-accent-500 text-white text-sm font-semibold text-center flex-1"
            >
              Demander une démo
            </a>
            <ThemeToggle mode={mode} set={set} size="md" />
          </div>
        </div>
      )}
    </nav>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden">
      <div className="hero-glow w-150 h-150 bg-brand-600/20 -top-25 -left-25 animate-glow" />
      <div
        className="hero-glow w-125 h-125 bg-accent-500/15 -bottom-12.5 -right-12.5 animate-glow"
        style={{ animationDelay: '1.5s' }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-float">
          <IconSparkles size={16} className="text-accent-400" />
          <span className="text-sm text-slate-300">La gestion de mission réinventée pour les conciergeries</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
          Gérez vos missions
          <br />
          <span className="gradient-text">en toute simplicité</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          La plateforme qui connecte conciergeries et prestataires de confiance. Attribution automatique, suivi en temps
          réel, comptes rendus photo — tout réuni dans une application élégante et intuitive.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="#contact"
            onClick={() => window.dispatchEvent(new CustomEvent('contactSubject', { detail: 'demo' }))}
            className="px-8 py-4 rounded-full bg-linear-to-r from-brand-500 to-accent-500 text-white font-semibold text-lg hover:scale-105 transition-transform shadow-lg shadow-brand-500/25"
          >
            Demander une démo gratuite
          </a>
          <a
            href="#fonctionnalites"
            className="px-8 py-4 rounded-full glass glass-hover text-white font-semibold text-lg"
          >
            Découvrir les fonctionnalités
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <IconCircleCheck size={18} className="text-accent-400" />
            Sans engagement
          </div>
          <div className="flex items-center gap-2">
            <IconCircleCheck size={18} className="text-accent-400" />
            Mise en place instantanée
          </div>
          <div className="flex items-center gap-2">
            <IconCircleCheck size={18} className="text-accent-400" />
            Assistance incluse
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Stats Bar ───────────────────────────── */
function StatsBar() {
  const stats = [
    { value: '2 500+', label: 'Missions gérées' },
    { value: '50+', label: 'Prestataires actifs' },
    { value: '99.9%', label: 'Disponibilité' },
    { value: '4.8/5', label: 'Satisfaction' },
  ];

  return (
    <section className="relative py-16 md:py-20 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl md:text-5xl font-black gradient-text mb-2">{s.value}</div>
            <div className="text-sm text-slate-500 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── Features ───────────────────────────── */
function Features() {
  const features = [
    {
      icon: IconCalendar,
      title: 'Création de mission en 30 secondes',
      desc: 'Sélectionnez un bien, choisissez les tâches, définissez les dates. Le reste est automatique : horaires par défaut, durée calculée selon le logement, prestataires préférés pré-sélectionnés.',
      color: 'from-brand-500 to-brand-700',
    },
    {
      icon: IconUsers,
      title: 'Attribution intelligente',
      desc: 'Assignez une mission à un prestataire spécifique ou ouvrez-la à tous. Le mode binôme permet à deux prestataires de collaborer sur les grosses missions, avec répartition équitable des heures.',
      color: 'from-accent-500 to-accent-600',
    },
    {
      icon: IconRefresh,
      title: 'Temps réel',
      desc: 'Fini les rafraîchissements manuels. Les missions, statuts et disponibilités se mettent à jour instantanément chez la conciergerie et chez le prestataire. Une expérience fluide, comme une app native.',
      color: 'from-purple-500 to-purple-700',
    },
    {
      icon: IconCamera,
      title: 'Comptes rendus photo',
      desc: "À la fin de chaque mission, le prestataire envoie un compte rendu avec commentaire et photos. Vous le recevez par email et cela s'affiche également dans les détails de la mission. Preuve de travail garantie.",
      color: 'from-orange-500 to-orange-700',
    },
    {
      icon: IconBell,
      title: 'Notifications par email',
      desc: 'Les prestataires sont automatiquement informés des nouvelles missions, modifications et annulations. Les emails sont différenciés : modification anodine ou importante nécessitant une re-validation.',
      color: 'from-pink-500 to-pink-700',
    },
    {
      icon: IconChartBar,
      title: 'Historique & statistiques',
      desc: "Consultez l'historique complet avec graphiques de répartition, filtres par période et par conciergerie. Idéal pour la compta, le reporting et l'analyse d'activité.",
      color: 'from-cyan-500 to-cyan-700',
    },
    {
      icon: IconShieldCheck,
      title: 'Sécurité & fiabilité',
      desc: 'Données hébergées sur serveur sécurisé, sauvegardes automatiques, gestion des conflits en temps réel. Aucun risque de double attribution ou de perte de données.',
      color: 'from-emerald-500 to-emerald-700',
    },
    {
      icon: IconDeviceMobile,
      title: '100% mobile & desktop',
      desc: "Application web fonctionnant directement dans votre navigateur préféré, accessible depuis l'écran d'accueil, sans installation préalable : l'expérience est instantanée et reste familière quelque soit le support !",
      color: 'from-indigo-500 to-indigo-700',
    },
  ];

  return (
    <section id="fonctionnalites" className="relative py-16 md:py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Tout ce dont vous avez besoin,
            <br />
            <span className="gradient-text">rien de superflu</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Une plateforme complète pensée pour le quotidien des conciergeries et de leurs prestataires.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass glass-hover glow-border rounded-2xl p-6 group">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-linear-to-br ${f.color} flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}
                >
                  <f.icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── How It Works ───────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      icon: IconHome,
      title: '1. Créez vos biens',
      desc: 'Renseignez vos logements : photos, description, objectifs, temps de nettoyage et de jardinage par défaut. Ajoutez des notes internes accessibles à vos prestataires.',
    },
    {
      icon: IconCalendar,
      title: '2. Planifiez les missions',
      desc: 'Sélectionnez un bien, les tâches à effectuer, les dates et horaires. Choisissez un prestataire en particulier ou laissez la mission ouverte. Le mode binôme est disponible pour les grosses missions.',
    },
    {
      icon: IconBolt,
      title: '3. Les prestataires acceptent',
      desc: 'Vos prestataires reçoivent une notification par email et peuvent accepter la mission en un clic. La mission est attribuée automatiquement au premier qui accepte — sans risque de double attribution.',
    },
    {
      icon: IconCamera,
      title: '4. Suivi & compte rendu',
      desc: "Suivez le statut en temps réel : acceptée, démarrée, terminée. Le prestataire envoie un compte rendu photo à la fin. Vous recevez tout par email et dans l'application.",
    },
  ];

  return (
    <section id="comment-ca-marche" className="relative py-16 md:py-24 px-6 overflow-hidden">
      <div className="hero-glow w-100 h-100 bg-brand-600/10 top-1/2 left-1/4" />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Comment ça <span className="gradient-text">marche</span> ?
          </h2>
          <p className="text-slate-400 text-lg">De la création à la fin de mission, en 4 étapes simples.</p>
        </div>

        <div className="space-y-6">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-row gap-4 items-start group">
              <div className="shrink-0 w-14 h-14 rounded-2xl glass glow-border flex items-center justify-center group-hover:scale-110 transition-transform">
                <s.icon size={24} className="text-accent-400" />
              </div>
              <div className="glass glass-hover glow-border rounded-2xl p-5 flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Phone Mockup (Interactive) ───────────────────────────── */

type MockMode = 'conciergerie' | 'employee';
type MockScreen = 'missions' | 'calendar' | 'history' | 'settings' | 'biens' | 'prestataires' | 'calendar-conciergerie';

function PhoneMockup() {
  const [mode, setMode] = useState<MockMode>('employee');
  const [screen, setScreen] = useState<MockScreen>('missions');
  const [missionStage, setMissionStage] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const screenOrder: MockScreen[] =
    mode === 'employee'
      ? ['missions', 'calendar', 'history', 'settings']
      : ['missions', 'calendar-conciergerie', 'biens', 'prestataires', 'settings'];

  // Reset screen and stage when mode changes
  useEffect(() => {
    setScreen('missions');
    setMissionStage(0);
  }, [mode]);

  // Auto-advance: wait for all mission stages before moving to next screen
  useEffect(() => {
    if (!autoAdvance) return;
    if (screen === 'missions') {
      if (missionStage < 3) {
        const timer = setTimeout(() => setMissionStage(prev => prev + 1), 3500);
        return () => clearTimeout(timer);
      } else {
        // All stages shown, advance to next screen after a pause
        const timer = setTimeout(() => {
          setMissionStage(0);
          setScreen(prev => screenOrder[(screenOrder.indexOf(prev) + 1) % screenOrder.length]);
        }, 3500);
        return () => clearTimeout(timer);
      }
    } else {
      // Non-missions screens: advance after 6s
      const timer = setTimeout(() => {
        setScreen(prev => screenOrder[(screenOrder.indexOf(prev) + 1) % screenOrder.length]);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [screen, missionStage, autoAdvance, mode]);

  const handleNavClick = (s: MockScreen) => {
    setScreen(s);
    setAutoAdvance(false);
    setTimeout(() => setAutoAdvance(true), 15000);
  };

  const stageLabels = ['Nouvelle mission reçue', 'Mission acceptée', 'Mission en cours', 'Mission terminée'];
  const stageColors = ['text-amber-400', 'text-brand-400', 'text-purple-400', 'text-emerald-400'];

  const navItems =
    mode === 'employee'
      ? [
          { screen: 'missions' as MockScreen, icon: IconCalendar, label: 'Missions' },
          { screen: 'calendar' as MockScreen, icon: IconClock, label: 'Calendrier' },
          { screen: 'history' as MockScreen, icon: IconChartBar, label: 'Historique' },
          { screen: 'settings' as MockScreen, icon: IconShieldCheck, label: 'Paramètres' },
        ]
      : [
          { screen: 'missions' as MockScreen, icon: IconCalendar, label: 'Missions' },
          { screen: 'calendar-conciergerie' as MockScreen, icon: IconClock, label: 'Calendrier' },
          { screen: 'biens' as MockScreen, icon: IconHome, label: 'Biens' },
          { screen: 'prestataires' as MockScreen, icon: IconUsers, label: 'Prest.' },
          { screen: 'settings' as MockScreen, icon: IconShieldCheck, label: 'Param.' },
        ];

  return (
    <section className="relative py-16 md:py-24 px-6 overflow-hidden">
      <div className="hero-glow w-125 h-125 bg-accent-500/10 top-1/2 right-0" />
      <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Une application
            <br />
            <span className="gradient-text">qui suit votre rythme</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Conçue pour le terrain. Vos prestataires ouvrent l'app sur leur téléphone, voient les missions disponibles,
            acceptent en un tap, démarrent leur journée et envoient le compte rendu photo à la fin. Le tout sans
            installation : ça fonctionne directement dans le navigateur.
          </p>
          <div className="space-y-3">
            {[
              "Accessible depuis l'écran d'accueil, sans installation",
              'Fonctionne sur iOS, Android et desktop',
              'Notifications par email pour les nouvelles missions',
              'Interface fluide et familière, quelque soit le support',
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <IconCircleCheck size={20} className="text-accent-400 shrink-0" />
                <span className="text-slate-300">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phone + mode toggle */}
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Phone mockup */}
          <div className="relative animate-float origin-top">
            <div className="w-70 sm:w-75 h-140 sm:h-150 rounded-[2.5rem] glass border-2 border-white/10 p-3 sm:p-4 shadow-2xl">
              <div
                className="w-full h-full rounded-4xl bg-linear-to-b from-slate-900 to-slate-950 overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(to bottom, var(--phone-bg-from), var(--phone-bg-to))' }}
              >
                <div className="flex justify-between items-center text-xs text-slate-500 px-4 pt-3 pb-2">
                  <span>9:41</span>
                  <span className="font-semibold text-slate-400">Job Conciergerie</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${mode === 'employee' ? 'bg-brand-500/20 text-brand-300' : 'bg-accent-500/20 text-accent-300'}`}
                  >
                    {mode === 'employee' ? '👤 Prestataire' : '🏢 Conciergerie'}
                  </span>
                </div>

                <div className="flex-1 overflow-hidden px-3 pb-2">
                  {/* ── Missions screen ── */}
                  {screen === 'missions' && (
                    <div className="h-full flex flex-col gap-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className={`text-xs font-semibold ${stageColors[missionStage]}`}>
                          {stageLabels[missionStage]}
                        </span>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map(s => (
                            <div
                              key={s}
                              className={`h-1.5 rounded-full transition-all ${s === missionStage ? 'w-4 bg-brand-400' : 'w-1.5 bg-slate-700'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div
                        className={`glass rounded-xl p-3 border transition-all duration-500 ${
                          missionStage === 0
                            ? 'border-amber-500/40 animate-pulse'
                            : missionStage === 1
                              ? 'border-brand-500/40'
                              : missionStage === 2
                                ? 'border-purple-500/40'
                                : 'border-emerald-500/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <IconHome size={16} className="text-brand-400" />
                          <span className="text-sm font-semibold text-white">Villa Saint-Cloud</span>
                          {missionStage >= 1 && <IconCircleCheck size={14} className="ml-auto text-emerald-400" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <IconCalendar size={12} />
                          <span>Lun 5 Oct · 10:15 — 16:00</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                            Nettoyage
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300">
                            Jardinage
                          </span>
                        </div>
                        {mode === 'employee' && missionStage === 0 && (
                          <button
                            type="button"
                            className="w-full py-1.5 rounded-lg bg-linear-to-r from-brand-500 to-accent-500 text-white text-xs font-semibold"
                          >
                            ✓ Accepter la mission
                          </button>
                        )}
                        {mode === 'conciergerie' && missionStage === 0 && (
                          <div className="text-xs text-amber-400 flex items-center gap-1">
                            <IconBell size={12} />
                            <span>En attente d'acceptation...</span>
                          </div>
                        )}
                        {missionStage === 2 && (
                          <div className="flex items-center gap-1 text-xs text-purple-400">
                            <IconClock size={12} className="animate-spin" />
                            <span>En cours... 2h15 restantes</span>
                          </div>
                        )}
                        {missionStage === 3 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <IconCamera size={12} />
                            <span>Compte rendu envoyé · 3 photos</span>
                          </div>
                        )}
                      </div>

                      <div className="glass rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <IconHome size={16} className="text-brand-400" />
                          <span className="text-sm font-semibold text-white">Appart Marais</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <IconCalendar size={12} />
                          <span>Mar 6 Oct · 10:15 — 13:00</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                            Nettoyage
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                          <IconUsers size={12} />
                          <span>Binôme · 1/2</span>
                        </div>
                      </div>

                      <div className="glass rounded-xl p-3 opacity-50">
                        <div className="flex items-center gap-2 mb-1">
                          <IconCircleCheck size={14} className="text-emerald-400" />
                          <span className="text-sm font-semibold text-white line-through">Studio Bastille</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <IconCamera size={12} />
                          <span>Terminé · 3 photos</span>
                        </div>
                      </div>

                      {missionStage === 0 && (
                        <div className="glass rounded-lg p-2 border border-amber-500/30 flex items-center gap-2 animate-float">
                          <IconBell size={14} className="text-amber-400 animate-glow" />
                          <span className="text-xs text-amber-300">
                            {mode === 'employee'
                              ? 'Nouvelle mission disponible !'
                              : 'Mission en attente de prestataire'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Calendar screen ── */}
                  {screen === 'calendar' && (
                    <div className="h-full flex flex-col gap-2">
                      <div className="text-xs text-slate-500 px-1 mb-1">Octobre 2026</div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                          <div key={i} className="text-xs text-slate-600">
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          const hasMission = [5, 6, 12, 13, 19, 20, 26].includes(day);
                          const isToday = day === 5;
                          return (
                            <div
                              key={i}
                              className={`text-xs py-1.5 rounded-lg ${isToday ? 'bg-brand-500 text-white font-bold' : hasMission ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500'}`}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="glass rounded-lg p-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-400" />
                          <span className="text-xs text-slate-300">Lun 5 · Villa Saint-Cloud</span>
                          {mode === 'conciergerie' && <span className="ml-auto text-xs text-slate-500">Karim B.</span>}
                        </div>
                        <div className="glass rounded-lg p-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent-400" />
                          <span className="text-xs text-slate-300">Mar 6 · Appart Marais</span>
                          {mode === 'conciergerie' && (
                            <span className="ml-auto text-xs text-slate-500">Non assignée</span>
                          )}
                        </div>
                        <div className="glass rounded-lg p-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                          <span className="text-xs text-slate-300">Lun 12 · Villa Saint-Cloud</span>
                          {mode === 'conciergerie' && <span className="ml-auto text-xs text-slate-500">Sophie L.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── History screen ── */}
                  {screen === 'history' && (
                    <div className="h-full flex flex-col gap-2">
                      <div className="text-xs text-slate-500 px-1 mb-1">
                        {mode === 'employee' ? 'Mes missions terminées' : 'Historique des missions'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-1">
                        <div className="glass rounded-xl p-2.5 text-center">
                          <div className="text-xl font-black gradient-text">12</div>
                          <div className="text-xs text-slate-500">Missions</div>
                        </div>
                        <div className="glass rounded-xl p-2.5 text-center">
                          <div className="text-xl font-black gradient-text">48h</div>
                          <div className="text-xs text-slate-500">{mode === 'employee' ? 'Travaillées' : 'Total'}</div>
                        </div>
                      </div>
                      <div className="glass rounded-xl p-3">
                        <div className="text-xs text-slate-500 mb-2">Répartition par semaine</div>
                        <div className="flex items-end justify-around h-14 gap-2">
                          {[40, 65, 50, 80, 35].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t bg-linear-to-t from-brand-600 to-brand-400 transition-all duration-700"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-around mt-1">
                          {['S1', 'S2', 'S3', 'S4', 'S5'].map((w, i) => (
                            <span key={i} className="text-xs text-slate-600">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="glass rounded-lg p-2 flex items-center gap-2">
                          <IconCircleCheck size={12} className="text-emerald-400" />
                          <span className="text-xs text-slate-300">Studio Bastille</span>
                          <span className="ml-auto text-xs text-slate-500">3 Oct</span>
                        </div>
                        <div className="glass rounded-lg p-2 flex items-center gap-2">
                          <IconCircleCheck size={12} className="text-emerald-400" />
                          <span className="text-xs text-slate-300">Villa Saint-Cloud</span>
                          <span className="ml-auto text-xs text-slate-500">28 Sep</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Biens screen (conciergerie) ── */}
                  {screen === 'biens' && (
                    <div className="h-full flex flex-col gap-2">
                      <div className="text-xs text-slate-500 px-1 mb-1">Mes biens · 12</div>
                      {[
                        { name: 'Villa Saint-Cloud', type: 'Maison', missions: 8, status: 'Actif' },
                        { name: 'Appart Marais', type: 'Appartement', missions: 5, status: 'Actif' },
                        { name: 'Studio Bastille', type: 'Studio', missions: 3, status: 'Actif' },
                        { name: 'Loft Belleville', type: 'Loft', missions: 0, status: 'En pause' },
                      ].map((b, i) => (
                        <div
                          key={i}
                          className={`glass rounded-xl p-2.5 ${b.status === 'En pause' ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <IconHome size={14} className="text-brand-400 shrink-0" />
                            <span className="text-sm font-semibold text-white flex-1 truncate">{b.name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === 'Actif' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-500'}`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{b.type}</span>
                            <span>·</span>
                            <span>{b.missions} missions</span>
                          </div>
                        </div>
                      ))}
                      <div className="glass rounded-lg p-2 flex items-center justify-center gap-1 border border-dashed border-white/10">
                        <span className="text-xs text-slate-500">+ Ajouter un bien</span>
                      </div>
                    </div>
                  )}

                  {/* ── Prestataires screen (conciergerie) ── */}
                  {screen === 'prestataires' && (
                    <div className="h-full flex flex-col gap-2">
                      <div className="text-xs text-slate-500 px-1 mb-1">Prestataires · 8</div>
                      {[
                        {
                          name: 'Karim B.',
                          initials: 'K',
                          missions: 12,
                          status: 'Disponible',
                          color: 'from-brand-500 to-accent-500',
                        },
                        {
                          name: 'Sophie L.',
                          initials: 'S',
                          missions: 8,
                          status: 'En mission',
                          color: 'from-purple-500 to-pink-500',
                        },
                        {
                          name: 'Marc D.',
                          initials: 'M',
                          missions: 5,
                          status: 'Disponible',
                          color: 'from-cyan-500 to-blue-500',
                        },
                        {
                          name: 'Élodie M.',
                          initials: 'É',
                          missions: 3,
                          status: 'Indisponible',
                          color: 'from-amber-500 to-orange-500',
                        },
                      ].map((p, i) => (
                        <div key={i} className="glass rounded-xl p-2.5 flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full bg-linear-to-br ${p.color} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                          >
                            {p.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.missions} missions</div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                              p.status === 'Disponible'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : p.status === 'En mission'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-slate-500/20 text-slate-500'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Calendar screen (conciergerie) ── */}
                  {screen === 'calendar-conciergerie' && (
                    <div className="h-full flex flex-col gap-2">
                      <div className="text-xs text-slate-500 px-1 mb-1">Suivi des prestataires · Aujourd'hui</div>
                      {[
                        {
                          name: 'Karim B.',
                          initials: 'K',
                          color: 'from-brand-500 to-accent-500',
                          missions: [
                            {
                              title: 'Villa Saint-Cloud',
                              time: '09:00',
                              status: 'Terminée',
                              color: 'text-emerald-400',
                            },
                            { title: 'Appart Marais', time: '11:30', status: 'En cours', color: 'text-purple-400' },
                            { title: 'Studio Bastille', time: '14:00', status: 'À venir', color: 'text-slate-500' },
                          ],
                        },
                        {
                          name: 'Sophie L.',
                          initials: 'S',
                          color: 'from-purple-500 to-pink-500',
                          missions: [
                            { title: 'Loft Belleville', time: '10:00', status: 'En cours', color: 'text-purple-400' },
                            { title: 'Villa Saint-Cloud', time: '15:00', status: 'À venir', color: 'text-slate-500' },
                          ],
                        },
                        {
                          name: 'Marc D.',
                          initials: 'M',
                          color: 'from-cyan-500 to-blue-500',
                          missions: [
                            { title: 'Appart Marais', time: '08:00', status: 'Terminée', color: 'text-emerald-400' },
                          ],
                        },
                      ].map((p, i) => (
                        <div key={i} className="glass rounded-xl p-2.5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div
                              className={`w-6 h-6 rounded-full bg-linear-to-br ${p.color} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}
                            >
                              {p.initials}
                            </div>
                            <span className="text-xs font-semibold text-white">{p.name}</span>
                            <span className="ml-auto text-[10px] text-slate-500">{p.missions.length} missions</span>
                          </div>
                          <div className="space-y-1 ml-8">
                            {p.missions.map((m, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-10">{m.time}</span>
                                <span className="text-[10px] text-slate-300 flex-1 truncate">{m.title}</span>
                                <span className={`text-[10px] ${m.color} font-semibold`}>{m.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Settings screen ── */}
                  {screen === 'settings' && (
                    <div className="h-full flex flex-col gap-2">
                      <div className="text-xs text-slate-500 px-1 mb-1">Paramètres</div>
                      <div className="glass rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                          {mode === 'employee' ? 'K' : 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {mode === 'employee' ? 'Karim B.' : 'Sophie L.'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {mode === 'employee' ? 'Prestataire' : 'Conciergerie'}
                          </div>
                        </div>
                      </div>
                      {[
                        { icon: IconBell, label: 'Notifications', value: 'Activées' },
                        {
                          icon: IconMail,
                          label: 'Email',
                          value: mode === 'employee' ? 'karim@mail.fr' : 'sophie@mail.fr',
                        },
                        { icon: IconPhone, label: 'Téléphone', value: '06 20 71 88 34' },
                        { icon: IconMapPin, label: 'Zone', value: 'Brest, Finistère' },
                        { icon: IconShieldCheck, label: 'Confidentialité', value: '' },
                      ].map((item, i) => (
                        <div key={i} className="glass rounded-xl p-2.5 flex items-center gap-2">
                          <item.icon size={16} className="text-brand-400 shrink-0" />
                          <span className="text-xs text-slate-300">{item.label}</span>
                          {item.value && <span className="ml-auto text-xs text-slate-500">{item.value}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom nav — different per mode */}
                <div className="flex justify-around items-center pt-2 pb-3 border-t border-white/5">
                  {navItems.map((nav, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleNavClick(nav.screen)}
                      className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110"
                      style={{ cursor: 'pointer' }}
                    >
                      <nav.icon size={20} className={screen === nav.screen ? 'text-brand-400' : 'text-slate-600'} />
                      <span className={`text-[8px] ${screen === nav.screen ? 'text-brand-400' : 'text-slate-700'}`}>
                        {nav.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mode toggle — below phone */}
          <div
            className="inline-flex items-center gap-2 rounded-full p-1.5"
            style={{
              position: 'relative',
              zIndex: 50,
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('employee')}
              style={{ cursor: 'pointer' }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'employee' ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              👤 Prestataire
            </button>
            <button
              type="button"
              onClick={() => setMode('conciergerie')}
              style={{ cursor: 'pointer' }}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'conciergerie' ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              🏢 Conciergerie
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Testimonials ───────────────────────────── */
function Testimonials() {
  const testimonials = [
    {
      name: 'Sophie L.',
      role: 'Conciergerie · Brest, Finistère',
      text: "Depuis Job Conciergerie, je gère 40 logements sans stress. Les prestataires sont notifiés automatiquement, je n'ai plus à appeler un par un. Un game-changer.",
      stars: 5,
    },
    {
      name: 'Karim B.',
      role: 'Prestataire · Crozon, Finistère',
      text: "L'app est super simple. Je vois les missions dispo, j'accepte en un clic, et le compte rendu photo à la fin c'est top pour prouver mon travail. Plus besoin d'Excel.",
      stars: 5,
    },
    {
      name: 'Élodie M.',
      role: 'Conciergerie · Quimper, Finistère',
      text: "Le mode binôme est génial pour les grands appartements. Le temps réel m'évite les doublons, et les statistiques mensuelles me servent directement pour ma compta.",
      stars: 4.5,
    },
  ];

  return (
    <section id="temoignages" className="relative py-16 md:py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Ils nous font <span className="gradient-text">confiance</span>
          </h2>
          <p className="text-slate-400 text-lg">Conciergeries et prestataires témoignent.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="glass glass-hover glow-border rounded-2xl p-6 group">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: Math.floor(t.stars) }).map((_, j) => (
                  <IconStar key={j} size={16} className="fill-amber-500 text-amber-500" />
                ))}
                {t.stars % 1 !== 0 && <IconStarHalf size={16} className="fill-amber-500 text-amber-500" />}
              </div>
              <p className="text-slate-300 leading-relaxed mb-6 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Pricing ───────────────────────────── */
function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!openTooltip) return;
    const handler = () => setOpenTooltip(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openTooltip]);

  const tooltipTexts: Record<string, string> = {
    'SLA garanti': 'Service Level Agreement : garantie de disponibilité et de temps de réponse',
    'API & intégrations': 'Connectez Job Conciergerie à vos outils existants (calendriers, CRM, comptabilité)',
    'Personnalisation avancée':
      "Adaptation de l'application à vos besoins spécifiques (workflows, champs personnalisés)",
    'Onboarding personnalisé': 'Accompagnement dédié pour la mise en place et la formation de votre équipe',
    'Mises à jour illimitées': 'Toutes les nouvelles fonctionnalités et améliorations incluses sans surcoût',
    'Formation en visio': 'Sessions de formation personnalisées en visioconférence avec notre équipe',
    'Assistance dédiée': 'Un interlocuteur unique dédié à votre compte, joignable directement',
  };

  const plans = [
    {
      id: 'decouverte',
      name: 'Découverte',
      monthlyPrice: 30,
      annualPrice: 300,
      desc: 'Pour les conciergeries qui démarrent',
      features: [
        "Jusqu'à 20 biens",
        "Jusqu'à 10 prestataires",
        'Missions & calendrier',
        'Mode binôme',
        'Corrections de bugs incluses',
        'Notifications email',
        'Assistance par email',
      ],
      highlighted: false,
      badge: null,
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 50,
      annualPrice: 500,
      desc: 'Pour les conciergeries en croissance',
      features: [
        'Tout le plan Découverte',
        'Biens illimités',
        'Prestataires illimités',
        'Comptes rendus photo',
        'Historique & statistiques',
        'Multi-conciergerie',
        'Notifications avancées',
        'Assistance prioritaire',
      ],
      highlighted: true,
      badge: 'LE PLUS POPULAIRE',
    },
    {
      id: 'privilege',
      name: 'Privilège',
      monthlyPrice: 100,
      annualPrice: 1000,
      desc: 'Pour les conciergeries exigeantes',
      features: [
        'Tout le plan Pro',
        'Mises à jour illimitées',
        'Formation en visio',
        'API & intégrations',
        'SLA garanti',
        'Personnalisation avancée',
        'Onboarding personnalisé',
        'Assistance dédiée',
      ],
      highlighted: false,
      badge: 'VIP',
    },
  ];

  return (
    <section id="tarifs" className="relative py-16 md:py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Des tarifs <span className="gradient-text">adaptés</span>
          </h2>
          <p className="text-slate-400 text-lg mb-8">Choisissez la formule qui vous correspond. Sans engagement.</p>

          {/* Monthly / Annual toggle */}
          <div
            className="inline-flex items-center gap-4 rounded-full p-1.5"
            style={{
              position: 'relative',
              zIndex: 50,
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setAnnual(false)}
              style={{ cursor: 'pointer' }}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              style={{ cursor: 'pointer' }}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Annuel
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${annual ? 'bg-white/20 text-white' : 'bg-accent-500/20 text-accent-300'}`}
              >
                2 mois offerts
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <div
              key={i}
              className={`relative z-10 rounded-2xl p-8 flex flex-col group ${p.highlighted ? 'glass glow-border border-2 border-brand-500/30 glass-hover' : 'glass glass-hover glow-border'}`}
            >
              {p.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold ${
                    p.badge === 'VIP'
                      ? 'bg-linear-to-r from-amber-500 to-yellow-500'
                      : 'bg-linear-to-r from-brand-500 to-accent-500'
                  }`}
                >
                  {p.badge}
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{p.desc}</p>
              <div className="mb-1">
                <span className="text-4xl font-black gradient-text">{annual ? p.annualPrice : p.monthlyPrice}€</span>
                <span className="text-slate-500 text-sm ml-1">{annual ? '/ an' : '/ mois'}</span>
              </div>
              {annual && (
                <p className="text-xs text-accent-400 mb-4">
                  Soit {Math.round(p.annualPrice / 12)}€/mois — 2 mois offerts
                </p>
              )}
              {!annual && <div className="mb-4" />}
              <div className="space-y-3 mb-8 flex-1">
                {p.features.map((f, j) => {
                  const tooltip = tooltipTexts[f];
                  return (
                    <div key={j} className="flex items-center gap-2">
                      <IconCheck size={18} className="text-accent-400 shrink-0" />
                      {tooltip ? (
                        <span className="text-sm text-slate-300 flex items-center gap-1">
                          {f}
                          <span
                            className="relative"
                            onMouseEnter={() => setOpenTooltip(f)}
                            onMouseLeave={() => setOpenTooltip(null)}
                          >
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setOpenTooltip(openTooltip === f ? null : f);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <IconSparkles size={14} className="text-slate-500 hover:text-accent-400" />
                            </button>
                            {openTooltip === f && (
                              <span
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs text-white max-w-50 w-max z-50 pointer-events-none"
                                style={{
                                  backgroundColor: 'var(--bg-base)',
                                  border: '1px solid var(--glass-border)',
                                  opacity: 1,
                                }}
                                onClick={() => setOpenTooltip(null)}
                              >
                                {tooltip}
                              </span>
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-slate-300">{f}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <a
                href={`/checkout?plan=${p.id}&billing=${annual ? 'annual' : 'monthly'}`}
                className={`block text-center py-3 rounded-full font-semibold transition-all relative z-20 ${
                  p.highlighted
                    ? 'bg-linear-to-r from-brand-500 to-accent-500 text-white hover:scale-105'
                    : 'glass glass-hover text-white'
                }`}
                style={{ cursor: 'pointer' }}
              >
                S&apos;abonner
              </a>
              <a
                href="#contact"
                onClick={() => {
                  const subject = `forfait-${p.name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z]/g, '')}`;
                  window.dispatchEvent(new CustomEvent('contactSubject', { detail: subject }));
                }}
                className="block text-center text-xs text-slate-500 hover:text-accent-400 transition-colors mt-3"
                style={{ cursor: 'pointer' }}
              >
                Ou nous contacter
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Contact Form ───────────────────────────── */
function ContactForm() {
  const [formState, setFormState] = useState({ name: '', company: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [showBreton, setShowBreton] = useState(false);

  const subjects = [
    { value: 'forfait-decouverte', label: 'Forfait Découverte' },
    { value: 'forfait-pro', label: 'Forfait Pro' },
    { value: 'forfait-privilege', label: 'Forfait Privilège' },
    { value: 'demande-renseignement', label: 'Demande de renseignement' },
    { value: 'demo', label: 'Demande de démo' },
  ];

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      setFormState(prev => ({ ...prev, subject: detail }));
    };
    window.addEventListener('contactSubject', handler);
    return () => window.removeEventListener('contactSubject', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const { sendContactEmail } = await import('@/app/actions/contact');
      const result = await sendContactEmail(formState);
      if (result.success) {
        setStatus('sent');
        setFormState({ name: '', company: '', email: '', phone: '', subject: '', message: '' });
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all';

  return (
    <section id="contact" className="relative pt-16 md:pt-24 pb-8 md:pb-12 px-6 overflow-hidden">
      <div className="hero-glow w-125 h-125 bg-brand-600/15 top-0 left-0" />
      <div className="hero-glow w-100 h-100 bg-accent-500/10 bottom-0 right-0" />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Demandons une <span className="gradient-text">démo</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Voyons ensemble comment Job Conciergerie peut transformer votre activité. Réponse sous 24h, sans engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 md:order-1">
            <form
              onSubmit={handleSubmit}
              className="glass glass-hover glow-border rounded-2xl p-8 space-y-4 transition-all focus-within:glow-border"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Nom complet *</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={e => setFormState({ ...formState, name: e.target.value })}
                    className={inputClass}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Entreprise</label>
                  <input
                    type="text"
                    value={formState.company}
                    onChange={e => setFormState({ ...formState, company: e.target.value })}
                    className={inputClass}
                    placeholder="Ma Conciergerie"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Email *</label>
                  <input
                    required
                    type="email"
                    value={formState.email}
                    onChange={e => setFormState({ ...formState, email: e.target.value })}
                    className={inputClass}
                    placeholder="jean@conciergerie.fr"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Téléphone</label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={e => setFormState({ ...formState, phone: e.target.value })}
                    className={inputClass}
                    placeholder="06 00 00 00 00"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Sujet</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSubjectOpen(!subjectOpen)}
                    className={inputClass + ' text-left flex items-center justify-between'}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={formState.subject ? 'text-white' : 'text-slate-600'}>
                      {formState.subject
                        ? subjects.find(s => s.value === formState.subject)?.label
                        : 'Choisir un sujet...'}
                    </span>
                    <IconChevronDown
                      size={18}
                      className={`text-slate-500 transition-transform ${subjectOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {subjectOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSubjectOpen(false)} />
                      <div
                        className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--glass-border)',
                        }}
                      >
                        {subjects.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => {
                              setFormState({ ...formState, subject: s.value });
                              setSubjectOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/5 ${
                              formState.subject === s.value ? 'text-accent-400' : 'text-slate-300'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Votre message *</label>
                <textarea
                  required
                  rows={4}
                  value={formState.message}
                  onChange={e => setFormState({ ...formState, message: e.target.value })}
                  className={inputClass + ' resize-none'}
                  placeholder="Parlez-nous de votre activité, le nombre de biens gérés, vos besoins..."
                />
              </div>

              <button
                type="submit"
                disabled={status === 'sending' || status === 'sent'}
                className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                  status === 'sent'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-linear-to-r from-brand-500 to-accent-500 text-white hover:scale-[1.02]'
                }`}
              >
                {status === 'sending' && (
                  <>
                    <IconRefresh size={20} className="animate-spin" />
                    Envoi en cours...
                  </>
                )}
                {status === 'sent' && (
                  <>
                    <IconCircleCheck size={20} />
                    Message envoyé !
                  </>
                )}
                {status === 'idle' && (
                  <>
                    <IconSend size={20} />
                    Envoyer ma demande
                  </>
                )}
              </button>

              {status === 'sent' && (
                <p className="text-center text-sm text-emerald-400">Merci ! Nous vous recontactons sous 24h.</p>
              )}
              {status === 'error' && (
                <p className="text-center text-sm text-red-400">
                  Une erreur est survenue. Réessayez ou écrivez-nous à contact@job-conciergerie.fr
                </p>
              )}
            </form>
          </div>

          {/* Contact info */}
          <div className="md:col-span-2 md:order-2 space-y-6">
            <div className="glass glass-hover glow-border rounded-2xl p-6 transition-all">
              <h3 className="text-lg font-bold text-white mb-4">Pourquoi nous contacter ?</h3>
              <div className="space-y-3">
                {[
                  { icon: IconRocket, text: "Démo personnalisée de l'application" },
                  { icon: IconClock, text: 'Mise en place instantanée' },
                  { icon: IconShieldCheck, text: 'Sans engagement' },
                  { icon: IconMessageCircle, text: 'On répond à toutes vos questions' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon size={20} className="text-accent-400 shrink-0" />
                    <span className="text-sm text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass glass-hover glow-border rounded-2xl p-6 space-y-4 transition-all">
              <a
                href="mailto:contact@job-conciergerie.fr"
                className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors w-fit"
              >
                <IconMail size={20} className="text-brand-400" />
                <span className="text-sm">contact@job-conciergerie.fr</span>
              </a>
              <a
                href="tel:+33620718834"
                className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors w-fit"
              >
                <IconPhone size={20} className="text-brand-400" />
                <span className="text-sm">06 20 71 88 34</span>
              </a>
              <div className="flex items-center gap-3 text-slate-300">
                <IconMapPin size={20} className="text-brand-400" />
                <span
                  className="text-sm select-none"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setShowBreton(true);
                    setTimeout(() => setShowBreton(false), 3000);
                  }}
                >
                  Brest, Finistère
                </span>
                {showBreton && (
                  <img
                    src="/breton-flag.svg"
                    alt="Drapeau breton"
                    className="w-6 h-4 animate-bounce rounded-sm shadow-sm bg-white"
                    style={{ animationDuration: '0.8s' }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */
function Footer() {
  return (
    <footer className="relative py-8 md:py-12 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Logo size={28} />
            <span className="gradient-text">Job Conciergerie</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#fonctionnalites" className="hover:text-white transition-colors">
              Fonctionnalités
            </a>
            <a href="#comment-ca-marche" className="hover:text-white transition-colors">
              Comment ça marche
            </a>
            <a href="#tarifs" className="hover:text-white transition-colors">
              Tarifs
            </a>
            <a
              href="#contact"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('contactSubject', { detail: 'demande-renseignement' }))
              }
              className="hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} Job Conciergerie · Tous droits réservés
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */
export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <PhoneMockup />
      <Testimonials />
      <Pricing />
      <ContactForm />
      <Footer />
    </main>
  );
}
