"use client";

import { useEffect, useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Video } from "lucide-react";
import FLVPlayer from "@/components/video/FLVPlayer";

interface ChannelInfo {
  channelId: number;
  streamUrl: string;
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
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelStatuses, setChannelStatuses] = useState<Record<number, 'loading' | 'live' | 'offline'>>({});

  const handleStatusChange = useCallback((channel: number, status: 'loading' | 'live' | 'offline') => {
    setChannelStatuses((prev) => ({ ...prev, [channel]: status }));
  }, []);

  useEffect(() => {
    if (!open || !deviceId) {
      setChannels([]);
      setChannelStatuses({});
      return;
    }

    let cancelled = false;

    async function fetchChannels() {
      setLoading(true);
      setChannels([]);
      setChannelStatuses({});

      try {
        const res = await fetch("/api/video-server/stream/debug/vehicle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok || cancelled) return;

        const data = await res.json();
        const chs = data.data?.channels || data.channels || [];
        const valid: ChannelInfo[] = chs
          .filter((ch: any) => ch.success && ch.streamUrl)
          .map((ch: any) => ({
            channelId: ch.channelId,
            streamUrl: ch.streamUrl,
          }));

        if (!cancelled) setChannels(valid);
      } catch {
        if (!cancelled) setChannels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchChannels();
    return () => { cancelled = true; };
  }, [open, deviceId]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setChannels([]);
      setChannelStatuses({});
    }
    onOpenChange(isOpen);
  };

  const liveCount = Object.values(channelStatuses).filter((s) => s === 'live').length;
  const offlineCount = Object.values(channelStatuses).filter((s) => s === 'offline').length;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-[1100px] h-[85vh] overflow-hidden flex flex-col border border-slate-700/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-600/20 rounded-lg border border-cyan-500/20">
                  <Video className="h-5 w-5 text-cyan-400" />
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
              <div className="flex items-center gap-4">
                {open && Object.keys(channelStatuses).length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    {liveCount > 0 && (
                      <span className="flex items-center gap-1.5 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        {liveCount} live
                      </span>
                    )}
                    {offlineCount > 0 && (
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        {offlineCount} offline
                      </span>
                    )}
                  </div>
                )}
                <Dialog.Close className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/50">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {[1, 2, 3, 4].map((ch) => (
                    <div key={ch} className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-10 h-10 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Connecting to CH{ch}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && channels.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3">
                    <Video className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">No streams available</p>
                  <p className="text-slate-600 text-xs mt-1">Device may be offline</p>
                </div>
              )}

              {!loading && channels.length > 0 && (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {channels.map((ch) => (
                    <FLVPlayer
                      key={`${deviceId}-ch${ch.channelId}`}
                      streamUrl={ch.streamUrl}
                      channel={ch.channelId}
                      vehicleName={vehicleName || registration}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">{registration}</span>
              <span className="text-xs text-slate-600">{channels.length > 0 ? `${channels.length} channels` : "loading..."}</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
