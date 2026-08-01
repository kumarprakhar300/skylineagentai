import { useCallback, useEffect, useRef, useState } from "react";
import { Languages, Loader2, Mic, PhoneCall, PhoneOff, Radio, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceText } from "@/components/ConfidenceText";
import { SpeakerLabel } from "@/components/SpeakerLabel";
import { languageOptions, type SpokenLanguage } from "@/lib/agent/language";
import type { ConfidenceSegment } from "@/lib/agent/confidence";
import { emptyLead, leadFieldLabels, type LeadFields, type Turn } from "@/lib/agent/prompt";
import type { LeadScore } from "@/lib/agent/score";
import { startRecording, type RecorderHandle } from "@/lib/audio";
import { cn } from "@/lib/utils";

type Phase = "idle" | "connecting" | "speaking" | "listening" | "thinking" | "saving" | "ended";

const phaseLabel: Record<Phase, string> = {
  idle: "Ready to call",
  connecting: "Connecting…",
  speaking: "Aarav is speaking",
  listening: "Listening — please speak",
  thinking: "Thinking…",
  saving: "Wrapping up the call",
  ended: "Call ended",
};

export function VoiceCall() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [lead, setLead] = useState<LeadFields>(emptyLead);
  const [summary, setSummary] = useState<string | null>(null);
  const [score, setScore] = useState<LeadScore | null>(null);
  const [choice, setChoice] = useState<SpokenLanguage>("auto");
  const [language, setLanguage] = useState<string>("hinglish");

  const transcriptRef = useRef<Turn[]>([]);
  const leadRef = useRef<LeadFields>(emptyLead);
  const languageRef = useRef("hinglish");
  const choiceRef = useRef<SpokenLanguage>("auto");
  const recorderRef = useRef<RecorderHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  /** Audio kept per customer turn index so low-confidence parts can be re-transcribed. */
  const audioByTurnRef = useRef<Map<number, Blob>>(new Map());
  const [retryingTurn, setRetryingTurn] = useState<number | null>(null);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, phase]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      activeRef.current = false;
      cleanupAudio();
      void recorderRef.current?.stop();
    },
    [cleanupAudio],
  );

  const push = useCallback((turn: Turn) => {
    transcriptRef.current = [...transcriptRef.current, turn];
    setTranscript(transcriptRef.current);
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not generate the voice reply");
      }
      const blob = await res.blob();
      if (!activeRef.current) return;

      await new Promise<void>((resolve) => {
        const audio = new Audio(URL.createObjectURL(blob));
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
      cleanupAudio();
    },
    [cleanupAudio],
  );

  // Forward declaration through a ref so listen/handleUserSpeech can call each other.
  const listenRef = useRef<() => Promise<void>>(async () => {});

  const runAgentTurn = useCallback(
    async (userText: string) => {
      setPhase("thinking");
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: transcriptRef.current,
          userText,
          language: choiceRef.current,
        }),

      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "The agent could not respond");
      }
      const data = (await res.json()) as {
        reply: string;
        language: string;
        lead: LeadFields;
        shouldEnd: boolean;
      };
      if (!activeRef.current) return;

      leadRef.current = data.lead;
      setLead(data.lead);
      languageRef.current = data.language;
      setLanguage(data.language);
      push({ role: "assistant", content: data.reply });

      setPhase("speaking");
      await speakText(data.reply);
      if (!activeRef.current) return;

      if (data.shouldEnd) {
        void endCall();
      } else {
        void listenRef.current();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [push, speakText],
  );

  const listen = useCallback(async () => {
    if (!activeRef.current) return;
    setPhase("listening");
    try {
      const recorder = await startRecording({
        silenceMs: 1500,
        onSilence: () => {
          void stopListeningAndSend();
        },
      });
      recorderRef.current = recorder;
    } catch {
      toast.error("Microphone access is needed for the call.");
      setPhase("idle");
      activeRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  listenRef.current = listen;

  const stopListeningAndSend = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || !activeRef.current) return;
    recorderRef.current = null;
    setPhase("thinking");

    try {
      const spokenMs = recorder.spokenMs();
      const blob = await recorder.stop();
      // Too short / silence only: keep listening instead of sending noise to the model.
      if (blob.size < 8000 || spokenMs < 300) {
        void listenRef.current();
        return;
      }

      const form = new FormData();
      form.append("audio", new File([blob], "recording.wav", { type: "audio/wav" }));
      form.append("language", choiceRef.current);
      const res = await fetch("/api/stt", { method: "POST", body: form });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not understand the audio");
      }
      const { text, segments } = (await res.json()) as {
        text: string;
        segments?: ConfidenceSegment[];
      };
      if (!activeRef.current) return;

      if (!text.trim()) {
        void listenRef.current();
        return;
      }

      audioByTurnRef.current.set(transcriptRef.current.length, blob);
      push({ role: "user", content: text, segments });
      await runAgentTurn(text);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      if (activeRef.current) void listenRef.current();
    }
  }, [push, runAgentTurn]);

  const retranscribe = useCallback(
    async (index: number) => {
      const blob = audioByTurnRef.current.get(index);
      if (!blob) {
        toast.error("That audio is no longer available to re-transcribe.");
        return;
      }
      setRetryingTurn(index);
      try {
        const form = new FormData();
        form.append("audio", new File([blob], "recording.wav", { type: "audio/wav" }));
        form.append("language", choiceRef.current);
        form.append("quality", "high");
        // Neighbouring turns give the decoder context for names, areas and budgets.
        const context = transcriptRef.current
          .slice(Math.max(0, index - 2), index)
          .map((turn) => turn.content)
          .join(" ");
        if (context) form.append("hint", context);

        const res = await fetch("/api/stt", { method: "POST", body: form });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not re-transcribe that audio");
        }
        const { text, segments } = (await res.json()) as {
          text: string;
          segments?: ConfidenceSegment[];
        };
        if (!text.trim()) {
          toast.error("The re-transcription came back empty.");
          return;
        }
        transcriptRef.current = transcriptRef.current.map((turn, i) =>
          i === index ? { ...turn, content: text, segments, refined: true } : turn,
        );
        setTranscript(transcriptRef.current);
        toast.success("Re-transcribed with the high-accuracy model.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Re-transcription failed");
      } finally {
        setRetryingTurn(null);
      }
    },
    [],
  );

  const startCall = useCallback(async () => {
    activeRef.current = true;
    audioByTurnRef.current.clear();
    transcriptRef.current = [];
    leadRef.current = emptyLead;
    choiceRef.current = choice;
    setTranscript([]);
    setLead(emptyLead);
    setSummary(null);
    setScore(null);
    if (choice !== "auto") setLanguage(choice);
    setPhase("connecting");


    try {
      // Ask for the mic up front so the browser prompt appears before the greeting.
      const probe = await startRecording();
      await probe.stop();
      await runAgentTurn("");
    } catch (error) {
      activeRef.current = false;
      setPhase("idle");
      toast.error(
        error instanceof Error ? error.message : "Could not start the call. Allow microphone access.",
      );
    }
  }, [choice, runAgentTurn]);

  const endCall = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    cleanupAudio();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) await recorder.stop().catch(() => undefined);

    if (transcriptRef.current.length === 0) {
      setPhase("idle");
      return;
    }

    setPhase("saving");
    try {
      const res = await fetch("/api/end-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptRef.current,
          lead: leadRef.current,
          language: languageRef.current,
          channel: "browser",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { summary?: string; score?: LeadScore; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save the call");
      setSummary(data.summary ?? "");
      setScore(data.score ?? null);
      toast.success("Call summary generated and lead saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the call");
    } finally {
      setPhase("ended");
    }
  }, [cleanupAudio]);

  const interrupt = useCallback(() => {
    cleanupAudio();
    if (activeRef.current) void listenRef.current();
  }, [cleanupAudio]);

  const busy = phase === "connecting" || phase === "thinking" || phase === "saving";
  const captured = (Object.keys(leadFieldLabels) as (keyof LeadFields)[]).filter(
    (key) => lead[key],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="flex min-h-[520px] flex-col overflow-hidden border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                phase === "listening"
                  ? "bg-accent/20 text-accent-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              {phase === "listening" ? (
                <Mic className="size-5 animate-pulse" />
              ) : phase === "speaking" ? (
                <Volume2 className="size-5" />
              ) : busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Radio className="size-5" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold">Aarav · Skyline Estates</p>
              <p className="text-xs text-muted-foreground">
                {phaseLabel[phase]} · AGENT
              </p>

            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {phase === "idle" || phase === "ended" ? (
              <>
                <Select
                  value={choice}
                  onValueChange={(value) => setChoice(value as SpokenLanguage)}
                >
                  <SelectTrigger
                    aria-label="Language you will speak"
                    className="h-9 w-full min-w-[10.5rem] gap-2 sm:w-auto"
                  >
                    <Languages className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => void startCall()} className="w-full gap-2 sm:w-auto">
                  <PhoneCall className="size-4" />
                  {phase === "ended" ? "Start a fresh call" : "Start call"}
                </Button>
              </>
            ) : (

              <>
                {phase === "speaking" && (
                  <Button variant="secondary" onClick={interrupt} className="gap-2">
                    <Square className="size-4" /> Interrupt
                  </Button>
                )}
                {phase === "listening" && (
                  <Button
                    variant="secondary"
                    onClick={() => void stopListeningAndSend()}
                    className="gap-2"
                  >
                    <Square className="size-4" /> Done speaking
                  </Button>
                )}
                <Button variant="destructive" onClick={() => void endCall()} className="gap-2">
                  <PhoneOff className="size-4" /> End call
                </Button>
              </>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {transcript.length === 0 && (
            <div className="mx-auto max-w-sm pt-16 text-center text-sm text-muted-foreground">
              <p>
                Pick the language you will speak, press{" "}
                <span className="font-semibold text-foreground">Start call</span>, and Aarav answers
                out loud while the transcript appears here.
              </p>
              <p className="mt-2 text-xs">
                {languageOptions.find((option) => option.value === choice)?.hint}
              </p>
            </div>
          )}

          {transcript.map((turn, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                turn.role === "assistant"
                  ? "bg-secondary text-secondary-foreground"
                  : "ml-auto bg-primary text-primary-foreground",
              )}
            >
              <SpeakerLabel
                role={turn.role}
                turnNumber={index + 1}
                tone={turn.role === "assistant" ? "muted" : "onPrimary"}
                className="mb-1"
              />
              {turn.role === "user" ? (
                <ConfidenceText
                  text={turn.content}
                  segments={turn.segments}
                  tone="onPrimary"
                  retrying={retryingTurn === index}
                  onRetry={
                    audioByTurnRef.current.has(index) ? () => void retranscribe(index) : undefined
                  }
                />
              ) : (
                turn.content
              )}
            </div>
          ))}
          {phase === "thinking" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Aarav is thinking…
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="text-base font-semibold">Requirement captured live</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {captured.length} of {Object.keys(leadFieldLabels).length} fields qualified
          </p>
          <dl className="mt-4 space-y-2.5">
            {(Object.keys(leadFieldLabels) as (keyof LeadFields)[]).map((key) => (
              <div key={key} className="flex items-start justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">{leadFieldLabels[key]}</dt>
                <dd
                  className={cn(
                    "max-w-[55%] text-right font-medium",
                    !lead[key] && "text-muted-foreground/50",
                  )}
                >
                  {lead[key] ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        {summary !== null && (
          <Card className="border-accent/40 bg-accent/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Call summary</h3>
              {score && (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {score.band === "hot" ? "🔥 " : ""}
                  Lead score {score.score}/100 · {score.band}
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {summary || "No summary was generated."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
