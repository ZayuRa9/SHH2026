import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface RealtimePayload {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: any;
  old: any;
}

/**
 * Custom hook that listens to live real-time updates from Supabase tables
 * and executes a callback to sync local app state.
 * 
 * @param onUpdate Callback function triggered on database modifications
 */
export function useSupabaseRealtime(onUpdate: (payload: RealtimePayload) => void) {
  const onUpdateRef = useRef(onUpdate);

  // Keep callback reference updated without triggering dependency re-runs
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log("[REALTIME] Supabase not fully configured; realtime subscription is inactive.");
      return;
    }

    console.log("[REALTIME] Establishing live PostgreSQL realtime subscriptions...");

    const channel = supabase
      .channel("portal-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload: any) => {
          console.log(`[REALTIME] Live database change detected on table: ${payload.table}`, payload);
          if (onUpdateRef.current) {
            onUpdateRef.current({
              table: payload.table,
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[REALTIME] Subscription channel status: ${status}`);
      });

    return () => {
      console.log("[REALTIME] Cleaning up database realtime channel subscription.");
      supabase.removeChannel(channel);
    };
  }, []);
}

