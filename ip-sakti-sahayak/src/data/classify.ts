export type Origin = 'classical' | 'modified' | 'new' | 'extract' | 'food' | 'cosmetic'
export type YesNo = 'yes' | 'no'
export type ExportPlan = 'no' | 'yes' | 'unsure'

export type CategoryId = 'classical' | 'proprietary' | 'newdrug' | 'phyto' | 'aahar' | 'cosmetic'

export const ORIGIN_OPTIONS: { value: Origin; label: string; hint: string }[] = [
  { value: 'classical', label: 'Made exactly to a First Schedule text', hint: 'Same ingredients, proportions and method as a classical book, for example Triphala Churna from Sharngadhara Samhita.' },
  { value: 'modified', label: 'A modified classical formula', hint: 'You changed ingredients, ratios or dosage form, but every ingredient appears in the First Schedule books.' },
  { value: 'new', label: 'A new formula', hint: 'A new combination, a new ingredient not in the authoritative books, or a new indication or route.' },
  { value: 'extract', label: 'A standardised plant extract', hint: 'A purified or standardised fraction of a plant with defined markers, made for therapeutic use.' },
  { value: 'food', label: 'A food or nutraceutical', hint: 'An Ayurveda recipe meant to be eaten as food, such as a health drink, laddoo or soup mix.' },
  { value: 'cosmetic', label: 'A skin or hair product', hint: 'Oils, creams, shampoos or face packs meant for cleansing, beautifying or grooming.' },
]

