// ============================================================
// PredictionCard: AI/ML predictive analytics card for road disruptions
// ============================================================

import React from 'react';
import { Sparkles, Brain, AlertCircle, TrendingUp, ShieldAlert, ArrowRight } from 'lucide-react';
import { type DisruptionPrediction } from '../../lib/aiEngine';
import RiskGauge from '../common/RiskGauge';
import DataProvenance from '../common/DataProvenance';

interface PredictionCardProps {
  prediction: DisruptionPrediction;
  onTakeAction?: (prediction: DisruptionPrediction) => void;
}

export default function PredictionCard({ prediction, onTakeAction }: PredictionCardProps) {
  const isHighRisk = prediction.probability >= 65;

  return (
    <div className={`border bg-white ${
      isHighRisk ? 'border-[#7A1F1F]' : 'border-[#FF9933]'
    } p-4`}>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-0.5 border ${
              isHighRisk ? 'bg-[#7A1F1F] border-[#7A1F1F]' : 'bg-[#0B3D6D] border-[#0B3D6D]'
            }`}>
              <Sparkles size={11} />
              PREDICTIVE FORECAST • {prediction.timeframe}
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Confidence: <strong className="text-green-800 font-bold">{prediction.confidence}%</strong>
            </span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border text-[#B45309] bg-amber-50 border-amber-600 hidden sm:inline-flex">
              PREDICTED
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mt-1">
            {prediction.type === 'landslide' ? '⛰️ Landslide Probability' : '🌊 Flash Flood Threat'} — {prediction.location}
          </h4>

          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
            {prediction.recommendation}
          </p>

          {/* Item 4 — hybrid signal mix (rules + ML + field reports) */}
          {(prediction as any).probabilityBreakdown && (
            <div className="mt-3 p-2.5 border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <span>Hybrid signal mix</span>
                <span>{(((prediction as any).probabilityBreakdown as any).final ?? prediction.probability)}% probability</span>
              </div>
              <div className="mt-1.5 flex h-1.5 w-full overflow-hidden border border-slate-200">
                <div className="bg-[#0B3D6D]" style={{ width: `${((prediction as any).probabilityBreakdown.rules / 100) * 100}%` }} title={`Rules ${(prediction as any).probabilityBreakdown.rules}%`} />
                <div className="bg-[#FF9933]" style={{ width: `${((prediction as any).probabilityBreakdown.ml / 100) * 100}%` }} title={`ML ${(prediction as any).probabilityBreakdown.ml}%`} />
                <div className="bg-emerald-600" style={{ width: `${((prediction as any).probabilityBreakdown.field / 100) * 100}%` }} title={`Field ${(prediction as any).probabilityBreakdown.field}%`} />
              </div>
              <div className="mt-1 flex items-center gap-3 text-[9px] font-mono text-slate-500">
                <span><span className="inline-block w-2 h-2 bg-[#0B3D6D]" /> rules {(prediction as any).probabilityBreakdown.rules}%</span>
                <span><span className="inline-block w-2 h-2 bg-[#FF9933]" /> ML {(prediction as any).probabilityBreakdown.ml}%</span>
                <span><span className="inline-block w-2 h-2 bg-emerald-600" /> field {(prediction as any).probabilityBreakdown.field}%</span>
              </div>
            </div>
          )}

          {/* Key Drivers */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {prediction.factors.map((factor, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-50 text-slate-800 px-2.5 py-1 border border-slate-300"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Risk Gauge */}
        <div className="flex-shrink-0 self-center sm:self-start">
          <RiskGauge score={prediction.probability} size={70} strokeWidth={6} label="Disruption Risk" />
        </div>
      </div>

      {/* Affected Corridors */}
      <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
          <span className="font-bold text-slate-900 flex-shrink-0">Target Corridors:</span>
          <span className={`font-bold truncate max-w-[180px] sm:max-w-[220px] lg:max-w-[280px] ${
            isHighRisk ? 'text-[#7A1F1F]' : 'text-[#B45309]'
          }`}>
            {prediction.affectedRoutes.join(', ')}
          </span>
        </div>

        <button
          onClick={() => onTakeAction?.(prediction)}
          className="gov-btn flex-shrink-0 self-start sm:self-auto"
        >
          <span>Divert Fleet</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Provenance — where this estimate came from */}
      <div className="mt-2 pt-2 border-t border-slate-100">
        <DataProvenance
          source="PREDICTED"
          basis="rainfall + terrain + soil-saturation + historical district risk (documented rule model — not a neural network)"
          confidence={prediction.confidence}
          updatedBy="Pathly Risk Model"
        />
      </div>
    </div>
  );
}
