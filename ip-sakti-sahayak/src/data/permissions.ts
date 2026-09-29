import type { DataSourcePermission, FacilitatorRequest } from '../types'

export const DEFAULT_PERMISSIONS: DataSourcePermission[] = [
  { id: 'ipindia', name: 'IP India', description: 'Patent, trade mark, design and GI registers from the Controller General of Patents, Designs and Trade Marks.', kind: 'free', enabled: true },
  { id: 'tkdl-overview', name: 'TKDL overview', description: 'Public overview and metadata from the Traditional Knowledge Digital Library.', kind: 'free', enabled: true },
  { id: 'nba', name: 'National Biodiversity Authority', description: 'ABS approvals, forms and notified guidelines.', kind: 'free', enabled: true },
  { id: 'wipo', name: 'WIPO', description: 'PATENTSCOPE, treaty texts and the Madrid and Hague registers.', kind: 'free', enabled: true },
  { id: 'derwent', name: 'Derwent Innovation', description: 'Your organisation\'s paid patent analytics subscription.', kind: 'paid', enabled: false },
  { id: 'orbit', name: 'Questel Orbit', description: 'Your organisation\'s paid patent search subscription.', kind: 'paid', enabled: false },
  { id: 'patbase', name: 'PatBase', description: 'Your organisation\'s paid patent family database.', kind: 'paid', enabled: false },
  { id: 'scc', name: 'SCC Online', description: 'Your paid Indian case law subscription.', kind: 'paid', enabled: false },
]

export const SEED_REQUESTS: FacilitatorRequest[] = [
  {
    id: 'REQ-2026-0412',
    name: 'Meera Pillai',
    contact: 'meera.p@example.in',
    topic: 'Geographical indications',
    message: 'Our Kerala producers\' cooperative wants to know whether we can apply for a GI for a medicated rice gruel mix.',
    createdAt: '2026-09-02T10:15:00+05:30',
    status: 'Resolved',
    facilitator: 'IPFC Thiruvananthapuram',
  },
  {
    id: 'REQ-2026-0457',
    name: 'Meera Pillai',
    contact: 'meera.p@example.in',
    topic: 'Access and benefit sharing',
    message: 'Do we need to inform the State Biodiversity Board if we buy cultivated Shatavari from a trader?',
    createdAt: '2026-09-21T16:40:00+05:30',
    status: 'Assigned',
    facilitator: 'IPFC Kochi',
  },
]

export const FACILITATOR_TOPICS = [
  'Patents',
  'Geographical indications',
  'Trade marks',
  'Access and benefit sharing',
  'Advertising and labelling',
  'Budapest Treaty deposits',
  'Product classification',
  'Something else',
]
