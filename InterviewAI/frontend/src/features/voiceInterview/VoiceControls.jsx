export default function VoiceControls({ recording, disabled, onStart, onStop }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={onStart} disabled={disabled || recording} className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
        {recording ? 'Recording...' : 'Start recording'}
      </button>
      <button type="button" onClick={onStop} disabled={disabled || !recording} className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
        Stop recording
      </button>
    </div>
  );
}
