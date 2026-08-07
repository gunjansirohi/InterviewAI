import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview } from "./interviewService";

export default function InterviewSetup() {
  const [settings, setSettings] = useState({
    role: "",
    interviewType: "technical",
    difficulty: "medium",
    experienceLevel: "mid",
    questionCount: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const update = ({ target }) =>
    setSettings((current) => ({
      ...current,
      [target.name]:
        target.name === "questionCount" ? Number(target.value) : target.value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const interview = await startInterview(settings);
      const mode = event.nativeEvent.submitter?.value;
      const route =
        mode === "voice"
          ? `/voice-interview/${interview._id}`
          : mode === "video"
            ? `/video-interview/${interview._id}`
            : `/interview/${interview._id}`;
      navigate(route, { state: { interview } });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to start the interview. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="font-semibold text-brand-600">AI interview</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        Configure your interview
      </h1>
      <p className="mt-3 text-slate-600">
        Questions will be personalized using your latest resume analysis.
      </p>
      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Target role
          <input
            name="role"
            value={settings.role}
            onChange={update}
            required
            minLength={2}
            maxLength={100}
            placeholder="e.g. Frontend Developer"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-600"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Interview type"
            name="interviewType"
            value={settings.interviewType}
            onChange={update}
          >
            <option value="hr">HR</option>
            <option value="technical">Technical</option>
            <option value="dsa">DSA</option>
            <option value="project">Project Discussion</option>
            <option value="system-design">System Design</option>
          </Select>
          <Select
            label="Difficulty"
            name="difficulty"
            value={settings.difficulty}
            onChange={update}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>
        <Select
          label="Experience level"
          name="experienceLevel"
          value={settings.experienceLevel}
          onChange={update}
        >
          <option value="entry">Entry level</option>
          <option value="mid">Mid level</option>
          <option value="senior">Senior level</option>
        </Select>
        <Select
          label="Number of questions"
          name="questionCount"
          value={settings.questionCount}
          onChange={update}
        >
          <option value="3">3 questions</option>
          <option value="5">5 questions</option>
          <option value="10">10 questions</option>
        </Select>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            value="text"
            disabled={loading}
            className="rounded-lg border border-brand-600 px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating questions..." : "Start text interview"}
          </button>
          <button
            value="voice"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating questions..." : "Start voice interview"}
          </button>
          <button
            value="video"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating questions..." : "Start video interview"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        {...props}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand-600"
      >
        {children}
      </select>
    </label>
  );
}