export interface CategoryInfo {
  id: CategoryId
  name: string
  regulator: string
  route: string
  needs: string[]
  ip: string
  abs: string
  watchOut: string[]
  sources: string[]
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  classical: {
    id: 'classical',
    name: 'Classical Ayurvedic drug',
    regulator: 'State Licensing Authority (Ayush)',
    route: 'Manufacturing licence from your State Licensing Authority under Rule 153, for a drug made to a First Schedule text under s.3(a) of the Drugs and Cosmetics Act.',
    needs: [
      'Reference to the exact book, chapter and verse of the formulation',
      'GMP-compliant manufacturing unit (Schedule T)',
      'Label as per Rule 161, including "Ayurvedic medicine" and the reference text',
      'Quality testing from an approved drug testing laboratory',
    ],
    ip: 'The formula itself is traditional knowledge and cannot be patented (Patents Act s.3(p)). Protect your brand with a trade mark and your manufacturing know-how as a trade secret.',
    abs: 'Using codified traditional knowledge as written, and cultivated medicinal plants, is exempt from prior intimation for Indian entities after the 2023 amendment. Wild-collected plants may still need State Biodiversity Board intimation.',
    watchOut: [
      'Do not change ingredients or ratios and still call it classical.',
      'The generic classical name cannot be your trade mark.',
    ],
    sources: ['dc-act', 'patents-act', 'tm-act', 'bd-act'],
  },
  proprietary: {
    id: 'proprietary',
    name: 'Patent or Proprietary Ayurvedic medicine',
    regulator: 'State Licensing Authority (Ayush)',
    route: 'Licence under Rule 158-B for a patent or proprietary medicine (s.3(h)). You must submit safety and effectiveness evidence appropriate to the formulation.',
    needs: [
      'Rationale for each ingredient with references to First Schedule books',
      'Safety data, and proof of effectiveness as required by Rule 158-B',
      'Stability and shelf-life data',
      'GMP-compliant unit and label as per Rule 161',
    ],
    ip: 'Possibly patentable if the new composition shows a synergistic or unexpected effect beyond the known properties of its parts (s.3(e), s.3(p)). Expect TKDL to be searched. Also register a trade mark.',
    abs: 'If any plant is wild-collected or sourced from a biodiversity-rich area, check prior intimation to the State Biodiversity Board. Disclose the source of biological material in any patent.',
    watchOut: [
      '"Patent or proprietary" is a regulatory label, not a granted patent. Do not say "patented" unless you hold one.',
      'Keep evidence for every claim; Rule 158-B data is reviewed.',
    ],
    sources: ['dc-act', 'patents-act', 'bd-act', 'tkdl'],
  },
  newdrug: {
    id: 'newdrug',
    name: 'New ASU drug',
    regulator: 'Ministry of Ayush and State Licensing Authority',
    route: 'Treated as a new drug under the ASU provisions of the Drugs Rules. Expect to provide non-clinical safety studies and clinical evidence before a licence is issued.',
    needs: [
      'Pre-clinical toxicity studies',
      'Clinical trial data for the claimed indication',
      'Detailed manufacturing and quality specifications',
      'Ethics committee approvals for any human studies',
    ],
    ip: 'The strongest candidate for a patent if the combination or use is genuinely new and inventive. File before any publication, conference talk or clinical trial registration.',
    abs: 'A new ingredient sourced from Indian biodiversity will normally need State Biodiversity Board intimation (Indian entity) or NBA approval (foreign entity), and NBA involvement before any patent is granted.',
    watchOut: [
      'Publishing trial results before filing can destroy novelty.',
      'Budget for longer timelines than classical or proprietary routes.',
    ],
    sources: ['dc-act', 'patents-act', 'bd-act', 'pct'],
  },
  phyto: {
    id: 'phyto',
    name: 'Phytopharmaceutical drug',
    regulator: 'CDSCO (Drugs Controller General of India)',
    route: 'Regulated as a modern drug, not an Ayush drug. Approval from CDSCO under the New Drugs and Clinical Trials Rules, 2019, with phased clinical trials.',
    needs: [
      'Defined, standardised extract with at least four bioactive or phytochemical markers',
      'Safety and toxicology studies',
      'Phase-wise clinical trials',
      'Plant identity, cultivation and extraction documentation',
    ],
    ip: 'Process patents for extraction and standardisation, and product patents for new, inventive fractions, are commonly granted. Disclose the biological source.',
    abs: 'Extracts from Indian plants for commercial use need State Biodiversity Board intimation (Indian entity) or NBA approval (foreign entity).',
    watchOut: [
      'This is not an Ayush licence route; Ayurvedic labelling rules do not apply.',
      'Changing the extraction process can change the approved product.',
    ],
    sources: ['dc-act', 'patents-act', 'bd-act'],
  },
  aahar: {
    id: 'aahar',
    name: 'Ayurveda Aahar (food)',
    regulator: 'FSSAI',
    route: 'Food licence from FSSAI under the Food Safety and Standards (Ayurveda Aahar) Regulations, 2022. Prior approval is needed for recipes not in Schedule A.',
    needs: [
      'Reference to an authoritative Ayurveda book for the recipe',
      'FSSAI licence and the Ayurveda Aahar logo on the label',
      'Label statements on intended use and target group',
    ],
    ip: 'A recipe from the books is not patentable. Use a trade mark for the brand and trade secrets for production know-how.',
    abs: 'Cultivated ingredients bought from the market are generally not an ABS concern for Indian entities; wild-collected ingredients may be.',
    watchOut: [
      'You cannot claim to treat or prevent any disease. That turns the product into a drug.',
      'Some Ayurveda Aahar products are not permitted for children under two.',
    ],
    sources: ['fssai-aahar', 'dmr-act', 'tm-act'],
  },
  cosmetic: {
    id: 'cosmetic',
    name: 'Cosmetic',
    regulator: 'CDSCO and State Licensing Authority',
    route: 'Cosmetic manufacturing licence under the Cosmetics Rules, 2020. If you want therapeutic claims, it must instead be licensed as an Ayurvedic drug.',
    needs: [
      'Cosmetic manufacturing licence',
      'Ingredient list following Bureau of Indian Standards norms',
      'Label with ingredients, batch, expiry and manufacturer details',
    ],
    ip: 'Trade marks and packaging designs are the main protection. A genuinely new formulation or process may be patentable.',
    abs: 'Commercial use of Indian plant ingredients may need State Biodiversity Board intimation unless the plants are cultivated.',
    watchOut: [
      'Words like "cures dandruff" or "treats eczema" are drug claims.',
      '"Ayurvedic" on a cosmetic label should be backed by ingredients and references.',
    ],
    sources: ['dc-act', 'tm-act', 'bd-act'],
  },
}

