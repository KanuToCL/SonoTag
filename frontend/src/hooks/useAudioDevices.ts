import { useCallback, useEffect, useState } from "react";
import type { PermissionState } from "../types/app";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAudioDevicesReturn {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  permissionState: PermissionState;
  refreshDevices: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  setSelectedDeviceId: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioDevices(): UseAudioDevicesReturn {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [error, setError] = useState<string>("");

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("Browser does not support device enumeration.");
      return;
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = allDevices.filter((device) => device.kind === "audioinput");
      setDevices(inputs);
      if (!selectedDeviceId && inputs.length > 0) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch {
      setError("Failed to enumerate audio devices.");
    }
  }, [selectedDeviceId]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState("granted");
      stream.getTracks().forEach((track) => track.stop());
      await refreshDevices();
      return true;
    } catch {
      setPermissionState("denied");
      setError("Microphone permission denied.");
      return false;
    }
  }, [refreshDevices]);

  // Listen for devicechange events
  useEffect(() => {
    refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) {
      return undefined;
    }

    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refreshDevices]);

  return {
    devices,
    selectedDeviceId,
    permissionState,
    refreshDevices,
    requestPermission,
    setSelectedDeviceId,
    setError,
  };
}
