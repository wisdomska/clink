import Link from "@/components/ui/link";
import { Logo } from "@/components/brand/logo";

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
      <Link href="/" className="text-text hover:text-text inline-flex">
        <Logo size={22} />
      </Link>
      <h1 className="display mt-10 mb-2 text-[36px] leading-[1.05] md:text-[48px]">{title}</h1>
      <p className="text-faint m-0 text-sm">Updated {updated}</p>
      <div className="legal text-muted mt-8 flex flex-col gap-4 text-base leading-[1.6]">
        {children}
      </div>
    </main>
  );
}
