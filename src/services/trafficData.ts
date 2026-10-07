import { TrafficRecord, JunctionProfile } from '../types/fl';

export const JUNCTIONS_METADATA: JunctionProfile[] = [
  {
    id: 'Junction A',
    name: 'Downtown Central Hub',
    description: 'High commuter density with sharp 08:30 & 17:30 peak hours.',
    baseFlow: 125,
    morningPeakHour: 8.5,
    eveningPeakHour: 17.5,
    peakIntensity: 185,
    speedBase: 42.0,
    color: '#3b82f6', // blue
  },
  {
    id: 'Junction B',
    name: 'Highway North Arterial',
    description: 'High-speed trunk line with extended freight & intercity passenger flow.',
    baseFlow: 165,
    morningPeakHour: 8.0,
    eveningPeakHour: 18.0,
    peakIntensity: 220,
    speedBase: 78.0,
    color: '#8b5cf6', // purple
  },
  {
    id: 'Junction C',
    name: 'Commercial District Ring',
    description: 'Retail & dining precinct with broad midday & evening activity peaks.',
    baseFlow: 92,
    morningPeakHour: 11.5,
    eveningPeakHour: 16.5,
    peakIntensity: 140,
    speedBase: 36.0,
    color: '#f59e0b', // amber
  },
  {
    id: 'Junction D',
    name: 'Residential Sector Gate',
    description: 'Suburban corridor with early outbound commute and late residential returns.',
    baseFlow: 62,
    morningPeakHour: 7.5,
    eveningPeakHour: 19.0,
    peakIntensity: 115,
    speedBase: 46.0,
    color: '#10b981', // emerald
  },
];

function gaussian(x: number, mean: number, std: number): number {
  return Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(std, 2)));
}

/**
 * Generate synthetic realistic traffic flow data
 */
export function generateSyntheticTrafficData(days: number = 14): TrafficRecord[] {
  const records: TrafficRecord[] = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 3600 * 1000);
  startTime.setMinutes(0, 0, 0);

  const totalHours = days * 24;

  for (const junction of JUNCTIONS_METADATA) {
    let prevCount = junction.baseFlow;

    for (let i = 0; i < totalHours; i++) {
      const currentTime = new Date(startTime.getTime() + i * 3600 * 1000);
      const hour = currentTime.getHours();
      const dayOfWeek = currentTime.getDay(); // 0 is Sunday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Diurnal shape components
      const mPeak = gaussian(hour, junction.morningPeakHour, 1.6);
      const ePeak = gaussian(hour, junction.eveningPeakHour, 2.0);
      const nightFactor = (hour >= 23 || hour <= 5) ? 0.28 : 1.0;

      let flowMultiplier = 1.0;
      if (isWeekend) {
        const weekendMidday = gaussian(hour, 14.0, 3.2) * 0.75;
        flowMultiplier = 0.70 + weekendMidday + (mPeak * 0.35) + (ePeak * 0.45);
      } else {
        flowMultiplier = 1.0 + (mPeak + ePeak) * (junction.peakIntensity / junction.baseFlow);
      }

      const meanCount = junction.baseFlow * nightFactor * flowMultiplier;
      // Normal pseudo-random noise
      const u1 = Math.max(1e-6, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const noise = z0 * (junction.baseFlow * 0.08);

      const vehicleCount = Math.max(6, Math.round(meanCount + noise));

      // Greenshields traffic density: speed drops as vehicle count increases
      const speedDropFactor = 0.12;
      const speedNoise = (Math.random() - 0.5) * 4;
      const avgSpeed = Math.max(12.0, Math.round((junction.speedBase - (vehicleCount * speedDropFactor) + speedNoise) * 10) / 10);

      // Occupancy (0.03 to 0.95)
      const occupancy = Math.min(0.96, Math.max(0.02, Math.round((vehicleCount * 0.0035 + (Math.random() * 0.03)) * 10000) / 10000));

      const isoTime = currentTime.toISOString().replace('T', ' ').substring(0, 19);

      records.push({
        timestamp: isoTime,
        junction_id: junction.id,
        vehicle_count: vehicleCount,
        average_speed: avgSpeed,
        occupancy: occupancy,
        hour: hour,
        day_of_week: dayOfWeek,
        prev_vehicle_count: prevCount,
      });

      prevCount = vehicleCount;
    }
  }

  // Sort chronological
  return records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Convert dataset to CSV string
 */
export function exportTrafficToCsv(records: TrafficRecord[]): string {
  const headers = ['timestamp', 'junction_id', 'vehicle_count', 'average_speed', 'occupancy', 'hour', 'day_of_week', 'prev_vehicle_count'];
  const rows = records.map(r => 
    [r.timestamp, r.junction_id, r.vehicle_count, r.average_speed, r.occupancy, r.hour, r.day_of_week, r.prev_vehicle_count ?? ''].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parse custom CSV
 */
export function parseTrafficCsv(csvText: string): TrafficRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must contain at least header and one data row.');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const req = ['timestamp', 'junction_id', 'vehicle_count'];
  for (const r of req) {
    if (!headers.includes(r)) {
      throw new Error(`Missing required CSV column: ${r}`);
    }
  }

  const idxTime = headers.indexOf('timestamp');
  const idxJunc = headers.indexOf('junction_id');
  const idxCount = headers.indexOf('vehicle_count');
  const idxSpeed = headers.indexOf('average_speed');
  const idxOcc = headers.indexOf('occupancy');
  const idxHour = headers.indexOf('hour');
  const idxDay = headers.indexOf('day_of_week');
  const idxPrev = headers.indexOf('prev_vehicle_count');

  const records: TrafficRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 3 || !parts[idxTime]) continue;

    const count = parseFloat(parts[idxCount]) || 0;
    const dateObj = new Date(parts[idxTime]);
    const hour = idxHour >= 0 && parts[idxHour] !== '' ? parseInt(parts[idxHour]) : (!isNaN(dateObj.getTime()) ? dateObj.getHours() : 12);
    const day = idxDay >= 0 && parts[idxDay] !== '' ? parseInt(parts[idxDay]) : (!isNaN(dateObj.getTime()) ? dateObj.getDay() : 1);
    const speed = idxSpeed >= 0 && parts[idxSpeed] !== '' ? parseFloat(parts[idxSpeed]) : 45.0;
    const occ = idxOcc >= 0 && parts[idxOcc] !== '' ? parseFloat(parts[idxOcc]) : 0.35;
    const prev = idxPrev >= 0 && parts[idxPrev] !== '' ? parseFloat(parts[idxPrev]) : count;

    records.push({
      timestamp: parts[idxTime],
      junction_id: parts[idxJunc] || 'Junction A',
      vehicle_count: Math.round(count),
      average_speed: Math.round(speed * 10) / 10,
      occupancy: Math.round(occ * 1000) / 1000,
      hour,
      day_of_week: day,
      prev_vehicle_count: Math.round(prev),
    });
  }

  if (records.length === 0) throw new Error('No valid records parsed from CSV.');
  return records;
}
