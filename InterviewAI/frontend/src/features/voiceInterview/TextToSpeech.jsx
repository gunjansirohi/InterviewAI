import { useCallback, useEffect, useState } from 'react';

export default function TextToSpeech({ text, autoPlay = true, onSpeakingChange }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const speak = useCallback(() => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => { setSpeaking(true); onSpeakingChange?.(true); };
    utterance.onend = () => { setSpeaking(false); onSpeakingChange?.(false); };
    utterance.onerror = () => { setSpeaking(false); onSpeakingChange?.(false); };
    window.speechSynthesis.speak(utterance);
  }, [supported, text, onSpeakingChange]);

  useEffect(() => {
    if (autoPlay) speak();
    return () => { if (supported) window.speechSynthesis.cancel(); onSpeakingChange?.(false); };
  }, [autoPlay, speak, supported]);

  if (!supported) return <p className="text-sm text-amber-700">Question playback is not supported by this browser.</p>;
  return <button type="button" onClick={speak} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{speaking ? 'Speaking...' : 'Replay question'}</button>;
}
