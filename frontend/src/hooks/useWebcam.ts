import { useCallback, useEffect, useRef, useState } from "react";
import type { InputMode } from "../types/app";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseWebcamParams {
  inputMode: InputMode;
}

export interface UseWebcamReturn {
  webcamDevices: MediaDeviceInfo[];
  selectedWebcamId: string;
  webcamError: string;
  webcamActive: boolean;
  webcamRef: React.RefObject<HTMLVideoElement | null>;
  webcamStreamRef: React.MutableRefObject<MediaStream | null>;
  refreshWebcamDevices: () => Promise<void>;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  setSelectedWebcamId: React.Dispatch<React.SetStateAction<string>>;
  setShowWebcamModal: React.Dispatch<React.SetStateAction<boolean>>;
  showWebcamModal: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebcam({ inputMode }: UseWebcamParams): UseWebcamReturn {
  const [webcamDevices, setWebcamDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedWebcamId, setSelectedWebcamId] = useState<string>("");
  const [webcamError, setWebcamError] = useState<string>("");
  const [webcamActive, setWebcamActive] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  const webcamRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const refreshWebcamDevices = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((device) => device.kind === "videoinput");
      setWebcamDevices(videoInputs);
      if (!selectedWebcamId && videoInputs.length > 0) {
        setSelectedWebcamId(videoInputs[0].deviceId);
      }
    } catch {
      setWebcamError("Failed to enumerate video devices.");
    }
  }, [selectedWebcamId]);

  const startWebcam = useCallback(async (): Promise<void> => {
    try {
      setWebcamError("");

      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: selectedWebcamId ? { deviceId: { exact: selectedWebcamId } } : true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      webcamStreamRef.current = stream;

      setWebcamActive(true);
      setShowWebcamModal(true);

      await refreshWebcamDevices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access webcam";
      setWebcamError(message);
      setWebcamActive(false);
    }
  }, [selectedWebcamId, refreshWebcamDevices]);

  const stopWebcam = useCallback((): void => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (webcamRef.current) {
      webcamRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }, []);

  // Set webcam srcObject when video element is mounted and stream is available
  useEffect(() => {
    if (webcamActive && webcamRef.current && webcamStreamRef.current) {
      webcamRef.current.srcObject = webcamStreamRef.current;
    }
  }, [webcamActive]);

  // Cleanup webcam when switching away from microphone mode
  useEffect(() => {
    if (inputMode !== "microphone" && webcamActive) {
      stopWebcam();
    }
  }, [inputMode, webcamActive, stopWebcam]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }
    };
  }, []);

  return {
    webcamDevices,
    selectedWebcamId,
    webcamError,
    webcamActive,
    webcamRef,
    webcamStreamRef,
    refreshWebcamDevices,
    startWebcam,
    stopWebcam,
    setSelectedWebcamId,
    setShowWebcamModal,
    showWebcamModal,
  };
}
