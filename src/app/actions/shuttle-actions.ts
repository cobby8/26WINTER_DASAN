
'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// TMAP_APP_KEY moved to function scope for reliability

export interface ShuttleSchedule {
    id: string;
    student_id: string;
    day_of_week: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    type: 'boarding' | 'dropoff';
    time: string;
    location_name: string;
    location_address: string;
    location_lat: number;
    location_lng: number;
    sequence_order?: number;
}

export async function getShuttleSchedules(studentId: string) {
    const { data, error } = await supabaseAdmin
        .from('shuttle_schedules')
        .select('*')
        .eq('student_id', studentId)
        .order('day_of_week') // Sort logic might need custom ordering locally
        .order('time');

    if (error) {
        console.error('Error fetching schedules:', error);
        return [];
    }
    return data as ShuttleSchedule[];
}

export async function addShuttleSchedule(data: Omit<ShuttleSchedule, 'id'>) {
    console.log('[Shuttle] Adding schedule:', data);
    const { data: newSchedule, error } = await supabaseAdmin
        .from('shuttle_schedules')
        .insert(data)
        .select()
        .single();

    if (error) {
        console.error('Error adding schedule:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/students');
    return { success: true, data: newSchedule };
}

export async function deleteShuttleSchedule(id: string) {
    const { error } = await supabaseAdmin
        .from('shuttle_schedules')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting schedule:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/students');
    return { success: true };
}

// T-Map POI Search Proxy
// T-Map POI Search Proxy
export async function searchLocationV2(keyword: string) {
    console.log('[ServerAction] searchLocationV2 CALLED with:', keyword);

    // Read Env Var inside function to ensure freshness
    const TMAP_APP_KEY = process.env.NEXT_PUBLIC_TMAP_APP_KEY;

    // Log first 5 chars for verification
    if (TMAP_APP_KEY) console.log('[ServerAction] TMAP Key Prefix:', TMAP_APP_KEY.substring(0, 5));

    if (!TMAP_APP_KEY) {
        console.error('[ServerAction] Missing TMAP_APP_KEY');
        return { success: false, error: 'T-Map API Key is missing' };
    }

    try {
        const url = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=10`;
        console.log('[ServerAction] Requesting URL:', url);

        const response = await fetch(
            url,
            {
                headers: {
                    'appKey': TMAP_APP_KEY,
                    'Accept': 'application/json'
                }
            }
        );

        console.log('[ServerAction] Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ServerAction] API Error Body:', errorText);
            throw new Error(`T-Map API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[ServerAction] API Response JSON received');

        // Parse T-Map structure
        const pois = data.searchPoiInfo?.pois?.poi || [];
        console.log(`[ServerAction] Found ${pois.length} POIs`);

        const results = pois.map((poi: any) => ({
            name: poi.name,
            address: poi.newAddressList?.newAddress?.[0]?.fullAddressRoad || poi.upperAddrName + ' ' + poi.middleAddrName + ' ' + poi.lowerAddrName,
            lat: parseFloat(poi.noorLat),
            lng: parseFloat(poi.noorLon)
        }));

        return { success: true, data: results };
    } catch (error: any) {
        console.error('[ServerAction] Fatal Error:', error);
        return { success: false, error: error.message };
    }
}
