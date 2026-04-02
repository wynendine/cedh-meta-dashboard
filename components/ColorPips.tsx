const COLOR_MAP: Record<string, { bg: string; label: string }> = {
  W: { bg: "#f9fafb", label: "White" },
  U: { bg: "#3b82f6", label: "Blue" },
  B: { bg: "#1f2937", label: "Black" },
  R: { bg: "#ef4444", label: "Red" },
  G: { bg: "#22c55e", label: "Green" },
};

const COLOR_ORDER = ["W", "U", "B", "R", "G"];

interface ColorPipsProps {
  colorId: string;
}

export default function ColorPips({ colorId }: ColorPipsProps) {
  if (!colorId || colorId === "C") {
    return (
      <div className="flex items-center gap-0.5">
        <span
          className="inline-block w-4 h-4 rounded-full border border-gray-500 bg-gradient-to-br from-gray-600 to-gray-800"
          title="Colorless"
        />
      </div>
    );
  }

  const colors = COLOR_ORDER.filter((c) => colorId.toUpperCase().includes(c));

  return (
    <div className="flex items-center gap-0.5">
      {colors.map((c) => {
        const { bg, label } = COLOR_MAP[c];
        return (
          <span
            key={c}
            className="inline-block w-4 h-4 rounded-full border border-black/30"
            style={{ backgroundColor: bg }}
            title={label}
          />
        );
      })}
    </div>
  );
}
