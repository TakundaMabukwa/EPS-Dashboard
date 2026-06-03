"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Edit,
  CheckCircle,
  XCircle,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface TripChange {
  id: string;
  trip_id: string;
  change_type: string;
  previous_data: any;
  new_data: any;
  created_at: string;
  trip?: {
    ordernumber?: string;
    selectedclient?: string;
    cargo?: string;
  };
}

const fieldLabels: Record<string, string> = {
  rate: "Rate",
  cargo: "Commodity",
  origin: "Origin",
  destination: "Destination",
  notes: "Notes",
  selected_vehicle_type: "Vehicle Type",
  estimated_distance: "Distance",
  total_vehicle_cost: "Total Cost",
  pickuplocations: "Pickup Locations",
  dropofflocations: "Dropoff Locations",
};

function getChanges(previous: any, current: any) {
  const changes: { field: string; from: string; to: string }[] = [];
  Object.keys(fieldLabels).forEach((key) => {
    const prev = previous?.[key];
    const next = current?.[key];
    if (prev !== next) {
      changes.push({
        field: fieldLabels[key],
        from: prev != null && prev !== "" ? String(prev) : "(empty)",
        to: next != null && next !== "" ? String(next) : "(empty)",
      });
    }
  });
  return changes;
}

export default function AlertBellNotification() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<TripChange[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const [historyResult, pendingResult] = await Promise.allSettled([
        supabase
          .from("trip_history")
          .select("*, trip:trips!inner(ordernumber, selectedclient, cargo)")
          .in("change_type", ["edit", "approve", "decline"])
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("trips")
          .select("id, ordernumber, selectedclient, cargo, elevate, updated_at")
          .eq("elevate", true)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

      const entries: any[] = [];

      if (historyResult.status === "fulfilled" && historyResult.value.data) {
        entries.push(
          ...historyResult.value.data.map((h: any) => ({
            ...h,
            _source: "history" as const,
          }))
        );
      }

      if (pendingResult.status === "fulfilled" && pendingResult.value.data) {
        entries.push(
          ...pendingResult.value.data.map((t: any) => ({
            id: `pending-${t.id}`,
            trip_id: t.id,
            change_type: "edit",
            previous_data: null,
            new_data: null,
            created_at: t.updated_at,
            _source: "pending" as const,
            trip: { ordernumber: t.ordernumber, selectedclient: t.selectedclient, cargo: t.cargo },
          }))
        );
      }

      entries.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(entries.slice(0, 20));
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Auto-refresh every 15 seconds when open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [open]);

  const unreadCount = notifications.filter(
    (n) => n.change_type === "edit"
  ).length;

  const getChangeConfig = (changeType: string) => {
    switch (changeType) {
      case "edit":
        return {
          icon: Edit,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          label: "Needs Approval",
        };
      case "approve":
        return {
          icon: CheckCircle,
          color: "text-emerald-600",
          bgColor: "bg-emerald-100",
          label: "Approved",
        };
      case "decline":
        return {
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
          label: "Declined",
        };
      default:
        return {
          icon: ClipboardList,
          color: "text-slate-600",
          bgColor: "bg-slate-100",
          label: "Updated",
        };
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell
            className={cn(
              "h-5 w-5",
              unreadCount > 0 && "animate-pulse text-red-600"
            )}
          />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {unreadCount} pending approval{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-sm font-medium text-slate-900">All caught up!</p>
              <p className="text-xs text-slate-600 mt-1">No pending changes</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((entry) => {
                const cfg = getChangeConfig(entry.change_type);
                const Icon = cfg.icon;
                const changes = getChanges(
                  entry.previous_data,
                  entry.new_data
                );
                const orderNo =
                  entry.trip?.ordernumber || `#${String(entry.trip_id || '').slice(0, 8)}`;
                const client = entry.trip?.selectedclient || "";

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-4 transition-colors",
                      entry.change_type === "edit" && "bg-blue-50/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          cfg.bgColor
                        )}
                      >
                        <Icon className={cn("w-4 h-4", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-900">
                            {cfg.label}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {orderNo}
                          </Badge>
                        </div>
                        {client && (
                          <p className="text-xs text-slate-600 mb-2">
                            {client}
                          </p>
                        )}

                        {entry._source === "pending" ? (
                          <p className="text-xs text-orange-600 font-medium">
                            Requires management approval
                          </p>
                        ) : changes.length > 0 && (
                          <div className="space-y-1">
                            {changes.slice(0, 3).map((c, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <span className="font-medium text-slate-700 w-20 truncate">
                                  {c.field}:
                                </span>
                                <span className="text-red-600 truncate max-w-[80px]">
                                  {c.from}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="text-emerald-600 truncate max-w-[80px]">
                                  {c.to}
                                </span>
                              </div>
                            ))}
                            {changes.length > 3 && (
                              <span className="text-[10px] text-slate-500">
                                +{changes.length - 3} more change
                                {changes.length - 3 !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3 bg-slate-50 text-center">
              <span className="text-xs text-slate-500">
                {notifications.length} change{notifications.length !== 1 ? "s" : ""} recorded
              </span>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}


