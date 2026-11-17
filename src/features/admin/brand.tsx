"use client";
import { useState } from "react";
import { Heart, ChatCircle, GameController, Sparkle } from "@phosphor-icons/react";
import { Display, Lead, Mono, SectionTitle } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Segmented } from "@/components/ui/segmented";
import { Input, Label } from "@/components/ui/field";
import { Logo, LogoMark, Wordmark } from "@/components/brand/logo";
import { AdminPage } from "./list";

const BRAND = [
  { name: "Rouge", hex: "#FF4F7B", token: "--rouge", role: "Primary action, you" },
  { name: "Ember", hex: "#FF5A3C", token: "--ember", role: "Heat, After Dark" },
  { name: "Lilac", hex: "#B9A4FF", token: "--lilac", role: "Your partner" },
  { name: "Champagne", hex: "#FFD08A", token: "--champagne", role: "Sparks, wins" },
  { name: "Blush", hex: "#FFB3C4", token: "--blush", role: "Soft highlights" },
];

const SURFACES = [
  { name: "Night", hex: "#0A0609", token: "--bg-page" },
  { name: "App", hex: "#120C10", token: "--bg-app" },
  { name: "Plum 1", hex: "#1B1318", token: "--surface-1" },
  { name: "Plum 2", hex: "#251A21", token: "--surface-2" },
  { name: "Plum 3", hex: "#31232C", token: "--surface-3" },
  { name: "Line", hex: "#3D2C36", token: "--line" },
];

const STATUS = [
  { name: "Online", hex: "#34C759", token: "--online" },
  { name: "End call", hex: "#FF3B30", token: "--end-call" },
  { name: "Danger", hex: "#FF7A6B", token: "--danger" },
];

const TYPE = [
  { size: 64, use: "Landing hero" },
  { size: 48, use: "Big moments, sign in" },
  { size: 36, use: "Screen titles" },
  { size: 28, use: "Section titles, numbers" },
  { size: 22, use: "Card titles" },
] as const;

const BODY = [
  { cls: "text-base", px: 16, use: "Body and inputs (never smaller)" },
  { cls: "text-[15px]", px: 15, use: "Secondary lines" },
  { cls: "text-[13px]", px: 13, use: "Captions, meta" },
  { cls: "mono text-[11px] uppercase tracking-[.12em]", px: 11, use: "Mono labels" },
];

const RADII = [
  { token: "rounded-card", px: 20, use: "Cards, sheets" },
  { token: "rounded-ticket", px: 16, use: "Tickets, media" },
  { token: "rounded-input", px: 14, use: "Inputs, chips in grids" },
  { token: "rounded-thumb", px: 12, use: "Thumbnails, small tiles" },
  { token: "rounded-flap", px: 6, use: "Tags, checkboxes" },
  { token: "rounded-full", px: 999, use: "Buttons, pills, avatars" },
];

function Swatch({
  name,
  hex,
  token,
  role,
}: {
  name: string;
  hex: string;
  token: string;
  role?: string;
}) {
  return (
    <li className="border-line bg-s1 rounded-card flex flex-col overflow-hidden border">
      <span className="h-20 w-full" style={{ background: `var(${token})` }} aria-hidden />
      <span className="flex flex-col gap-0.5 p-3">
        <span className="font-bold">{name}</span>
        <Mono className="text-muted">
          {token}
          {hex && ` · ${hex}`}
        </Mono>
        {role && <span className="text-muted text-[13px]">{role}</span>}
      </span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

/** The living brand sheet: every swatch, size and control here is the real token or component. */
export function AdminBrand() {
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<"one" | "two">("one");
  return (
    <AdminPage>
      <header className="flex flex-col gap-2">
        <Display>Brand</Display>
        <Lead>
          The live Clink brand. Everything below renders from the same tokens and components the app
          uses, so if it looks wrong here, it looks wrong everywhere. The written rules are in
          docs/BRAND.md.
        </Lead>
      </header>

      <Section title="Logo">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border-line bg-s1 rounded-card flex h-40 items-center justify-center border">
            <LogoMark size={72} />
          </div>
          <div className="border-line bg-s1 rounded-card flex h-40 items-center justify-center border">
            <Wordmark size={44} />
          </div>
          <div className="border-line bg-s1 rounded-card flex h-40 items-center justify-center border">
            <Logo size={40} />
          </div>
        </div>
      </Section>

      <Section title="Brand colours">
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-5">
          {BRAND.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-card h-16" style={{ background: "var(--brand-gradient)" }} />
          <div
            className="rounded-card h-16"
            style={{ background: "var(--brand-gradient-romance)" }}
          />
        </div>
      </Section>

      <Section title="Surfaces and status">
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-6">
          {SURFACES.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </ul>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
          {STATUS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="border-line bg-s1 rounded-card flex flex-col divide-y divide-[var(--line)] border">
          {TYPE.map((t) => (
            <div key={t.size} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <Display as="p" size={t.size}>
                Clink with me
              </Display>
              <Mono className="text-muted">
                Display {t.size} · {t.use}
              </Mono>
            </div>
          ))}
          {BODY.map((b) => (
            <div key={b.px} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <span className={b.cls}>Are you free at eight?</span>
              <Mono className="text-muted">
                {b.px}px · {b.use}
              </Mono>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shape">
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-6">
          {RADII.map((r) => (
            <li key={r.token} className="flex flex-col gap-2">
              <span className={`bg-s3 border-line h-20 border ${r.token}`} aria-hidden />
              <Mono>{r.token}</Mono>
              <span className="text-muted text-[13px]">
                {r.px === 999 ? "Pill" : `${r.px}px`} · {r.use}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Icons">
        <p className="text-muted m-0 text-[15px]">
          Phosphor only. Bold for controls, fill for the selected state, duotone for big
          illustrative icons, regular for resting tab icons.
        </p>
        <div className="flex flex-wrap gap-6">
          {(["bold", "fill", "duotone", "regular"] as const).map((w) => (
            <div key={w} className="flex flex-col items-center gap-2">
              <span className="text-accent flex gap-2">
                <Heart size={28} weight={w} aria-hidden />
                <ChatCircle size={28} weight={w} aria-hidden />
                <GameController size={28} weight={w} aria-hidden />
                <Sparkle size={28} weight={w} aria-hidden />
              </span>
              <Mono className="text-muted">{w}</Mono>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Controls">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" size="md">
              Danger
            </Button>
            <Button variant="accent-text" size="sm">
              Text link
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="border-line bg-s1 rounded-card border">
              <Toggle
                checked={on}
                onChange={setOn}
                label="A toggle"
                sub="Bold label, muted line"
                last
              />
            </div>
            <Segmented
              label="A segmented control"
              options={[
                { value: "one", label: "One" },
                { value: "two", label: "Two" },
              ]}
              value={seg}
              onChange={setSeg}
            />
            <div>
              <Label htmlFor="brand-input">An input</Label>
              <Input id="brand-input" placeholder="Type here" />
            </div>
          </div>
        </div>
      </Section>
    </AdminPage>
  );
}