export const ORIGIN_TO_CATEGORY: Record<Origin, CategoryId> = {
  classical: 'classical',
  modified: 'proprietary',
  new: 'newdrug',
  extract: 'phyto',
  food: 'aahar',
  cosmetic: 'cosmetic',
}

export interface ClassifyAnswers {
  origin: Origin
  diseaseClaim: YesNo
  exportPlan: ExportPlan
}

export interface ClassifyResult {
  category: CategoryInfo
  extraWatchOut: string[]
  exportNotes: string[]
}

export function classify(a: ClassifyAnswers): ClassifyResult {
  const category = CATEGORIES[ORIGIN_TO_CATEGORY[a.origin]]
  const extraWatchOut: string[] = []
  const exportNotes: string[] = []

  if (a.diseaseClaim === 'yes') {
    if (category.id === 'aahar' || category.id === 'cosmetic') {
      extraWatchOut.push(
        `A disease claim is not allowed for a ${category.id === 'aahar' ? 'food' : 'cosmetic'}. Either remove it or license the product as an Ayurvedic drug.`,
      )
    } else {
      extraWatchOut.push(
        'Check every disease claim against the Drugs and Magic Remedies Act Schedule. Claims to treat diseases such as diabetes, cancer or obesity cannot be advertised.',
      )
    }
  }

  if (a.exportPlan !== 'no') {
    exportNotes.push(
      'Most importing countries ask for a WHO-GMP certificate and a Certificate of Pharmaceutical Product (CoPP) from the licensing authority.',
      'EU: consider registration as a traditional herbal medicinal product (Directive 2004/24/EC), which limits claims to minor conditions.',
      'US: most products are sold as dietary supplements under DSHEA, with structure or function claims only.',
      'File trade marks abroad through the Madrid System before you ship, not after.',
    )
    if (a.exportPlan === 'unsure') {
      exportNotes.unshift('You said you are not sure yet. These steps take months, so plan them early if export is possible.')
    }
  }

  return { category, extraWatchOut, exportNotes }
}

export const COMPARISON_ROWS: { label: string; values: Record<CategoryId, string> }[] = [
  {
    label: 'Regulator',
    values: {
      classical: 'State Ayush authority',
      proprietary: 'State Ayush authority',
      newdrug: 'Ayush and State authority',
      phyto: 'CDSCO',
      aahar: 'FSSAI',
      cosmetic: 'CDSCO and State',
    },
  },
  {
    label: 'Disease claims',
    values: {
      classical: 'As per text, within DMR Act',
      proprietary: 'With evidence, within DMR Act',
      newdrug: 'As approved',
      phyto: 'As approved',
      aahar: 'Not allowed',
      cosmetic: 'Not allowed',
    },
  },
  {
    label: 'Clinical data',
    values: {
      classical: 'Not usually required',
      proprietary: 'Some evidence',
      newdrug: 'Required',
      phyto: 'Phased trials',
      aahar: 'Not required',
      cosmetic: 'Safety only',
    },
  },
  {
    label: 'Patent likely?',
    values: {
      classical: 'No',
      proprietary: 'Sometimes',
      newdrug: 'Often',
      phyto: 'Often',
      aahar: 'Rarely',
      cosmetic: 'Sometimes',
    },
  },
  {
    label: 'Typical time to market',
    values: {
      classical: '2-4 months',
      proprietary: '4-8 months',
      newdrug: '2-4 years',
      phyto: '3-6 years',
      aahar: '1-3 months',
      cosmetic: '1-3 months',
    },
  },
]
