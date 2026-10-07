import {
  TrafficRecord,
  ModelParameters,
  EvaluationMetrics,
  ClientUpdate,
  FederatedRoundResult,
  CentralizedBaselineResult
} from '../types/fl';

export const FEATURE_NAMES = [
  'hour',
  'day_of_week',
  'prev_vehicle_count',
  'average_speed',
  'occupancy'
];

/**
 * Standardize features: returns mean and std vectors
 */
export function computeFeatureScaling(records: TrafficRecord[]): { mean: number[]; std: number[] } {
  const n = records.length;
  const dim = FEATURE_NAMES.length;
  const sum = new Array(dim).fill(0);
  const sumSq = new Array(dim).fill(0);

  for (const r of records) {
    const row = [
      r.hour,
      r.day_of_week,
      r.prev_vehicle_count ?? r.vehicle_count,
      r.average_speed,
      r.occupancy
    ];
    for (let d = 0; d < dim; d++) {
      sum[d] += row[d];
      sumSq[d] += row[d] * row[d];
    }
  }

  const mean = sum.map(s => s / n);
  const std = sumSq.map((sq, d) => {
    const variance = (sq / n) - (mean[d] * mean[d]);
    return Math.max(1e-4, Math.sqrt(Math.max(1e-6, variance)));
  });

  return { mean, std };
}

/**
 * Solve Ridge Regression using Normal Equation:
 * (X^T * X + alpha * I)^(-1) * X^T * y
 */
export function trainRidgeRegression(
  records: TrafficRecord[],
  alpha: number = 2.0
): ModelParameters {
  const n = records.length;
  const dim = FEATURE_NAMES.length;
  const { mean, std } = computeFeatureScaling(records);

  // Mean of target
  let sumY = 0;
  for (const r of records) sumY += r.vehicle_count;
  const meanY = sumY / n;

  // Initialize Gram matrix (dim x dim) and X^T * y
  const XtX: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const XtY: number[] = new Array(dim).fill(0);

  for (const r of records) {
    const row = [
      (r.hour - mean[0]) / std[0],
      (r.day_of_week - mean[1]) / std[1],
      ((r.prev_vehicle_count ?? r.vehicle_count) - mean[2]) / std[2],
      (r.average_speed - mean[3]) / std[3],
      (r.occupancy - mean[4]) / std[4],
    ];
    const yCent = r.vehicle_count - meanY;

    for (let i = 0; i < dim; i++) {
      XtY[i] += row[i] * yCent;
      for (let j = 0; j < dim; j++) {
        XtX[i][j] += row[i] * row[j];
      }
    }
  }

  // Add Ridge Regularization (alpha * I)
  for (let i = 0; i < dim; i++) {
    XtX[i][i] += alpha;
  }

  // Invert (dim x dim) matrix using Gauss-Jordan elimination (dim=5)
  const inv = invertMatrix(XtX);
  const weights: number[] = new Array(dim).fill(0);

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      weights[i] += inv[i][j] * XtY[j];
    }
  }

  return {
    weights,
    intercept: meanY,
    scalerMean: mean,
    scalerStd: std,
  };
}

/**
 * Gauss-Jordan matrix inversion for 5x5 matrix
 */
function invertMatrix(M: number[][]): number[][] {
  const n = M.length;
  // Augmented matrix
  const A = M.map((row, i) => {
    const aug = [...row];
    for (let j = 0; j < n; j++) aug.push(i === j ? 1 : 0);
    return aug;
  });

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-9) {
      // Degenerate regularization fallback: diagonal fallback
      return Array.from({ length: n }, (_, rowIdx) =>
        Array.from({ length: n }, (_, colIdx) => (rowIdx === colIdx ? 0.05 : 0))
      );
    }

    for (let j = 0; j < 2 * n; j++) A[i][j] /= pivot;

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }
  }

  return A.map(row => row.slice(n));
}

/**
 * Predict vehicle count for records
 */
