// lib/getTechnicianLocation.ts
import { createClient } from "@/lib/supabase/server";

const supabase = createClient();

export const getTechnicianLocation = async (techId: number) => {
  const { data: location, error } = await (await supabase)
    .from('technicians')
    .select('location') // Only select the location field
    .eq('id', techId)
    .single();

  if (error || !location) throw error;

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location.location)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN}&region=za`);
  const data = await res.json();
  const { lat, lng } = data.results[0].geometry.location;

  return { lat, lng, name: location.location };
};
