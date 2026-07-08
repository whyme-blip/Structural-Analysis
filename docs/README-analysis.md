# Evidence Engine

The Evidence Engine evaluates the geometric agreement between the computed β-axis and independent field observations.

## Inputs

- phase.results.beta
- phase.foldAxes
- phase.linearRecords

## Outputs

The engine fills:

phase.results.beta.agreement

with:

- betaVsFoldAxis
- betaVsLineation
- foldAxisVsLineation
- overallAgreement

Each agreement contains:

- delta (degrees)
- grade
- description
- interpretation

## Grade Scale

| Angular Difference | Grade |
|--------------------|--------|
| <5° | EXCELLENT |
| 5–10° | GOOD |
| 10–15° | FAIR |
| >15° | POOR |

The overall agreement is the worst (most conservative) of the available comparisons.

This module never modifies the β-axis. It only evaluates the consistency of the β-axis with measured structural evidence.
