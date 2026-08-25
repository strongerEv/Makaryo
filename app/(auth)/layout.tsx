import { Brand } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary-soft to-transparent" />
      <main className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-10">
        <Brand className="mb-6 self-center" />
        {children}
      </main>
      <footer className="relative pb-6 text-center text-[12px] text-ink-muted">
        Makaryo · Manajemen host live streaming
      </footer>
    </div>
  );
}
