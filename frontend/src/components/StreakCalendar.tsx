interface Cell {
  date: string;
  sessionCount: number;
  minutes: number;
}

export function StreakCalendar({ cells }: { cells: Cell[] }) {
  // 12 weeks × 7 days arranged in a vertical-week grid.
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div
      className="overflow-x-auto"
      role="img"
      aria-label="Activity calendar — past 12 weeks"
    >
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => {
              const intensity =
                cell.sessionCount === 0
                  ? 'bg-divider/50'
                  : cell.sessionCount === 1
                    ? 'bg-accent/40'
                    : cell.sessionCount === 2
                      ? 'bg-accent/70'
                      : 'bg-accent';
              return (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.sessionCount} session${cell.sessionCount === 1 ? '' : 's'}, ${cell.minutes} min`}
                  className={`h-3 w-3 rounded-sm ${intensity}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
