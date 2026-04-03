interface StalenessIndicatorProps {
  lastUpdated: string;
}

export function StalenessIndicator({ lastUpdated }: StalenessIndicatorProps) {
  const updatedDate = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let colorClass = "text-nifty-green";

  if (diffDays > 5) {
    colorClass = "text-nifty-red";
  } else if (diffDays > 2) {
    colorClass = "text-amber-accent";
  }

  const formattedDate = updatedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-0.5 text-xs min-w-0">
      <span className={`font-medium ${colorClass} truncate`}>
        Data as of {formattedDate}
      </span>
      <span className="text-text-muted hidden sm:block">
        Valuations: daily · FII/SIP data: monthly
      </span>
    </div>
  );
}
