import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TruckRouteOptimizer } from '@/lib/route-optimization';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, vehicleId, orderId, pickupTime } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const optimizer = new TruckRouteOptimizer();
    const routeData = await optimizer.optimizeRoute({
      origin,
      destination,
      profile: 'truck',
      departureTime: pickupTime
    });

    // Save route to database
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('routes')
      .insert([{
        start_points: origin,
        end_points: destination,
        order_number: orderId,
        vehicle_id: vehicleId,
        distance_km: routeData.distance,
        duration_minutes: routeData.duration,
        estimated_eta: routeData.eta,
        route_geometry: routeData.geometry,
        truck_restrictions: routeData.restrictions || [],
        traffic_warnings: routeData.warnings || [],
        route_data: {
          distance: routeData.distance,
          duration: routeData.duration,
          eta: routeData.eta,
          geometry: routeData.geometry,
          warnings: routeData.warnings,
          restrictions: routeData.restrictions,
          tollgates: routeData.tollgates,
          provinces: routeData.provinces,
          breakTime: routeData.breakTime,
          totalDurationWithBreaks: routeData.totalDurationWithBreaks,
          vehicle_id: vehicleId,
          created_at: new Date().toISOString()
        },
        status: 'planned'
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save route' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      route: {
        id: data.id,
        distance: routeData.distance,
        duration: routeData.duration,
        eta: routeData.eta,
        geometry: routeData.geometry,
        warnings: routeData.warnings,
        restrictions: routeData.restrictions,
        tollgates: routeData.tollgates,
        provinces: routeData.provinces,
        breakTime: routeData.breakTime,
        totalDurationWithBreaks: routeData.totalDurationWithBreaks
      }
    });

  } catch (error) {
    console.error('Route API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    const supabase = await createClient();
    let query = supabase.from('routes').select('*');
    
    if (orderId) {
      query = query.eq('order_number', orderId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
    }

    return NextResponse.json({ routes: data });

  } catch (error) {
    console.error('Route fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}