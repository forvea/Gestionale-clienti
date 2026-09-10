import type { Metadata } from "next";
import { LinkButton, PageHeader } from "@/components/ui";
import { NewCustomerForm } from "./NewCustomerForm";

export const metadata: Metadata = { title: "Nuovo cliente" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader
        title="Nuovo cliente"
        actions={
          <LinkButton variant="secondary" href="/clienti">
            Annulla
          </LinkButton>
        }
      />
      <NewCustomerForm />
    </>
  );
}
