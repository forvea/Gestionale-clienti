import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const expired = params.expired === "1";
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
            G
          </div>
          <h1 className="text-lg font-semibold">Gestionale</h1>
          <p className="text-sm text-neutral-500">Accedi con le credenziali del tuo salone</p>
        </div>
        {expired && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            La sessione è scaduta: accedi di nuovo.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
