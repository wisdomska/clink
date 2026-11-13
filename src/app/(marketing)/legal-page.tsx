import Link from "next/link";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: React.ReactNode;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="an-screen mx-auto max-w-[720px] px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-16 md:px-8 md:pt-12">
      <Link href="/" className="display text-text hover:text-text text-[28px]">
        clink
      </Link>
      <h1 className="display mt-8 mb-2 text-[36px] leading-[1.05] md:text-[48px]">{title}</h1>
      <p className="mono text-faint m-0 text-xs">UPDATED {updated}</p>
      <div className="legal text-muted mt-8 flex flex-col gap-4 text-base leading-[1.6]">
        {children}
      </div>
    </main>
  );
}
