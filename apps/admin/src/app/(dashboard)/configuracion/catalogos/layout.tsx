/**
 * MEKANOS S.A.S - Portal Admin
 * Layout para módulo de Catálogos
 * 
 * Nota: La navegación entre catálogos se hace desde el Sidebar principal.
 * Este layout solo envuelve el contenido sin duplicar navegación.
 */

export default function CatalogosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-6">
            {children}
        </div>
    );
}
