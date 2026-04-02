interface FooterProps {
  lastUpdated?: string;
}

export function Footer({ lastUpdated }: FooterProps) {
  const authorName = process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "NiftyLens";
  const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "#";
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "#";

  const dateStr = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <footer
      style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      className="mt-16 py-8 px-4 text-center"
    >
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-text-secondary">
          <span>
            Made by{" "}
            <span className="text-text-primary font-medium">{authorName}</span>
          </span>
          <span className="text-text-muted">·</span>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan transition-colors"
          >
            LinkedIn
          </a>
          <span className="text-text-muted">·</span>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan transition-colors"
          >
            GitHub
          </a>
          <span className="text-text-muted">·</span>
          <a href="/methodology" className="hover:text-cyan transition-colors">
            Methodology &amp; Sources
          </a>
          <span className="text-text-muted">·</span>
          <span>Data as of {dateStr}</span>
        </div>
        <p className="text-xs text-text-muted">
          Not investment advice. For educational and analytical purposes only.
        </p>
      </div>
    </footer>
  );
}
