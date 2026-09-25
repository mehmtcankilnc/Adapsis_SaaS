import Link from "next/link";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import {
  ArrowRight,
  Hexagon,
  Boxes,
  ReceiptText,
  TrendingUp,
  Users,
  Lock,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CornerTicks } from "@/components/ui/corner-ticks";
import { cn } from "@/lib/utils";
import { T } from "@/components/layout/T";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-blueprint-display",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-blueprint-mono",
});

const modules: {
  code: string;
  icon: typeof Boxes;
  titleKey: DictionaryKey;
  bodyKey: DictionaryKey;
  noteKey: DictionaryKey;
  span: string;
}[] = [
  {
    code: "MOD.01",
    icon: Boxes,
    titleKey: "landing.mod1.title",
    bodyKey: "landing.mod1.body",
    noteKey: "landing.mod1.note",
    span: "md:col-span-4",
  },
  {
    code: "MOD.02",
    icon: ReceiptText,
    titleKey: "landing.mod2.title",
    bodyKey: "landing.mod2.body",
    noteKey: "landing.mod2.note",
    span: "md:col-span-2",
  },
  {
    code: "MOD.03",
    icon: TrendingUp,
    titleKey: "landing.mod3.title",
    bodyKey: "landing.mod3.body",
    noteKey: "landing.mod3.note",
    span: "md:col-span-2",
  },
  {
    code: "MOD.04",
    icon: Users,
    titleKey: "landing.mod4.title",
    bodyKey: "landing.mod4.body",
    noteKey: "landing.mod4.note",
    span: "md:col-span-4",
  },
];

const flow: { n: string; titleKey: DictionaryKey; bodyKey: DictionaryKey }[] = [
  { n: "01", titleKey: "landing.flow1.title", bodyKey: "landing.flow1.body" },
  { n: "02", titleKey: "landing.flow2.title", bodyKey: "landing.flow2.body" },
  { n: "03", titleKey: "landing.flow3.title", bodyKey: "landing.flow3.body" },
  { n: "04", titleKey: "landing.flow4.title", bodyKey: "landing.flow4.body" },
  { n: "05", titleKey: "landing.flow5.title", bodyKey: "landing.flow5.body" },
];

