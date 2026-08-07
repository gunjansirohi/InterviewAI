import { useEffect, useRef, useState } from 'react';
import VoiceControls from './VoiceControls';

function preferredMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return options.find((type) => window.MediaRecorder?.isTypeSupported(type)) || '';
}

export default function AudioRecorder({ onRecorded, onError, disabled = false }) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const browserTranscriptRef = useRef('');
  const mountedRef = useRef(true);
  const [recording, setRecording] = useState(false);

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    mountedRef.current = false;
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      if (recorderRef.current.state === 'recording') recorderRef.current.stop();
    }
    releaseMicrophone();
    recognitionRef.current?.stop();
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      onError('Audio recording is not supported by this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      browserTranscriptRef.current = '';
      if (BrowserSpeechRecognition) {
        const recognition = new BrowserSpeechRecognition();
        let finalTranscript = '';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const text = event.results[index][0].transcript;
            if (event.results[index].isFinal) finalTranscript += `${text} `;
            else interimTranscript += `${text} `;
          }
          browserTranscriptRef.current = `${finalTranscript}${interimTranscript}`.trim();
        };
        recognition.onerror = () => undefined;
        recognition.start();
        recognitionRef.current = recognition;
      }
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = ({ data }) => { if (data.size) chunksRef.current.push(data); };
      recorder.onerror = () => onError('The audio recorder encountered an error.');
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const recognition = recognitionRef.current;
        if (recognition) {
          await new Promise((resolve) => {
            let finished = false;
            const finish = () => {
              if (finished) return;
              finished = true;
              resolve();
            };
            recognition.onend = finish;
            try { recognition.stop(); } catch { finish(); }
            window.setTimeout(finish, 1000);
          });
        }
        recognitionRef.current = null;
        releaseMicrophone();
        if (!mountedRef.current) return;
        setRecording(false);
        if (blob.size) onRecorded(blob, browserTranscriptRef.current.trim());
        else onError('The recording was empty. Please try again.');
      };
      recorder.start(250);
      setRecording(true);
    } catch (error) {
      releaseMicrophone();
      if (error.name === 'NotAllowedError') onError('Microphone permission was denied. Allow microphone access and try again.');
      else if (error.name === 'NotFoundError') onError('No microphone was found.');
      else onError('Unable to access the microphone.');
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  return <VoiceControls recording={recording} disabled={disabled} onStart={start} onStop={stop} />;
}
