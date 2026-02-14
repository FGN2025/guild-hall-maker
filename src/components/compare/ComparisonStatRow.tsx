interface ComparisonStatRowProps {
  label: string;
  valueA: number | string;
  valueB: number | string;
  highlightHigher?: boolean;
  suffix?: string;
}

const ComparisonStatRow = ({ label, valueA, valueB, highlightHigher = true, suffix = "" }: ComparisonStatRowProps) => {
  const numA = typeof valueA === "number" ? valueA : parseFloat(valueA);
  const numB = typeof valueB === "number" ? valueB : parseFloat(valueB);
  const aWins = highlightHigher && !isNaN(numA) && !isNaN(numB) && numA > numB;
  const bWins = highlightHigher && !isNaN(numA) && !isNaN(numB) && numB > numA;

  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-border/50 last:border-0">
      <div className="text-right pr-4">
        <span className={`font-display text-lg font-bold ${aWins ? "text-primary" : "text-foreground"}`}>
          {valueA}{suffix}
        </span>
      </div>
      <div className="text-center">
        <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-left pl-4">
        <span className={`font-display text-lg font-bold ${bWins ? "text-primary" : "text-foreground"}`}>
          {valueB}{suffix}
        </span>
      </div>
    </div>
  );
};

export default ComparisonStatRow;
