import { ListCard } from './StrengthCard';

export default function WeaknessCard({ weaknesses }) {
  return <ListCard title="Areas to improve" items={weaknesses} color="text-amber-700" marker="•" empty="No specific weaknesses were identified." />;
}