export default function Home() {
  return (
    <div
      className={cn(
        displayFont.variable,
        monoFont.variable,
        "min-h-screen bg-ink-950 text-slate-200 selection:bg-signal-500/30 selection:text-signal-100"
      )}
    >
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line-500/15 bg-ink-950/85 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-sm border border-line-500/40 bg-ink-800 p-2">
              <Hexagon className="h-5 w-5 text-line-400" />
            </div>
            <span className="font-display-blueprint text-lg font-semibold tracking-tight text-white">
              Adapsis
            </span>
            <span className="hidden font-mono-blueprint text-[10px] tracking-widest text-slate-500 sm:inline">
              <T k="landing.nav.system" />
            </span>
          </div>

          <nav className="hidden items-center gap-8 font-mono-blueprint text-[13px] tracking-wide text-slate-400 md:flex">
            <a href="#moduller" className="transition-colors hover:text-line-400">
              <T k="landing.nav.modules" />
            </a>
            <a href="#surec" className="transition-colors hover:text-line-400">
              <T k="landing.nav.process" />
            </a>
            <a href="#guvenlik" className="transition-colors hover:text-line-400">
              <T k="landing.nav.security" />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/login">
              <Button className="rounded-sm border border-signal-400/40 bg-signal-500 font-medium text-ink-950 hover:bg-signal-400">
                <T k="common.goToSystem" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line-500/15">
          <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
            <div className="flex flex-col justify-center">
              <h1 className="font-display-blueprint text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                <T k="landing.hero.title" />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
                <T k="landing.hero.subtitle" />
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link href="/login">
                  <Button className="h-12 w-full rounded-sm border border-signal-400/40 bg-signal-500 px-7 text-base font-medium text-ink-950 hover:bg-signal-400 sm:w-auto">
                    <T k="common.goToSystem" /> <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#moduller" className="sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-sm border-line-500/30 bg-transparent px-7 text-base text-slate-300 hover:bg-ink-800 hover:text-white sm:w-auto"
                  >
                    <T k="landing.hero.exploreModules" />
                  </Button>
                </a>
              </div>

              <p className="mt-8 font-mono-blueprint text-[12px] leading-relaxed text-slate-500">
                <T k="landing.hero.roleNote" />
              </p>
            </div>

            <div className="flex items-center justify-center">
              <svg
                viewBox="0 0 640 660"
                className="h-auto w-full max-w-[520px] overflow-visible"
                role="img"
                aria-label="Operation schema connecting the stock, quote, sales, and CRM modules"
              >
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#5eead4" />
                  </marker>
                </defs>

                {/* connectors */}
                <path
                  d="M180,124 L180,152 L290,152 L290,180"
                  fill="none"
                  stroke="#5eead4"
                  strokeWidth="1.5"
                  markerEnd="url(#arrow)"
                  pathLength={1}
                  className="draw-line"
                  style={{ animationDelay: "0.1s" }}
                />
                <path
                  d="M290,264 L290,292 L180,292 L180,320"
                  fill="none"
                  stroke="#5eead4"
                  strokeWidth="1.5"
                  markerEnd="url(#arrow)"
                  pathLength={1}
                  className="draw-line"
                  style={{ animationDelay: "0.35s" }}
                />
                <path
                  d="M180,404 L180,432 L290,432 L290,460"
                  fill="none"
                  stroke="#5eead4"
                  strokeWidth="1.5"
                  markerEnd="url(#arrow)"
                  pathLength={1}
                  className="draw-line"
                  style={{ animationDelay: "0.6s" }}
                />

                {/* STOK */}
                <g>
                  <rect x="30" y="40" width="300" height="84" rx="2" fill="#101728" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
                  <text x="50" y="65" className="font-mono-blueprint" fontSize="10" letterSpacing="1.5" fill="#5eead4" opacity="0.75">MOD.01</text>
                  <text x="50" y="93" className="font-display-blueprint" fontSize="20" fontWeight="600" fill="#f8fafc"><T k="landing.diagram.stock.title" /></text>
                  <text x="50" y="112" fontSize="11.5" fill="#94a3b8"><T k="landing.diagram.stock.desc" /></text>
                  <line x1="330" y1="82" x2="380" y2="82" stroke="#2dd4bf" strokeOpacity="0.4" strokeWidth="1" />
                  <line x1="330" y1="76" x2="330" y2="88" stroke="#2dd4bf" strokeOpacity="0.4" strokeWidth="1" />
                  <text x="388" y="86" className="font-mono-blueprint" fontSize="11" fill="#64748b"><T k="landing.diagram.stock.metric" /></text>
                </g>

                {/* TEKLIF */}
                <g>
                  <rect x="140" y="180" width="300" height="84" rx="2" fill="#101728" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
                  <text x="160" y="205" className="font-mono-blueprint" fontSize="10" letterSpacing="1.5" fill="#5eead4" opacity="0.75">MOD.02</text>
                  <text x="160" y="233" className="font-display-blueprint" fontSize="20" fontWeight="600" fill="#f8fafc"><T k="landing.diagram.quote.title" /></text>
                  <text x="160" y="252" fontSize="11.5" fill="#94a3b8"><T k="landing.diagram.quote.desc" /></text>
                  <line x1="440" y1="222" x2="490" y2="222" stroke="#2dd4bf" strokeOpacity="0.4" strokeWidth="1" />
                  <line x1="440" y1="216" x2="440" y2="228" stroke="#2dd4bf" strokeOpacity="0.4" strokeWidth="1" />
                  <text x="498" y="226" className="font-mono-blueprint" fontSize="11" fill="#64748b"><T k="landing.diagram.quote.metric" /></text>
                </g>

                {/* SATIS */}
                <g>
                  <rect x="30" y="320" width="300" height="84" rx="2" fill="#101728" stroke="#2dd4bf" strokeOpacity="0.45" strokeWidth="1.5" />
                  <text x="50" y="345" className="font-mono-blueprint" fontSize="10" letterSpacing="1.5" fill="#5eead4" opacity="0.75">MOD.03</text>
                  <text x="50" y="373" className="font-display-blueprint" fontSize="20" fontWeight="600" fill="#f8fafc"><T k="landing.diagram.sales.title" /></text>
                  <text x="50" y="392" fontSize="11.5" fill="#94a3b8"><T k="landing.diagram.sales.desc" /></text>
                  <line x1="330" y1="362" x2="380" y2="362" stroke="#2dd4bf" strokeOpacity="0.4" strokeWidth="1" />
                  <line x1="330" y1="356" x2="330" y2="368" stroke="#2dd4bf" strokeOpacity="0.4" strokeWidth="1" />
                  <text x="388" y="366" className="font-mono-blueprint" fontSize="11" fill="#64748b"><T k="landing.diagram.sales.metric" /></text>
                </g>

                {/* CRM */}
                <g>
                  <rect x="140" y="460" width="300" height="84" rx="2" fill="#101728" stroke="#fbbf24" strokeOpacity="0.5" strokeWidth="1.5" />
                  <text x="160" y="485" className="font-mono-blueprint" fontSize="10" letterSpacing="1.5" fill="#fbbf24" opacity="0.85">MOD.04</text>
                  <text x="160" y="513" className="font-display-blueprint" fontSize="20" fontWeight="600" fill="#f8fafc"><T k="landing.diagram.crm.title" /></text>
                  <text x="160" y="532" fontSize="11.5" fill="#94a3b8"><T k="landing.diagram.crm.desc" /></text>
                  <line x1="440" y1="502" x2="490" y2="502" stroke="#fbbf24" strokeOpacity="0.4" strokeWidth="1" />
                  <line x1="440" y1="496" x2="440" y2="508" stroke="#fbbf24" strokeOpacity="0.4" strokeWidth="1" />
                  <text x="498" y="506" className="font-mono-blueprint" fontSize="11" fill="#a1a1aa"><T k="landing.diagram.crm.metric" /></text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="moduller" className="border-b border-line-500/15 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 max-w-2xl">
              <h2 className="font-display-blueprint text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                <T k="landing.modules.heading" />
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-400">
                <T k="landing.modules.subheading" />
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px border border-line-500/15 bg-line-500/10 md:grid-cols-6">
              {modules.map((m) => (
                <div
                  key={m.code}
                  className={cn(
                    "group relative bg-ink-900 p-8 transition-colors duration-300 hover:bg-ink-800",
                    m.span
                  )}
                >
                  <CornerTicks className="border-line-500/30 transition-colors duration-300 group-hover:border-signal-400/60" />
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-mono-blueprint text-[11px] tracking-[0.2em] text-line-400/80">
                      {m.code}
                    </span>
                    <m.icon className="h-5 w-5 text-line-400/70 transition-colors duration-300 group-hover:text-signal-400" />
                  </div>
                  <h3 className="font-display-blueprint text-2xl font-semibold text-white"><T k={m.titleKey} /></h3>
                  <p className="mt-3 max-w-md leading-relaxed text-slate-400"><T k={m.bodyKey} /></p>
                  <div className="mt-8 border-t border-ink-600 pt-4 font-mono-blueprint text-[11px] tracking-wide text-slate-500">
                    <T k={m.noteKey} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process flow */}
        <section id="surec" className="border-b border-line-500/15 bg-ink-900/40 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 max-w-2xl">
              <h2 className="font-display-blueprint text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                <T k="landing.flow.heading" />
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-400">
                <T k="landing.flow.subheading" />
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:items-stretch">
              {flow.map((step, i) => (
                <div key={step.n} className="flex flex-1 md:flex-col">
                  <div className="flex flex-1 flex-col border border-line-500/15 bg-ink-950 p-6">
                    <span className="font-mono-blueprint text-xs tracking-widest text-signal-400">
                      {step.n}
                    </span>
                    <h3 className="mt-3 font-display-blueprint text-base font-semibold text-white">
                      <T k={step.titleKey} />
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400"><T k={step.bodyKey} /></p>
                  </div>
                  {i < flow.length - 1 && (
                    <div className="hidden w-8 shrink-0 items-center justify-center md:flex">
                      <div className="h-px w-full bg-line-500/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="guvenlik" className="border-b border-line-500/15 px-6 py-24">
          <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display-blueprint text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                <T k="landing.security.heading" />
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-400">
                <T k="landing.security.body" />
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {(
                [
                  { icon: Users, labelKey: "landing.security.adminSales" },
                  { icon: Lock, labelKey: "landing.security.rlsGate" },
                  { icon: Database, labelKey: "landing.security.data" },
                ] as { icon: typeof Users; labelKey: DictionaryKey }[]
              ).map((node, i) => (
                <div key={node.labelKey} className="flex items-center gap-3 sm:gap-6">
                  <div className="relative flex h-24 w-24 flex-col items-center justify-center border border-line-500/25 bg-ink-900 sm:h-28 sm:w-28">
                    <CornerTicks className="border-line-500/30" />
                    <node.icon className="h-7 w-7 text-line-400" />
                    <span className="mt-2 px-1 text-center font-mono-blueprint text-[9px] tracking-wide text-slate-500">
                      <T k={node.labelKey} />
                    </span>
                  </div>
                  {i < 2 && <div className="h-px w-6 bg-line-500/30 sm:w-10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden px-6 py-24">
          <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center border border-line-500/20 bg-ink-900/70 px-8 py-16 text-center">
            <CornerTicks className="border-signal-400/40" />
            <h2 className="font-display-blueprint text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              <T k="landing.cta.heading" />
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-400">
              <T k="landing.cta.body" />
            </p>
            <Link href="/login" className="mt-8">
              <Button className="h-12 rounded-sm border border-signal-400/40 bg-signal-500 px-8 text-base font-medium text-ink-950 hover:bg-signal-400">
                <T k="common.goToSystem" /> <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line-500/15">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-line-500/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="rounded-sm border border-line-500/40 bg-ink-800 p-1.5">
              <Hexagon className="h-4 w-4 text-line-400" />
            </div>
            <p className="text-sm text-slate-500">
              <T k="landing.footer.tagline" />
            </p>
          </div>
          <div className="flex items-center justify-between px-6 py-6 font-mono-blueprint text-xs text-slate-500 sm:justify-end sm:gap-8">
            <span>© {new Date().getFullYear()} Adapsis B2B SaaS</span>
            <span className="text-slate-600">REV 2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
