import { Link } from "react-router-dom";

export function MarketingFooter() {
  return (
    <footer className="mt-12 border-t border-ink-200 pt-6">
      <div className="flex flex-wrap gap-2 text-xs font-medium text-ink-800">
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/resources">
          Resources
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/resources/trade-journal-system">
          Trade Journal Guide
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/resources/weekly-review-playbook">
          Weekly Review Playbook
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/resources/risk-journal-checklist">
          Risk Checklist
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/about">
          About
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/contact">
          Contact
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/privacy">
          Privacy
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/terms">
          Terms
        </Link>
        <Link className="rounded-full border border-ink-200 px-3 py-1 hover:bg-ink-100" to="/editorial-policy">
          Editorial Policy
        </Link>
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-700">
        Tradevera is journaling and analytics software for trading performance review. Not financial advice. Last content update: February 28, 2026.
      </p>
    </footer>
  );
}
