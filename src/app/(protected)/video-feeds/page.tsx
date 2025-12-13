"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Video,
  Circle,
  WifiOff,
  ArrowLeft,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: "live" | "offline" | "reconnecting";
  quality: "HD" | "SD";
}

export default function VideoFeedsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  
  const driverName = searchParams.get("driver") || "Unassigned";
  const vehicleInfo = searchParams.get("vehicle") || "Vehicle Info Unavailable";

  const cameras: CameraFeed[] = [
    { id: "cam1", name: "Camera 1", location: "Front View", status: "live", quality: "HD" },
    { id: "cam2", name: "Camera 2", location: "Rear View", status: "live", quality: "HD" },
    { id: "cam3", name: "Camera 3", location: "Side View", status: "live", quality: "HD" },
    { id: "cam4", name: "Camera 4", location: "Interior", status: "live", quality: "HD" },
  ];

  const videoUrls = [
    "https://www.youtube.com/embed/hFMQ5LkkS98?autoplay=1&mute=1&loop=1&playlist=hFMQ5LkkS98&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1",
    "https://www.youtube.com/embed/yXMjeRXglGc?autoplay=1&mute=1&loop=1&playlist=yXMjeRXglGc&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1",
    "https://www.youtube.com/embed/FI5ba4RRE8U?autoplay=1&mute=1&loop=1&playlist=FI5ba4RRE8U&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1",
    "https://www.youtube.com/embed/V6ROdRxw0d8?autoplay=1&mute=1&loop=1&playlist=V6ROdRxw0d8&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1",
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "reconnecting":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 overflow-hidden">
      {/* Fixed Header - Above Everything */}
      <div className="flex-none z-50 px-4 py-3 border-b border-gray-300 bg-gray-100/95 backdrop-blur-lg shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-400" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shadow-md">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Live Camera Feeds</h1>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="font-medium">{driverName}</span>
                  <span>•</span>
                  <span>{vehicleInfo}</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="default"
            onClick={() => router.push("/video-alerts")}
            className="gap-2 bg-red-600 hover:bg-red-700"
          >
            <AlertTriangle className="w-4 h-4" />
            View Alerts
          </Button>
        </div>
      </div>

      {/* Scrollable Camera Grid Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4">
          {/* 2x2 Grid with Larger Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[2000px] mx-auto">
            {cameras.map((camera, index) => (
              <Card
                key={camera.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-200 border-2 flex flex-col group hover:scale-[1.01]",
                  selectedCamera === camera.id
                    ? "border-gray-400 ring-4 ring-gray-300/50 shadow-xl"
                    : "border-gray-300 hover:border-gray-400",
                  camera.status === "offline" && "opacity-60",
                  "bg-white"
                )}
                onClick={() => setSelectedCamera(camera.id)}
              >
                {/* Camera Feed Container - Much Larger */}
                <div className="relative bg-black aspect-video lg:h-[calc(50vh-80px)]">
                  {/* Live Video Stream */}
                  {camera.status === "live" ? (
                    <div className="absolute inset-0">
                      <iframe
                        src={videoUrls[index]}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="eager"
                        title={camera.name}
                        style={{ border: 0 }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <WifiOff className="w-20 h-20 mb-4 opacity-50" />
                      <span className="text-lg font-medium">Camera Offline</span>
                    </div>
                  )}

                  {/* Camera Info Overlay - Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent p-4 pt-12">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                        <Camera className="w-5 h-5" />
                        <span className="text-lg font-bold">{camera.name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-base text-gray-200">{camera.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
