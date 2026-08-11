import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import InterviewResult from "../interview/InterviewResult";
import { getInterview } from "../interview/interviewService";
import TextToSpeech from "../voiceInterview/TextToSpeech";
import { transcribeRecording } from '../voiceInterview/voiceService';
import AIInterviewerAvatar from "../interview/AIInterviewerAvatar";
import {
  endVideoInterview,
  reportProctorWarning,
  requestFollowUp,
  saveVideoAnswer,
  skipVideoQuestion,
  uploadVideo,
} from "./videoService";

export default function VideoInterviewRoom() {
  const { id } = useParams();
  const location = useLocation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStoppedRef = useRef(null);
  const audioStopPromiseRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastWarningRef = useRef({});
  const noFaceSinceRef = useRef(null);
  const awayCountRef = useRef(0);
  const enteredFullscreenRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const responseActivityRef = useRef(Date.now());
  const terminationRef = useRef(false);
  const [interview, setInterview] = useState(location.state?.interview || null);
  const [transcript, setTranscript] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
  const [speaking, setSpeaking] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [endMessage, setEndMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [skipState, setSkipState] = useState('idle');
  useEffect(() => {
    if (interview) return;
    let active = true;
    getInterview(id)
      .then((value) => {
        if (active) setInterview(value);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              "Unable to load this interview.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, interview]);
  const answered = useMemo(
    () => new Set(interview?.answers.map((item) => item.questionIndex) || []),
    [interview],
  );
  const currentIndex =
    interview?.questions.findIndex((_item, index) => !answered.has(index)) ??
    -1;
  const complete = Boolean(interview) && currentIndex === -1;
  useEffect(() => {
    if (paused || complete) return undefined;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [paused, complete]);
  const warn = useCallback(
    (type, message) => {
      const now = Date.now();
      if (now - (lastWarningRef.current[type] || 0) < 10000) return;
      lastWarningRef.current[type] = now;
      setWarnings((items) => [...items, { type, message, time: now }]);
      const payload = {
        interviewId: id,
        warningType: type,
        message,
        questionIndex: Math.max(currentIndex, 0),
        severity: 'medium',
        timestamp: new Date().toISOString(),
      };
      console.info('[proctor-warning-payload]', { ...payload, messageLength: message?.length || 0 });
      reportProctorWarning(payload).catch((requestError) => {
        console.error('[proctor-warning-submit-failed]', { interviewId: id, warningType: type, status: requestError?.response?.status, message: requestError?.response?.data?.message || requestError?.message, requestId: requestError?.response?.data?.requestId });
        setError(requestError?.response?.data?.message || 'Unable to record the warning.');
      });
    },
    [id, currentIndex],
  );

  useEffect(() => {
    if (!interview || complete || sessionEnded) return undefined;
    responseActivityRef.current = Date.now();
    window.clearInterval(silenceTimerRef.current);
    silenceTimerRef.current = window.setInterval(() => {
      const idleDuration = Date.now() - responseActivityRef.current;
      if (idleDuration < 18000) return;
      const reason = transcript.trim() ? 'silence' : 'no_response';
      const message = transcript.trim()
        ? 'Warning: Long silence detected.'
        : 'Warning: No response after question.';
      warn(reason, message);
      responseActivityRef.current = Date.now();
    }, 5000);
    return () => window.clearInterval(silenceTimerRef.current);
  }, [complete, interview, sessionEnded, transcript, warn]);
  useEffect(() => {
    if (!cameraReady) return undefined;
    const visibility = () => {
      if (document.hidden)
        warn("tab_switch", "Warning: Tab switching detected.");
    };
    const fullscreenChange = () => {
      const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setFullscreen(active);
      if (!active && enteredFullscreenRef.current)
        warn("fullscreen_exit", "Warning: Please stay in fullscreen mode.");
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreenChange);
    document.addEventListener("webkitfullscreenchange", fullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreenChange);
      document.removeEventListener("webkitfullscreenchange", fullscreenChange);
    };
  }, [cameraReady, warn]);
  useEffect(() => {
    if (!cameraReady || !window.FaceDetector) return undefined;
    const detector = new window.FaceDetector({
      fastMode: true,
      maxDetectedFaces: 3,
    });
    const timer = setInterval(async () => {
      try {
        const faces = await detector.detect(videoRef.current);
        if (faces.length > 1)
          warn("multiple_faces", "Warning: Multiple faces detected.");
        if (!faces.length) {
          noFaceSinceRef.current ||= Date.now();
          if (Date.now() - noFaceSinceRef.current > 10000)
            warn(
              "no_face",
              "Warning: No face detected. Please return to the interview.",
            );
        } else {
          noFaceSinceRef.current = null;
          const box = faces[0].boundingBox;
          const offCenter =
            Math.abs(box.x + box.width / 2 - videoRef.current.videoWidth / 2) >
            videoRef.current.videoWidth * 0.3;
          awayCountRef.current = offCenter ? awayCountRef.current + 1 : 0;
          if (awayCountRef.current >= 3)
            warn(
              "looking_away",
              "Warning: Please stay focused on the interview screen.",
            );
        }
      } catch {
        /* frame unavailable */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [cameraReady, warn]);
  useEffect(
    () => () => {
      window.clearInterval(silenceTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        Promise.resolve(exit?.call(document)).catch(() => undefined);
      }
    },
    [],
  );
  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      console.info('[video-media-permission-granted]', {
        audioTracks: stream.getAudioTracks().map((track) => ({ enabled: track.enabled, state: track.readyState })),
        videoTracks: stream.getVideoTracks().map((track) => ({ enabled: track.enabled, state: track.readyState })),
      });
      setCameraReady(true);
    } catch (cause) {
      setError(
        cause.name === "NotAllowedError"
          ? "Camera or microphone permission was denied."
          : "Unable to start the camera and microphone.",
      );
    }
  };
  const toggleFullscreen = () => {
    setError("");
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    const target = active ? document : document.documentElement;
    const method = active
      ? document.exitFullscreen || document.webkitExitFullscreen
      : document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    if (!method) {
      setError("Fullscreen is not supported by this browser.");
      return;
    }
    if (!active) enteredFullscreenRef.current = true;
    const operation = method.call(target);
    Promise.resolve(operation).catch(() => setError("Unable to change fullscreen mode. Use the fullscreen button and try again."));
  };
  const stopStreams = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      Promise.resolve(exit?.call(document)).catch(() => undefined);
    }
  }, []);

  const finalizeSession = useCallback(async (message, autoTerminated = false) => {
    if (terminationRef.current) return;
    terminationRef.current = true;
    setSessionEnded(true);
    setEndMessage(message);
    stopStreams();
    setBusy(true);
    try {
      const endedInterview = await endVideoInterview(id, { autoTerminated });
      setInterview(endedInterview);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to end the interview.');
    } finally {
      setBusy(false);
    }
  }, [id, stopStreams]);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || !stream.active || !stream.getVideoTracks().some((track) => track.readyState === 'live')) {
      setError('Your camera stream is not ready. Start the camera and try recording again.');
      return;
    }
    if (!stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled)) {
      setError('Microphone audio not detected. Allow microphone access and try recording again.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('Video recording is not supported by this browser.');
      return;
    }
    const mimeType = getSupportedRecordingMimeType();
    let recorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (cause) {
      console.error('[video-recording-init-failed]', { message: cause?.message, mimeType, streamActive: stream.active });
      setError('Unable to initialize video recording. Please try a supported browser.');
      return;
    }
    chunksRef.current = [];
    audioChunksRef.current = [];
    setError('');
    setVideoUrl('');
    setTranscript('');
    recorder.ondataavailable = ({ data }) => {
      if (data?.size > 0) {
        chunksRef.current.push(data);
        console.debug('[video-recording-chunk]', { bytes: data.size, chunkCount: chunksRef.current.length });
      }
    };
    recorder.onstop = async () => {
      setRecording(false);
      setBusy(true);
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      try {
        const finalMimeType = recorder.mimeType || mimeType || 'video/webm';
        const videoBlob = new Blob(chunksRef.current, { type: finalMimeType });
        console.info('[video-recording-finalized]', { bytes: videoBlob.size, chunkCount: chunksRef.current.length, mimeType: finalMimeType });
        if (videoBlob.size === 0) {
          setError('No video data was captured. Confirm camera access, record for a few seconds, and try again.');
          return;
        }
        await Promise.race([
          audioStopPromiseRef.current || Promise.resolve(),
          new Promise((resolve) => window.setTimeout(resolve, 2000)),
        ]);
        const audioRecorder = audioRecorderRef.current;
        const audioMimeType = audioRecorder?.mimeType || getSupportedAudioMimeType() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: audioMimeType });
        console.info('[video-audio-recording-finalized]', { bytes: audioBlob.size, chunkCount: audioChunksRef.current.length, mimeType: audioMimeType });
        if (audioBlob.size === 0) {
          setError('Microphone audio not detected. Record your response again after allowing microphone access.');
          return;
        }
        const [uploadedVideoUrl, transcription] = await Promise.all([uploadVideo(videoBlob), transcribeRecording(audioBlob)]);
        if (!transcription.transcript?.trim()) {
          setError('Transcription failed. No speech was recognized in the recording.');
          return;
        }
        setVideoUrl(uploadedVideoUrl);
        setTranscript(transcription.transcript.trim());
      } catch (requestError) {
        setError(
          requestError.response?.data?.code === 'TRANSCRIPTION_TIMEOUT'
            ? 'Transcription failed because the service timed out. Please record again.'
            : `Transcription failed: ${requestError.response?.data?.message || requestError.message || 'Unable to process the recorded audio.'}`,
        );
      } finally {
        setBusy(false);
      }
    };
    recorder.onerror = (event) => {
      console.error('[video-recording-failed]', { message: event.error?.message, name: event.error?.name });
      setError('Video recording failed. Please record your response again.');
    };
    let audioRecorder;
    try {
      const audioStream = new MediaStream(stream.getAudioTracks());
      const audioMimeType = getSupportedAudioMimeType();
      audioRecorder = new MediaRecorder(audioStream, audioMimeType ? { mimeType: audioMimeType } : undefined);
      audioRecorder.ondataavailable = ({ data }) => {
        if (data?.size > 0) {
          audioChunksRef.current.push(data);
          responseActivityRef.current = Date.now();
        }
      };
      audioRecorder.onstop = () => audioStoppedRef.current?.();
      audioRecorder.onerror = (event) => console.error('[video-audio-recording-failed]', { message: event.error?.message, name: event.error?.name });
      audioRecorder.start(1000);
      audioRecorderRef.current = audioRecorder;
      responseActivityRef.current = Date.now();
    } catch (cause) {
      console.error('[video-audio-recording-init-failed]', { message: cause?.message });
      setError('Microphone audio not detected. Check microphone permission and try again.');
      return;
    }
    const BrowserRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (BrowserRecognition) {
      const recognition = new BrowserRecognition();
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let text = "";
        for (
          let index = event.resultIndex;
          index < event.results.length;
          index += 1
        )
          if (event.results[index].isFinal)
            text += `${event.results[index][0].transcript} `;
        if (text) setTranscript((value) => `${value} ${text}`.trim());
      };
      recognition.onerror = () => undefined;
      recognition.start();
      recognitionRef.current = recognition;
    }
    try {
      recorder.start(1000);
    } catch (cause) {
      console.error('[video-recording-start-failed]', { message: cause?.message, mimeType: recorder.mimeType });
      if (audioRecorder.state !== 'inactive') audioRecorder.stop();
      setError('Unable to start video recording. Please try again.');
      return;
    }
    recorderRef.current = recorder;
    console.info('[video-recording-started]', { videoMimeType: recorder.mimeType, audioMimeType: audioRecorder.mimeType, audioTrackCount: stream.getAudioTracks().length });
    setRecording(true);
  };
  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      // Flush the final segment before stop so short recordings do not rely on
      // the browser's periodic data event timing.
      recorder.requestData?.();
      const audioRecorder = audioRecorderRef.current;
      if (audioRecorder?.state === 'recording') {
        audioStopPromiseRef.current = new Promise((resolve) => { audioStoppedRef.current = resolve; });
        audioRecorder.requestData?.();
        audioRecorder.stop();
      }
      recorder.stop();
      console.info('[video-recording-stopped]', { videoState: recorder.state, audioState: audioRecorder?.state });
    } catch (cause) {
      console.error('[video-recording-stop-failed]', { message: cause?.message, state: recorder.state });
      setError('Unable to finalize the video recording. Please record again.');
      setRecording(false);
    }
  };
  const submit = async () => {
    if (!transcript.trim() || !videoUrl) {
      setError('Transcription failed. Record a video response with audible speech before submitting.');
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await saveVideoAnswer({
        interviewId: id,
        questionIndex: currentIndex,
        transcript,
        videoUrl,
      });
      console.info('[video-answer-submit]', { interviewId: id, questionIndex: currentIndex, transcriptCharacters: transcript.trim().length, hasVideo: Boolean(videoUrl) });
      setInterview(
        await requestFollowUp({
          interviewId: id,
          questionIndex: currentIndex,
        }).catch(() => updated),
      );
      setTranscript("");
      setVideoUrl("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "AI evaluation failed. Unable to save the video answer.",
      );
    } finally {
      setBusy(false);
    }
  };
  const togglePause = () => {
    const next = !paused;
    streamRef.current?.getTracks().forEach((track) => {
      track.enabled = !next;
    });
    if (recording && next) recorderRef.current?.pause?.();
    if (!next && recorderRef.current?.state === "paused")
      recorderRef.current.resume();
    setPaused(next);
  };
  const endSession = async () => {
    if (showConfirm) {
      setShowConfirm(false);
      setBusy(true);
      setError("");
      try {
        if (recording) stopRecording();
        await finalizeSession("Interview ended successfully.", false);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to end the interview.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setShowConfirm(true);
  };

  const skipQuestion = async () => {
    if (!interview || currentIndex < 0 || busy) return;
    setBusy(true);
    setSkipState('loading');
    setError('');
    try {
      const question = interview.questions[currentIndex];
      const response = await skipVideoQuestion({ interviewId: id, questionIndex: currentIndex, questionId: question?._id || question?.question, reason: 'candidate_skipped' });
      setInterview(response.interview);
      const answeredKeys = new Set((response.interview?.answers || []).map((item) => Number(item.questionIndex)));
      const hasRemainingQuestions = response.interview?.questions?.some((_, index) => !answeredKeys.has(index));
      if (!hasRemainingQuestions) {
        await finalizeSession('Interview completed after the last question was skipped.', false);
        return;
      }
      setSkipState('success');
      setShowSkipConfirm(false);
      setTimeout(() => setSkipState('idle'), 1800);
    } catch (requestError) {
      setSkipState('idle');
      setError(requestError?.message || requestError?.response?.data?.message || 'Unable to skip the question.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!warnings.length || sessionEnded || terminationRef.current) return;
    if (warnings.length >= 5) {
      void finalizeSession('Interview ended automatically due to multiple warnings.', true);
    }
  }, [finalizeSession, sessionEnded, warnings.length]);

  if (!interview) return error ? <PageError message={error} /> : <Loader />;
  if (complete || sessionEnded)
    return (
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        {endMessage && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            {endMessage}
          </div>
        )}
        <InterviewResult interview={interview} />
      </section>
    );
  const question = interview.questions[currentIndex];
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-600">AI Video Interviewer</p>
          <h1 className="text-3xl font-bold">{interview.role}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            Warning {Math.min(warnings.length, 5)}/5
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={togglePause} disabled={!cameraReady || busy} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50">
          {paused ? "Resume interview" : "Pause interview"}
        </button>
        <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">
          {fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        </button>
        <button type="button" onClick={() => setShowSkipConfirm((value) => !value)} disabled={busy || currentIndex < 0} className="rounded-lg border border-slate-400 px-4 py-2 font-semibold text-slate-700 disabled:opacity-50">
          Skip question
        </button>
        <button type="button" onClick={endSession} disabled={busy || !interview.answers.length} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-50">
          End interview
        </button>
      </div>
      {showConfirm && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Are you sure you want to end the interview?</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => setShowConfirm(false)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={() => endSession()} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
              Confirm end
            </button>
          </div>
        </div>
      )}
      {showSkipConfirm && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Are you sure you want to skip this question?</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => setShowSkipConfirm(false)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
              Continue answering
            </button>
            <button type="button" onClick={skipQuestion} disabled={skipState === 'loading'} className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
              {skipState === 'loading' ? 'Skipping...' : 'Skip question'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"
        >
          {error}
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl bg-slate-950">
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-video w-full object-cover"
          />
          {!cameraReady && (
            <button
              type="button"
              onClick={startCamera}
              className="m-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white"
            >
              Start camera and monitoring
            </button>
          )}
          <div className="flex gap-3 p-5">
            {cameraReady && !recording && (
              <button
                type="button"
                onClick={startRecording}
                disabled={busy}
                className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white"
              >
                Record response
              </button>
            )}
            {recording && (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-lg bg-white px-5 py-3 font-semibold text-red-700"
              >
                Stop recording
              </button>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5"><AIInterviewerAvatar speaking={speaking} compact /></div>
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-brand-600">
              Question {currentIndex + 1} of {interview.questions.length}
            </span>
            <TextToSpeech text={question.question} onSpeakingChange={setSpeaking} />
          </div>
          {skipState === 'success' && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              Question skipped. Moving to the next question...
            </div>
          )}
          <h2 className="mt-5 text-2xl font-bold">{question.question}</h2>
          <label className="mt-6 block text-sm font-medium">
            Response transcript
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={7}
              maxLength={10000}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3"
              placeholder="Speech transcript appears here; review or type it manually."
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={busy || recording || !videoUrl || !transcript.trim()}
            className="mt-4 w-full rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving..." : "Submit and continue"}
          </button>
        </section>
      </div>
      {warnings.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-900">Monitoring alerts</h3>
          <p className="mt-1 text-sm text-amber-700">
            {warnings.length >= 5
              ? 'Interview will end automatically after the next warning.'
              : `Warning ${warnings.length}/5: ${warnings.at(-1)?.message}`}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {warnings.slice(-5).map((warning) => (
              <li key={`${warning.type}-${warning.time}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function getSupportedRecordingMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function getSupportedAudioMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function PageError({ message }) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
        {message}
      </div>
    </div>
  );
}
