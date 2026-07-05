"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Video, Loader2 } from "lucide-react";
import FLVPlayer from "@/components/video/FLVPlayer";

interface ChannelStream {
  channelId: number;
  streamUrl: string | null;
  success: boolean;
  message?: string;
}

interface VehicleCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  registration: string;
  vehicleName: string;
}

export default function VehicleCameraModal({
  open,
  onOpenChange,
  deviceId,
  registration,
  vehicleName,
}: VehicleCameraModalProps) {
  const [channels, setChannels] = useState<ChannelStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !deviceId) {
      setChannels([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchChannels() {
      setLoading(true);
      setError(null);
      setChannels([]);

      try {
        const res = await fetch("/api/video-server/stream/debug/vehicle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
          if (!cancelled) setError(`Stream request failed (${res.status})`);
          return;
        }

        const data = await res.json();
        const chs = data.data?.channels || data.channels || [];
        const parsed: ChannelStream[] = chs.map((ch: any) => ({
          channelId: ch.channelId,
          streamUrl: ch.streamUrl || null,
          success: ch.success === true,
          message: ch.message || (ch.success ? "OK" : "Offline"),
        }));

        if (!cancelled) {
          setChannels(parsed);
          if (parsed.every((ch) => !ch.success)) {
            setError("All channels offline");
          }
        }
      } catch (e) {
        if (!cancelled) setError("Failed to connect to streaming server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchChannels();

    return () => {
      cancelled = true;
    };
  }, [open, deviceId]);

  const successfulChannels = channels.filter((ch) => ch.success && ch.streamUrl);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-600 rounded-lg">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <Dialog.Title className="text-white font-semibold text-lg">
                    Live Cameras
                  </Dialog.Title>
                  <Dialog.Description className="text-slate-400 text-sm">
                    {vehicleName || registration}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 text-teal-400 animate-spin mb-4" />
                  <p className="text-slate-400 text-sm">Connecting to cameras...</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-3 bg-red-900/30 rounded-full mb-4">
                    <Video className="h-8 w-8 text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Device may be offline or unreachable
                  </p>
                </div>
              )}

              {!loading && !error && successfulChannels.length === 0 && channels.length > 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-3 bg-slate-700/50 rounded-full mb-4">
                    <Video className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-400 text-sm">No active streams available</p>
                </div>
              )}

              {successfulChannels.length > 0 && (
                <div className={`grid gap-4 ${successfulChannels.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {successfulChannels.map((ch) => (
                    <FLVPlayer
                      key={ch.channelId}
                      streamUrl={ch.streamUrl!}
                      channel={ch.channelId}
                      vehicleName={`${vehicleName || registration} Ch ${ch.channelId}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {registration}
              </span>
              <div className="flex items-center gap-2">
                {successfulChannels.length > 0 && (
                  <span className="text-xs text-green-400">
                    {successfulChannels.length} channel{successfulChannels.length > 1 ? "s" : ""} active
                  </span>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
