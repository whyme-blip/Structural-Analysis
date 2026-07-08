# Analysis Pipeline README

This document describes the canonical analysisPipeline object that Stage 3 routers produce. This shape is frozen for Version 1.0.0 — downstream modules must not assume any additional fields and should rely only on the reserved structure.

Top-level analysisPipeline schema

- metadata: information about the pipeline run (generatedAt, parserVersion, softwareVersion, sampleCount)
- inventory: lists of stations, domains, lithologies, generations
- phases: object with keys F1, F2, F3 (each phase object follows the same schema)
- global: reserved container for regional/aggregate results

Phase object schema (frozen)

F1: {
  metadata: { phase, parserVersion, softwareVersion, generatedAt, sampleCount },
  planarRecords: [],
  linearRecords: [],
  foldAxes: [],
  stations: [],
  domains: { <domainName>: { metadata, planarRecords, linearRecords, foldAxes, stations, derived, results } },
  derived: { betaAxis, fisherMeanPole, meanFoldAxis, meanLineation, girdlePole },
  results: { tensor, eigen, woodcock, fisher, bootstrap, beta, evidence, confidence, interpretation, recommendations, limitations, qc }
}

Notes:
- The results.* fields are reserved and initialized to null or empty arrays. Downstream analysis modules MUST write into results rather than creating new top-level properties.
- A validator (src/validator/validator.js) is provided to ensure the shape is present and to fill missing placeholders with nulls.
- The integration fixture (demo/integration/phase-routing-example.json) is the canonical regression dataset and will be used in CI to verify API stability.