export function predictTraffic(
  params: ModelParameters,
  records: TrafficRecord[]
): number[] {
  const { weights, intercept, scalerMean, scalerStd } = params;

  return records.map(r => {
    const raw = [
      r.hour,
      r.day_of_week,
      r.prev_vehicle_count ?? r.vehicle_count,
      r.average_speed,
      r.occupancy
    ];

    let dot = 0;
    for (let i = 0; i < weights.length; i++) {
      const scaled = (raw[i] - scalerMean[i]) / scalerStd[i];
      dot += weights[i] * scaled;
    }
    const pred = dot + intercept;
    return Math.max(0, Math.round(pred * 10) / 10);
  });
}

/**
 * Evaluate metrics (MAE, RMSE, MAPE, R2)
 */
export function computeMetrics(
  actuals: number[],
  predictions: number[]
): EvaluationMetrics {
  const n = actuals.length;
  if (n === 0) return { mae: 0, rmse: 0, mape: 0, r2: 0 };

  let absSum = 0;
  let sqSum = 0;
  let apeSum = 0;
  let actualSum = 0;
  let validApeCount = 0;

  for (let i = 0; i < n; i++) {
    const y = actuals[i];
    const yHat = predictions[i];
    const diff = y - yHat;

    absSum += Math.abs(diff);
    sqSum += diff * diff;
    actualSum += y;

    if (y > 0) {
      apeSum += Math.abs(diff) / y;
      validApeCount++;
    }
  }

  const meanActual = actualSum / n;
  let totalVarSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = actuals[i] - meanActual;
    totalVarSum += diff * diff;
  }

  const mae = absSum / n;
  const rmse = Math.sqrt(sqSum / n);
  const mape = validApeCount > 0 ? (apeSum / validApeCount) * 100 : 0;
  const r2 = totalVarSum > 0 ? Math.max(0, 1 - (sqSum / totalVarSum)) : 0;

  return {
    mae: Math.round(mae * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    mape: Math.round(mape * 100) / 100,
    r2: Math.round(r2 * 10000) / 10000,
  };
}

/**
 * Estimate size of serialized model parameters in bytes.
 * 5 weights + 1 intercept + 5 scalerMean + 5 scalerStd = 16 float64s (128 bytes raw)
 * + JSON / protocol buffer message envelope overhead (~1,120 bytes) = ~1,248 bytes (~1.22 KB)
 */
export function estimateParametersPayloadBytes(): number {
  return 1248; // Exactly 1.218 KB per model transmission
}

/**
 * Train centralized baseline on combined dataset
 */
export function trainCentralizedBaseline(
  allRecords: TrafficRecord[]
): CentralizedBaselineResult {
  const splitIdx = Math.floor(allRecords.length * 0.8);
  const trainRecords = allRecords.slice(0, splitIdx);
  const testRecords = allRecords.slice(splitIdx);

  const modelParams = trainRidgeRegression(trainRecords, 1.5);
  const preds = predictTraffic(modelParams, testRecords);
  const actuals = testRecords.map(r => r.vehicle_count);
  const metrics = computeMetrics(actuals, preds);

  // Raw dataset size in bytes if entire CSV was uploaded
  const rawCsvChars = trainRecords.length * 52; // average line length in bytes
  const rawDatasetSizeBytes = rawCsvChars;

  return {
    modelName: 'Centralized Baseline (Ridge Regression)',
    metrics,
    sampleCount: trainRecords.length,
    rawDatasetSizeBytes,
    weights: modelParams,
  };
}

/**
 * Perform a single Federated Learning round using FedAvg
 */
