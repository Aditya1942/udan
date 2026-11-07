import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export type PageHeaderProps = {
  title: ReactNode;
  /** Inline after the title (e.g. a StatusBadge). */
  titleExtra?: ReactNode;
  /** Muted line under the title. */
  subtitle?: ReactNode;
  /** Back link above the title, e.g. { to: '/admin/clients', label: 'Clients' }. */
  back?: { to: string; label: string };
  /** Right-aligned controls. */
  actions?: ReactNode;
  /** Below the title row (Tabs, filters). */
  children?: ReactNode;
};

/** Page H1 block. Pair with `useAdminTitle()` for the document title. */
export function PageHeader({ title, titleExtra, subtitle, back, actions, children }: PageHeaderProps) {
  return (
    <div className="adm-page-head">
      {back ? (
        <nav className="adm-crumbs" aria-label="Breadcrumb">
          <Link to={back.to}>
            <ChevronLeft aria-hidden="true" /> {back.label}
          </Link>
        </nav>
      ) : null}
      <div className="adm-page-head__row">
        <div className="adm-page-head__title">
          <h1 className="adm-h1">
            {title}
            {titleExtra}
          </h1>
          {subtitle ? <p className="adm-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="adm-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
