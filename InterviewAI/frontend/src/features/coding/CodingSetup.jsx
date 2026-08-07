import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startCodingInterview } from './codingService';

const codingLanguages = [
  ['java', 'Java'], ['cpp', 'C++'], ['python', 'Python'], ['javascript', 'JavaScript'],
  ['c', 'C'], ['csharp', 'C#'], ['go', 'Go'],
];

const codingTopics = [
  'Arrays and Strings',
  'Linked List',
  'Stack and Queue',
  'Hashing',
  'Trees',
  'Binary Search',
  'Sorting',
  'Recursion',
  'Dynamic Programming',
  'Graphs',
  'Greedy Algorithms',
  'Backtracking',
  'Bit Manipulation',
];

export default function CodingSetup() {
  const [settings, setSettings] = useState({ language: 'javascript', difficulty: 'medium', topic: codingTopics[0], questionCount: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const update = ({ target }) => setSettings((current) => ({ ...current, [target.name]: target.name === 'questionCount' ? Number(target.value) : target.value }));
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const interviews = await startCodingInterview(settings);
      navigate(`/coding/interview/${interviews[0]._id}`, { state: { interview: interviews[0] } });
    } catch (requestError) {
      const serverMessage = requestError.response?.data?.message;
      setError(serverMessage || requestError.message || 'Unable to generate coding problems. Check that the local API is running.');
    } finally { setLoading(false); }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="font-semibold text-brand-600">Coding interview</p>
      <h1 className="mt-1 text-4xl font-bold text-slate-900">Configure your challenge</h1>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Select label="Language" name="language" value={settings.language} onChange={update}>
          {codingLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select label="Difficulty" name="difficulty" value={settings.difficulty} onChange={update}>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </Select>
        <Select label="Topic" name="topic" value={settings.topic} onChange={update} required>
          {codingTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
        </Select>
        <Select label="Question count" name="questionCount" value={settings.questionCount} onChange={update}>
          <option value="1">1 question</option><option value="2">2 questions</option><option value="3">3 questions</option>
        </Select>
        <button disabled={loading} className="w-full rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Generating secure coding challenge...' : 'Start coding interview'}</button>
      </form>
    </main>
  );
}

function Select({ label, children, ...props }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<select {...props} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">{children}</select></label>;
}
