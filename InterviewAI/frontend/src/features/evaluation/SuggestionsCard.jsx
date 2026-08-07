import { ListCard } from './StrengthCard';

export default function SuggestionsCard({ suggestions }) {
  return <ListCard title="Recommended next steps" items={suggestions} color="text-brand-700" marker="→" empty="No additional suggestions were provided." />;
}
