/**
 * Type definitions for SmartFlow FL
 */

export interface TrafficRecord {
  timestamp: string;
  junction_id: 'Junction A' | 'Junction B' | 'Junction C' | 'Junction D' | string;
  vehicle_count: number;
  average_speed: number;
  occupancy: number;
  hour: number;
  day_of_week: number;
  prev_vehicle_count?: number;
}

export interface JunctionProfile {
  id: string;
  name: string;
  description: string;
  baseFlow: number;
  morningPeakHour: number;
  eveningPeakHour: number;
  peakIntensity: number;
  speedBase: number;
  color: string;
}

export interface ModelParameters {
  weights: number[]; // [hour, day_of_week, prev_vehicle_count, average_speed, occupancy]
  intercept: number;
  scalerMean: number[];
  scalerStd: number[];
}

export interface EvaluationMetrics {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
}

export interface ClientUpdate {
  junctionId: string;
  sampleCount: number;
  weights: ModelParameters;
  localMetrics: EvaluationMetrics;
  uploadBytes: number;
}

export interface FederatedRoundResult {
  round: number;
  clientsCount: number;
  globalWeights: ModelParameters;
  globalMetrics: EvaluationMetrics;
  centralizedBaselineMetrics: EvaluationMetrics;
  clientMetrics: Record<string, EvaluationMetrics>;
  roundUploadKb: number;
  roundDownloadKb: number;
  roundTotalKb: number;
  cumulativeKb: number;
  timestamp: string;
}

export interface CentralizedBaselineResult {
  modelName: string;
  metrics: EvaluationMetrics;
  sampleCount: number;
  rawDatasetSizeBytes: number;
  weights: ModelParameters;
}

export type ActiveTab = 
  | 'overview' 
  | 'prediction' 
  | 'federated' 
  | 'communication' 
  | 'performance' 
  | 'about';
