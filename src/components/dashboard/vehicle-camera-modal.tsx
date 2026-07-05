"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Video } from "lucide-react";
import FLVPlayer from "@/components/video/FLVPlayer";

const TOTAL_CHANNELS = [1, 2, 3, 4];

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
  const [channelStatuses, setChannelStatuses] = useState<Record<number, 'loading' | 'live' | 'offline'>>({});

  const handleStatusChange = useCallback((channel: number, status: 'loading' | 'live' | 'offline') => {
    setChannelStatuses((prev) => ({ ...prev, [channel]: status }));
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
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
              {!deviceId ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-slate-500 text-sm">No device ID available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {TOTAL_CHANNELS.map((ch) => {
                    const streamUrl = `https://m1.mettaxiot.com/mettax/video/${deviceId}_${ch}.live.flv`;
                    return (
                      <FLVPlayer
                        key={`${deviceId}-ch${ch}`}
                        streamUrl={streamUrl}
                        channel={ch}
                        vehicleName={`${vehicleName || registration}`}
                        onStatusChange={handleStatusChange}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">{registration}</span>
              <span className="text-xs text-slate-600">4 channels</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
