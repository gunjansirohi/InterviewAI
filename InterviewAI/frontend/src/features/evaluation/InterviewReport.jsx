import PerformanceSummary from "./PerformanceSummary";
import ScoreCard from "./ScoreCard";
import SkillRadarChart from "./SkillRadarChart";
import StrengthCard from "./StrengthCard";
import SuggestionsCard from "./SuggestionsCard";
import WeaknessCard from "./WeaknessCard";

export default function InterviewReport({ report }) {
  return (
    <div className="space-y-6">
      <PerformanceSummary report={report} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScoreCard label="Overall" score={report.overallScore} />
        <ScoreCard
          label="Technical"
          score={report.technicalScore}
          tone="emerald"
        />
        <ScoreCard
          label="Communication"
          score={report.communicationScore}
          tone="amber"
        />
        <ScoreCard label="Problem solving" score={report.problemSolvingScore} />
        <ScoreCard label="Confidence" score={report.confidenceScore ?? 0} tone="amber" />
        <ScoreCard label="Answer quality" score={report.answerQualityScore ?? 0} tone="emerald" />
      </div>
      {report.proctoringWarningCount > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-amber-950">
                Video monitoring summary
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                {report.proctoringWarningCount} warning(s) recorded during the
                interview.
              </p>
            </div>
            <span className="font-semibold text-amber-800">
              Score adjustment: {report.proctoringScoreAdjustment}
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-amber-900">
            {report.proctoringWarnings.map((warning, index) => (
              <li
                key={`${warning.type}-${index}`}
                className="rounded-lg bg-white/70 p-3"
              >
                {warning.message}{" "}
                <span className="text-amber-700">
                  (Question {warning.questionIndex + 1})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkillRadarChart scores={report} />
        <StrengthCard strengths={report.strengths} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <WeaknessCard weaknesses={report.weaknesses} />
        <SuggestionsCard suggestions={report.suggestions} />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled
          title="PDF export will be available in a future phase"
          className="cursor-not-allowed rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-400"
        >
          Download report (coming soon)
        </button>
      </div>
    </div>
  );
}