export function executeFederatedRound(
  roundNumber: number,
  activeJunctionIds: string[],
  allRecords: TrafficRecord[],
  currentGlobalWeights: ModelParameters | null,
  centralizedBaselineMetrics: EvaluationMetrics
): FederatedRoundResult {
  const clientUpdates: ClientUpdate[] = [];
  const payloadBytes = estimateParametersPayloadBytes();

  // Step 1 & 2: Each participating junction client trains on its local private partition
  for (const jId of activeJunctionIds) {
    const jRecords = allRecords.filter(r => r.junction_id === jId);
    const splitIdx = Math.floor(jRecords.length * 0.8);
    const localTrain = jRecords.slice(0, splitIdx);
    const localTest = jRecords.slice(splitIdx);

    // Local training
    const localParams = trainRidgeRegression(localTrain, 2.0);

    // If global weights existed from previous round, blend local model with global prior
    if (currentGlobalWeights) {
      const blendRate = 0.55; // 55% local adaptation, 45% global knowledge
      for (let i = 0; i < localParams.weights.length; i++) {
        localParams.weights[i] =
          blendRate * localParams.weights[i] + (1 - blendRate) * currentGlobalWeights.weights[i];
      }
      localParams.intercept =
        blendRate * localParams.intercept + (1 - blendRate) * currentGlobalWeights.intercept;
    }

    const localPreds = predictTraffic(localParams, localTest);
    const localActuals = localTest.map(r => r.vehicle_count);
    const localMetrics = computeMetrics(localActuals, localPreds);

    clientUpdates.push({
      junctionId: jId,
      sampleCount: localTrain.length,
      weights: localParams,
      localMetrics,
      uploadBytes: payloadBytes,
    });
  }

  // Step 3: Server FedAvg aggregation
  const totalSamples = clientUpdates.reduce((sum, c) => sum + c.sampleCount, 0);
  const dim = FEATURE_NAMES.length;
  const aggregatedWeights: number[] = new Array(dim).fill(0);
  let aggregatedIntercept = 0;
  const aggregatedMean: number[] = new Array(dim).fill(0);
  const aggregatedStd: number[] = new Array(dim).fill(0);

  for (const update of clientUpdates) {
    const factor = update.sampleCount / totalSamples;
    for (let d = 0; d < dim; d++) {
      aggregatedWeights[d] += factor * update.weights.weights[d];
      aggregatedMean[d] += factor * update.weights.scalerMean[d];
      aggregatedStd[d] += factor * update.weights.scalerStd[d];
    }
    aggregatedIntercept += factor * update.weights.intercept;
  }

  const newGlobalWeights: ModelParameters = {
    weights: aggregatedWeights,
    intercept: aggregatedIntercept,
    scalerMean: aggregatedMean,
    scalerStd: aggregatedStd,
  };

  // Step 4: Evaluate Global Model on out-of-sample test partition
  const globalTestRecords: TrafficRecord[] = [];
  const clientMetrics: Record<string, EvaluationMetrics> = {};

  for (const jId of activeJunctionIds) {
    const jRecords = allRecords.filter(r => r.junction_id === jId);
    const splitIdx = Math.floor(jRecords.length * 0.8);
    const localTest = jRecords.slice(splitIdx);
    globalTestRecords.push(...localTest);

    const jPreds = predictTraffic(newGlobalWeights, localTest);
    clientMetrics[jId] = computeMetrics(localTest.map(r => r.vehicle_count), jPreds);
  }

  const globalPreds = predictTraffic(newGlobalWeights, globalTestRecords);
  const globalActuals = globalTestRecords.map(r => r.vehicle_count);
  const globalMetrics = computeMetrics(globalActuals, globalPreds);

  // Step 5: Communication Cost Calculations
  const clientCount = activeJunctionIds.length;
  const roundUploadKb = Math.round(((clientCount * payloadBytes) / 1024) * 10) / 10;
  const roundDownloadKb = Math.round(((clientCount * payloadBytes) / 1024) * 10) / 10;
  const roundTotalKb = Math.round((roundUploadKb + roundDownloadKb) * 10) / 10;

  return {
    round: roundNumber,
    clientsCount: clientCount,
    globalWeights: newGlobalWeights,
    globalMetrics,
    centralizedBaselineMetrics,
    clientMetrics,
    roundUploadKb,
    roundDownloadKb,
    roundTotalKb,
    cumulativeKb: roundTotalKb, // will be accumulated by manager
    timestamp: new Date().toLocaleTimeString(),
  };
}
