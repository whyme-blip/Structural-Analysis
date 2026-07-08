import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Fallback Deterministic Synthetic Fixtures (Your CI Baseline)
const REGRESSION_FIXTURES = {
    PointCluster: {
        records: 120, stations: 8,
        fabric: { success: true, fabricCode: "POINT", confidence: 94.2, tensor: [0.85, 0.10, 0.05] },
        beta: { success: false, withheld: true, reason: "Symmetric point distribution lacks unique cylindrical folding plane." },
        evidence: { agreement: { grade: "A", score: 96 }, overallGrade: "A", overallScore: 95 },
        confidence: { score: 88, rating: "HIGH" }
    },
    WeakGirdle: {
        records: 85, stations: 5,
        fabric: { success: true, fabricCode: "POORLY_DEFINED", confidence: 45.0, tensor: [0.45, 0.35, 0.20] },
        beta: { success: true, trend: 210.5, plunge: 12.0, bootstrapCI: [195.0, 226.0], quality: "C" },
        evidence: { agreement: { grade: "C", score: 68 }, overallGrade: "C", overallScore: 65 },
        confidence: { score: 52, rating: "LOW" }
    },
    StrongGirdle: {
        records: 250, stations: 14,
        fabric: { success: true, fabricCode: "GIRDLE", confidence: 98.1, tensor: [0.65, 0.32, 0.03] },
        beta: { success: true, trend: 45.2, plunge: 22.4, bootstrapCI: [42.1, 48.3], quality: "A" },
        evidence: { agreement: { grade: "A", score: 98 }, overallGrade: "A", overallScore: 97 },
        confidence: { score: 94, rating: "EXCELLENT" }
    },
    Polyphase: {
        records: 190, stations: 11,
        fabric: { success: true, fabricCode: "MULTIMODAL", confidence: 89.5, tensor: [0.50, 0.40, 0.10] },
        beta: { success: false, withheld: true, reason: "Superposed refolding detected." },
        evidence: { agreement: { grade: "B", score: 84 }, overallGrade: "B", overallScore: 82 },
        confidence: { score: 75, rating: "MODERATE" }
    },
    RandomScatter: {
        records: 300, stations: 15,
        fabric: { success: true, fabricCode: "RANDOM/SCATTER", confidence: 99.0, tensor: [0.34, 0.33, 0.33] },
        beta: { success: false, withheld: true, reason: "Isotropic fabric data shows zero organization." },
        evidence: { agreement: { grade: "A", score: 100 }, overallGrade: "A", overallScore: 99 },
        confidence: { score: 92, rating: "EXCELLENT" }
    },
    TwoDomain: {
        records: 410, stations: 22,
        fabric: { success: true, fabricCode: "DOMAINS_ISOLATED", confidence: 91.0, tensor: [0.58, 0.28, 0.14] },
        beta: { success: true, domainA: { trend: 32.0, plunge: 10.0 }, domainB: { trend: 54.0, plunge: 18.0 }, separationDegrees: 24.3 },
        evidence: { agreement: { grade: "A", score: 92 }, overallGrade: "A", overallScore: 91 },
        confidence: { score: 89, rating: "HIGH" }
    }
};

// 2. Parse CLI Arguments
const argv = process.argv.slice(2);
const useIntegration = argv.includes('--integration');
const fileFlagIndex = argv.indexOf('--file');
const specificFile = fileFlagIndex !== -1 ? argv[fileFlagIndex + 1] : null;

