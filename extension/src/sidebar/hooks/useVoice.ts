import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceReturn {
  isPlaying: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  speed: number;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

function splitIntoSentences(text: string): string[] {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[>-]\s/g, '');

  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

export function useVoice(): UseVoiceReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const sentenceIndex = useRef(0);
  const sentencesRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        const english = available.find((v) => v.lang.startsWith('en') && v.localService);
        setCurrentVoice(english || available[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speakSentence = useCallback((sentences: string[], index: number) => {
    if (index >= sentences.length || !isPlayingRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.rate = speed;
    if (currentVoice) utterance.voice = currentVoice;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      sentenceIndex.current = index + 1;
      speakSentence(sentences, index + 1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  }, [speed, currentVoice]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return;

    sentencesRef.current = sentences;
    sentenceIndex.current = 0;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    speakSentence(sentences, 0);
  }, [speakSentence]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    sentenceIndex.current = 0;
  }, []);

  const handleSetVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
  }, []);

  return {
    isPlaying, isPaused, voices, currentVoice, speed,
    speak, pause, resume, stop, setSpeed, setVoice: handleSetVoice,
  };
}
