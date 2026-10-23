import { BenchmarkItem } from '../types/audit';

export const BENCHMARK_DATASET_VERSION = '2026.Q1-EU-DEFRA-EPA-HYBRID';

export const BENCHMARK_CATALOG: BenchmarkItem[] = [
  {
    id: 'pkg-corrugated-recycled',
    name: 'Recycled Corrugated Packaging',
    category: 'Packaging Materials',
    benchmarkUnit: 'unit',
    benchmarkPrice: 1.20,
    currency: 'USD',
    carbonFactor: 0.45,
    carbonFactorUnit: 'kg CO₂e/unit',
    dataSource: 'DEFRA 2025 / Ecoinvent 3.10 Recycled Fibreboard Life Cycle Inventory',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: true,
    description: 'Post-consumer recycled corrugated cartons (single-wall B-flute, 400x300x250mm).',
    notes: 'Standardized baseline for light packaging procurement.'
  },
  {
    id: 'chem-solvent-grade-a',
    name: 'Industrial Solvent Grade A',
    category: 'Chemicals & Solvents',
    benchmarkUnit: 'L',
    benchmarkPrice: 18.50,
    currency: 'USD',
    carbonFactor: 4.20,
    carbonFactorUnit: 'kg CO₂e/L',
    dataSource: 'European Chemical Agency (ECHA) / ICIS Clean Solvent Benchmark 2025',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: true,
    description: 'High-purity organic solvent (technical grade >99.5% purity).',
    notes: 'Reference evidence shows average cradle-to-gate intensity of 4.20 kg CO₂e/L.'
  },
  {
    id: 'log-freight-coldchain-km',
    name: 'Cold-Chain Freight (Per Km)',
    category: 'Logistics & Freight',
    benchmarkUnit: 'km',
    benchmarkPrice: 2.10,
    currency: 'USD',
    carbonFactor: 1.15,
    carbonFactorUnit: 'kg CO₂e/km',
    dataSource: 'GLEC Framework v3.0 / Smart Freight Centre Refrigerated Road Transport',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: true,
    description: 'Temperature-controlled reefer road transportation (Class 8 diesel trailer, 2-8°C).',
    notes: 'Includes auxiliary cooling energy emissions factor.'
  },
  {
    id: 'ict-server-rack-unit',
    name: 'Cloud Server Rack Unit',
    category: 'ICT & Infrastructure',
    benchmarkUnit: 'unit',
    benchmarkPrice: 450.00,
    currency: 'USD',
    carbonFactor: 85.0,
    carbonFactorUnit: 'kg CO₂e/unit',
    dataSource: 'GHG Protocol ICT Sector Guidance / Open Compute Project Embodied Carbon Study',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: true,
    description: '1U enterprise rack compute server (amortized manufacturing + annualized operational impact).',
    notes: 'Assuming regional average grid carbon intensity of 380g CO₂e/kWh.'
  },
  {
    id: 'tex-cotton-organic-roll',
    name: 'Organic Cotton Textile Roll',
    category: 'Textiles & Apparel',
    benchmarkUnit: 'roll',
    benchmarkPrice: 32.00,
    currency: 'USD',
    carbonFactor: 3.10,
    carbonFactorUnit: 'kg CO₂e/roll',
    dataSource: 'Textile Exchange 2024 / Higg MSI Material Sustainability Index',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: true,
    description: 'GOTS-certified 100% organic unbleached woven cotton roll (50m x 1.4m).',
    notes: 'Standardized low-water cultivation profile.'
  },
  {
    id: 'pkg-pallet-wrap-bio',
    name: 'Biodegradable Pallet Wrap',
    category: 'Packaging Materials',
    benchmarkUnit: 'roll',
    benchmarkPrice: 45.00,
    currency: 'USD',
    carbonFactor: 2.80,
    carbonFactorUnit: 'kg CO₂e/roll',
    dataSource: 'Bioplastics Council / ASTM D6400 Certified Compostable Film Database',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: false,
    description: 'PLA-based compostable machine stretch film (500mm x 1500m x 23µm).',
    notes: 'Illustrative benchmark dataset for emerging circular packaging.'
  },
  {
    id: 'log-haulage-electric-km',
    name: 'Heavy Haulage Electric Truck (Per Km)',
    category: 'Logistics & Freight',
    benchmarkUnit: 'km',
    benchmarkPrice: 1.85,
    currency: 'USD',
    carbonFactor: 0.35,
    carbonFactorUnit: 'kg CO₂e/km',
    dataSource: 'ICCT Zero-Emission Freight Fleet Benchmark 2025',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: false,
    description: 'Battery-electric 40-tonne commercial tractor powered by renewable European mix.',
    notes: 'Illustrative low-carbon baseline comparison for green logistics tenders.'
  },
  {
    id: 'ict-cloud-compute-node',
    name: 'Renewable Cloud Compute Node',
    category: 'ICT & Infrastructure',
    benchmarkUnit: 'node-mo',
    benchmarkPrice: 280.00,
    currency: 'USD',
    carbonFactor: 12.5,
    carbonFactorUnit: 'kg CO₂e/node-mo',
    dataSource: 'Green Web Foundation / RE100 Verified Cloud Provider Metrics',
    datasetVersion: BENCHMARK_DATASET_VERSION,
    isVerified: false,
    description: 'Dedicated cloud virtual hypervisor slice running on 24/7 carbon-free energy match.',
    notes: 'Illustrative green cloud procurement benchmark.'
  }
];

/**
 * Scenario-specific reference data for Apex Industrial Chemicals:
 * Used to deterministically generate:
 * 1) Exactly 42% price markup:
 *    Benchmark is $18.50/L.
 *    Billed is $26.27/L -> ((26.27 - 18.50) / 18.50) * 100 = 42.0%
 * 2) Exactly 3.4x carbon-intensity discrepancy:
 *    Supplier claims an unverified "EcoSolv Clean Carbon" intensity of:
 *    1.23529 kg CO₂e/L (or 1,235.3 kg for 1,000 L).
 *    True reference benchmark factor is 4.20 kg CO₂e/L (4,200 kg total).
 *    Mismatch ratio = 4.20 / 1.23529 = 3.40x (3.4× mismatch)!
 */
export const APEX_SCENARIO_REFERENCE = {
  vendorName: 'Apex Industrial Chemicals',
  categoryId: 'chem-solvent-grade-a',
  quantity: 1000,
  unit: 'L',
  benchmarkUnitPrice: 18.50,
  billedUnitPrice: 26.27, // 42% markup
  expectedPriceMarkupPercent: 42.0,
  benchmarkCarbonFactor: 4.20, // kg CO2e / L
  claimedCarbonFactor: 1.235294, // kg CO2e / L
  claimedTotalCarbonKg: 1235.3,
  expectedBenchmarkCarbonKg: 4200.0,
  expectedCarbonMismatchRatio: 3.40, // 4.20 / 1.235294 = 3.4x
};
