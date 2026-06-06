import { isAdmin } from "@/lib/auth";
import { adminLogoutAction } from "@/lib/actions";
import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) return <AdminLogin />;

  return (
    <div>
      <div
        className="sticky top-0 z-40 border-b-2"
        style={{
          borderColor: "var(--color-ink)",
          background: "rgba(251,246,236,0.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <AdminNav />
          <div className="flex items-center gap-2">
            <a href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex" target="_blank" rel="noreferrer">
              Ver tienda ↗
            </a>
            <form action={adminLogoutAction}>
              <button className="btn btn-ink btn-sm">Salir</button>
            </form>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
