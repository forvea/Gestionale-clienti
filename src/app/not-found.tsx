import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Non trovato</h1>
      <p className="text-sm text-neutral-500">L&apos;elemento richiesto non esiste o non appartiene al tuo salone.</p>
      <LinkButton variant="secondary" href="/agenda">
        Torna all&apos;agenda
      </LinkButton>
    </main>
  );
}
