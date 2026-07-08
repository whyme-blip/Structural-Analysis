// src/analysis/evidenceEngine.js
// Evidence Engine (Stage 3.5B)
// Consumes phase.results.beta (frozen schema), phase.foldAxes, phase.linearRecords
// Computes angular agreements:
//   Δ(β, Fold Axis)
//   Δ(β, Lineation)
//   Δ(Fold Axis, Lineation)
// Populates phase.results.beta.agreement

import { trendPlungeToVector, angularDistance } from '../core/geometry.js';
import { fisherMeanDirection } from '../core/statistics.js';

function gradeFromAngle(angleDeg) {
  if (angleDeg == null)
    return { grade: null, description: null };

  if (angleDeg < 5)
    return {
      grade: 'EXCELLENT',
      description:
        'Perfect geometric symmetry; structures are highly co-axial.'
    };

  if (angleDeg < 10)
    return {
      grade: 'GOOD',
      description:
        'Strong structural correlation; minor regional variation or collection noise.'
    };

  if (angleDeg < 15)
    return {
      grade: 'FAIR',
      description:
        'Moderate deviation; structural fabric may possess mild non-cylindricity or overprinting.'
    };

  return {
    grade: 'POOR',
    description:
      'Severe geometric mismatch; indicates misidentified generations or strongly non-cylindrical deformation.'
  };
}

function worstGrade(grades) {

  const order = {
    POOR: 0,
    FAIR: 1,
    GOOD: 2,
    EXCELLENT: 3
  };

  let worst = null;
  let value = Infinity;

  grades.forEach(g => {
    if (!g || !g.grade) return;

    const v = order[g.grade];

    if (v < value) {
      value = v;
      worst = g;
    }
  });

  return worst;
}

function vectorFromBeta(beta) {

  if (!beta?.vector?.lowerHemisphere)
    return null;

  const v = beta.vector.lowerHemisphere;

  return [v.x, v.y, v.z];
}

function vectorsFromRecords(records) {

  if (!Array.isArray(records))
    return [];

  const vectors = [];

  for (const r of records) {

    if (Array.isArray(r.vector))
      vectors.push(r.vector);

    else if (r.vector?.x !== undefined)
      vectors.push([r.vector.x, r.vector.y, r.vector.z]);
  }

  return vectors;
}

export function computeEvidence(phase) {

  const warnings = [];
  const errors = [];

  if (!phase) {

    errors.push({
      code: 'invalid_phase',
      message: 'Phase object required.'
    });

    return {
      success: false,
      warnings,
      errors,
      data: null
    };
  }

  const beta = phase?.results?.beta;

  if (!beta) {

    errors.push({
      code: 'missing_beta',
      message: 'phase.results.beta is missing.'
    });

    return {
      success: false,
      warnings,
      errors,
      data: null
    };
  }

  const agreement = {

    betaVsFoldAxis: null,
    betaVsLineation: null,
    foldAxisVsLineation: null,
    overallAgreement: null

  };

  const betaVector = vectorFromBeta(beta);

  if (!beta.calculated || !betaVector) {

    beta.agreement = agreement;
    beta.hasFoldAxisEvidence = false;
    beta.hasLineationEvidence = false;

    warnings.push(
      'Beta axis unavailable. Agreement calculations skipped.'
    );

    return {
      success: true,
      warnings,
      errors,
      data: beta
    };
  }

  // ---------- Fold Axis ----------

  const foldVectors = vectorsFromRecords(phase.foldAxes);

  let foldMean = null;

  if (foldVectors.length > 0) {

    const fisher = fisherMeanDirection(foldVectors);

    foldMean = trendPlungeToVector(
      fisher.trend,
      fisher.plunge
    );

    const delta = angularDistance(betaVector, foldMean);

    const grade = gradeFromAngle(delta);

    agreement.betaVsFoldAxis = {

      delta,
      grade: grade.grade,
      description: grade.description,
      interpretation: grade.description

    };
  }

  // ---------- Lineations ----------

  const lineVectors = vectorsFromRecords(
    phase.linearRecords
  );

  let lineMean = null;

  if (lineVectors.length > 0) {

    const fisher = fisherMeanDirection(lineVectors);

    lineMean = trendPlungeToVector(
      fisher.trend,
      fisher.plunge
    );

    const delta = angularDistance(betaVector, lineMean);

    const grade = gradeFromAngle(delta);

    agreement.betaVsLineation = {

      delta,
      grade: grade.grade,
      description: grade.description,
      interpretation: grade.description

    };
  }

  // ---------- Fold Axis vs Lineation ----------

  if (foldMean && lineMean) {

    const delta = angularDistance(
      foldMean,
      lineMean
    );

    const grade = gradeFromAngle(delta);

    agreement.foldAxisVsLineation = {

      delta,
      grade: grade.grade,
      description: grade.description,
      interpretation: grade.description

    };
  }

  const grades = [

    agreement.betaVsFoldAxis,
    agreement.betaVsLineation,
    agreement.foldAxisVsLineation

  ].filter(Boolean);

  if (grades.length) {

    const overall = worstGrade(grades);

    agreement.overallAgreement = {

      grade: overall.grade,
      description: overall.description

    };
  }

  beta.agreement = agreement;

  beta.hasFoldAxisEvidence =
    foldVectors.length > 0;

  beta.hasLineationEvidence =
    lineVectors.length > 0;

  return {

    success: true,
    warnings,
    errors,
    data: beta

  };
}
