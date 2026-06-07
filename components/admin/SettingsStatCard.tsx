type SettingsStatCardProps = {
  title: string;
  value: number;
  note: string;
};

export default function SettingsStatCard({ title, value, note }: SettingsStatCardProps) {
  return (
    <div className="rounded-[1.7rem] border border-purple-500/20 bg-black/40 p-5 backdrop-blur-xl">
      <div className="text-sm font-bold text-white/45">{title}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
      <div className="mt-2 text-sm text-white/42">{note}</div>
    </div>
  );
}
