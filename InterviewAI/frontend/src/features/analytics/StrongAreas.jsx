import { AreaCard } from './WeakAreas';

export default function StrongAreas({ areas }) {
  return <AreaCard title="Strong areas" areas={areas} tone="emerald" empty="Complete evaluations to identify consistent strengths." />;
}