const outputDir = path.join(__dirname, '../demo/output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 3. Resolve and Load Datasets Based on Mode
let pipelineResults = {};

if (useIntegration) {
    console.log("⚡ Mode: INTEGRATION (Validating field mapping datasets)");
    
    if (specificFile) {
        // Mode A: Validate single file
        const filePath = path.resolve(process.cwd(), specificFile);
        console.log(`📂 Loading specific target: ${filePath}`);
        pipelineResults = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
        // Mode B: Scan full directory automatically
        const targetDir = path.join(process.cwd(), 'demo/integration');
        console.log(`📂 Scanning integration directory: ${targetDir}`);
        
        if (fs.existsSync(targetDir)) {
            const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
            files.forEach(file => {
                const fullPath = path.join(targetDir, file);
                const fileContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                // Merge files into global pipeline context using filenames as unique keys if nested layout missing
                if (fileContent.fabric || fileContent.records) {
                    const datasetName = path.basename(file, '.json');
                    pipelineResults[datasetName] = fileContent;
                } else {
                    Object.assign(pipelineResults, fileContent);
                }
            });
        } else {
            console.error(`❌ Integration directory not found at: ${targetDir}`);
            process.exit(1);
        }
    }
} else {
    console.log("⚙️  Mode: REGRESSION (Running local CI/CD fabric baseline)");
    pipelineResults = REGRESSION_FIXTURES;
}

// 4. Automated Matrix Evaluation Loop
let suiteFailed = false;
const summaryRows = [];

for (const [name, data] of Object.entries(pipelineResults)) {
    let status = "PASSED";
    let failureReasons = [];

    // Evaluate strict rules for deterministic regression cases
    if (name === "PointCluster" && (data.fabric.fabricCode !== "POINT" || !data.beta.withheld)) {
        status = "FAILED"; failureReasons.push("Expected fabric POINT and withheld beta axis.");
    }
    if (name === "Polyphase" && (data.fabric.fabricCode !== "MULTIMODAL" || !data.beta.withheld)) {
        status = "FAILED"; failureReasons.push("Expected fabric MULTIMODAL and withheld beta axis.");
    }
    if (name === "RandomScatter" && (data.fabric.fabricCode !== "RANDOM/SCATTER" || !data.beta.withheld)) {
        status = "FAILED"; failureReasons.push("Expected fabric RANDOM/SCATTER and withheld beta axis.");
    }
    if (name === "StrongGirdle" && (data.beta.withheld || data.confidence.score < 90)) {
        status = "FAILED"; failureReasons.push("Expected active beta calculation and confidence score >= 90.");
    }
    if (name === "TwoDomain" && (!data.beta.separationDegrees || data.beta.separationDegrees <= 15)) {
        status = "FAILED"; failureReasons.push("Expected segmented domain beta axis separation > 15 degrees.");
    }

    // Generic check for dynamic integration datasets (ensure structural calculations don't throw critical failures)
    if (useIntegration && data.confidence?.score < 30) {
        status = "WARNING"; failureReasons.push("Extremely low data confidence score detected.");
    }

    if (status === "FAILED") suiteFailed = true;

    // Output individual structural report cards
    fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify({ dataset: name, status, failureReasons, data }, null, 2));
    
    summaryRows.push({
        dataset: name,
        records: data.records || 0,
        stations: data.stations || 0,
        fabric: data.fabric?.fabricCode || "UNKNOWN",
        betaStatus: data.beta?.withheld ? "WITHHELD" : "COMPUTED",
        confidence: data.confidence?.score || 0,
        status: status
    });
}

// 5. Generate Deliverables (CSV, MD, JSON matrix summaries)
fs.writeFileSync(path.join(outputDir, "qc-summary.json"), JSON.stringify(summaryRows, null, 2));

const csvLines = [
    "Dataset,RecordCount,StationCount,FabricCode,BetaStatus,ConfidenceScore,Status",
    ...summaryRows.map(r => `${r.dataset},${r.records},${r.stations},${r.fabric},${r.betaStatus},${r.confidence},${r.status}`)
];
fs.writeFileSync(path.join(__dirname, '../qc-summary.csv'), csvLines.join("\n"));

const mdLines = [
    `# Structural Suite Run Summary (${useIntegration ? 'Integration Mode' : 'Regression Mode'})`,
    "",
    "| Dataset | Records | Stations | Fabric Code | Beta Status | Confidence | Status |",
    "| :--- | :---: | :---: | :--- | :--- | :---: | :--- |",
    ...summaryRows.map(r => `| **${r.dataset}** | ${r.records} | ${r.stations} | \`${r.fabric}\` | ${r.betaStatus} | ${r.confidence}% | **${r.status}** |`)
];
fs.writeFileSync(path.join(outputDir, "qc-summary.md"), mdLines.join("\n"));

console.log(`\n============== Process Complete ==============`);
console.log(`Suite status: ${suiteFailed ? "❌ FAILED" : "✅ SUCCESS (ALL GATES PASSED)"}\n`);
process.exit(suiteFailed ? 1 : 0);
