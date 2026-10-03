import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/");
  const initials = (session.name ?? session.email ?? "ME")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
  return (
    <div>
      <Nav initials={initials} email={session.email} />
      <main>{children}</main>
    </div>
  );
}
