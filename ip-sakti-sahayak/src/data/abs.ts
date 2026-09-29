import type { Jurisdiction } from '../types'

export type Actor = 'indian' | 'foreign' | 'unsure'
export type Purpose = 'research' | 'commercial' | 'patent'
export type Codified = 'yes' | 'no' | 'unsure'

export interface AbsAnswers {
  actor: Actor
  purpose: Purpose
  codified: Codified
}

export interface AbsStep {
  title: string
  detail: string
  citations: string[]
  tag?: 'exempt' | 'required' | 'check'
}

export const ACTOR_OPTIONS: { value: Actor; label: string; hint: string }[] = [
  { value: 'indian', label: 'An Indian entity', hint: 'An Indian citizen, or a company registered and controlled in India.' },
  { value: 'foreign', label: 'A foreign entity', hint: 'A non-resident, or a company with foreign shareholding or management control.' },
  { value: 'unsure', label: 'Not sure', hint: 'For example an Indian company with some foreign investment.' },
]

export const PURPOSE_OPTIONS: { value: Purpose; label: string; hint: string }[] = [
  { value: 'research', label: 'Research', hint: 'Laboratory study, survey or academic work with no product yet.' },
  { value: 'commercial', label: 'Commercial use', hint: 'Making and selling a product, including contract manufacturing.' },
  { value: 'patent', label: 'Patent filing', hint: 'Applying for a patent or other IP based on the resource or knowledge.' },
]

export const CODIFIED_OPTIONS: { value: Codified; label: string; hint: string }[] = [
  { value: 'yes', label: 'Yes, codified and used as written', hint: 'Taken from an authoritative Ayurveda text and used without change.' },
  { value: 'no', label: 'No', hint: 'Oral or community knowledge, or you have modified the codified use.' },
  { value: 'unsure', label: 'Not sure', hint: 'We will show the steps that apply in both cases.' },
]

export function absSteps(a: AbsAnswers, j: Jurisdiction): AbsStep[] {
  if (j === 'international') return internationalSteps(a)

  const steps: AbsStep[] = []
  const foreign = a.actor !== 'indian'

  steps.push({
    title: 'Identify every biological resource and its origin',
    detail: 'List each plant, animal or microbial material, where it was collected, and whether it was cultivated or wild. Keep purchase invoices and collection records.',
    citations: ['bd-act'],
    tag: 'required',
  })

  if (a.actor === 'unsure') {
    steps.push({
      title: 'Check whether you count as a foreign-controlled entity',
      detail: 'After the 2023 amendment, an Indian company can be treated as foreign-controlled depending on its shareholding and management, as defined under the Foreign Exchange Management Act. Ask your company secretary to confirm before choosing a route.',
      citations: ['bd-act'],
      tag: 'check',
    })
  }

  if (a.codified !== 'no' && !foreign) {
    steps.push({
      title: a.codified === 'yes' ? 'Record that you rely on the codified traditional knowledge exemption' : 'Check whether the codified knowledge exemption applies',
      detail: 'Indian entities using codified traditional knowledge as written, or cultivated medicinal plants and their products, are exempt from prior intimation after the 2023 amendment. Keep the book, chapter and verse reference on file.',
      citations: ['bd-act'],
      tag: 'exempt',
    })
  }

  if (foreign) {
    steps.push({
      title: 'Apply to the National Biodiversity Authority for prior approval',
      detail: 'Foreign-controlled entities need NBA approval before obtaining Indian biological resources or associated knowledge, for research or commercial use. Apply online on the NBA portal with the prescribed form and fee.',
      citations: ['bd-act', 'abs-regs'],
      tag: 'required',
    })
  } else if (a.purpose === 'commercial' && a.codified !== 'yes') {
    steps.push({
      title: 'Give prior intimation to your State Biodiversity Board',
      detail: 'Indian entities using biological resources for commercial purposes inform the State Biodiversity Board before starting, unless an exemption applies. The Board may set benefit-sharing terms.',
      citations: ['bd-act'],
      tag: 'required',
    })
  }

  if (a.purpose === 'research' && !foreign) {
    steps.push({
      title: 'No approval is normally needed for research by Indian entities',
      detail: 'Research by Indian citizens or entities does not need NBA approval. You will need approval if you transfer research results to a foreign entity for money or commercial benefit.',
      citations: ['bd-act'],
      tag: 'exempt',
    })
  }

  if (a.purpose === 'patent') {
    steps.push({
      title: foreign ? 'Get NBA approval before the patent is granted' : 'Register with the NBA before the patent is granted',
      detail: 'After the 2023 amendment, the NBA check happens before grant, not before filing. You can file first, but the Patent Office will not grant until NBA clearance is shown.',
      citations: ['bd-act', 'patents-act'],
      tag: 'required',
    })
    steps.push({
      title: 'Disclose the source and geographical origin in your patent',
      detail: 'State where the biological material came from in the specification. Non-disclosure is a ground for opposition and revocation.',
      citations: ['patents-act'],
      tag: 'required',
    })
  }

  if (a.purpose === 'commercial' || a.purpose === 'patent') {
    steps.push({
      title: 'Agree benefit-sharing terms',
      detail: 'Benefit sharing is agreed with the NBA or the State Board and is often a small percentage of annual ex-factory sales, or a lump sum. Keep the signed agreement with your product records.',
      citations: ['abs-regs', 'bd-act'],
      tag: a.codified === 'yes' && !foreign ? 'check' : 'required',
    })
  }

  steps.push({
    title: 'Keep an ABS file for audits and buyers',
    detail: 'Store approvals, intimations, invoices, collection records and agreements together. Export buyers increasingly ask for them.',
    citations: ['bd-act', 'nagoya'],
    tag: 'check',
  })

  return steps
}

function internationalSteps(a: AbsAnswers): AbsStep[] {
  const steps: AbsStep[] = [
    {
      title: 'Find the provider country\'s ABS rules',
      detail: 'For resources from outside India, check the provider country\'s national focal point and competent authority on the ABS Clearing-House.',
      citations: ['cbd', 'nagoya'],
      tag: 'required',
    },
    {
      title: 'Obtain prior informed consent (PIC)',
      detail: 'Get written permission from the provider country\'s competent authority, and from Indigenous or local communities where their knowledge is involved.',
      citations: ['cbd', 'nagoya'],
      tag: 'required',
    },
    {
      title: 'Negotiate mutually agreed terms (MAT)',
      detail: 'Agree how benefits will be shared, what you may use the material for, and whether you may pass it on to others.',
      citations: ['nagoya'],
      tag: 'required',
    },
  ]

  if (a.purpose !== 'research') {
    steps.push({
      title: 'Prepare due diligence evidence for user countries',
      detail: 'If you will sell or develop products in the EU, Regulation (EU) No 511/2014 requires a due diligence declaration and records kept for 20 years. The certificate of compliance is the best evidence.',
      citations: ['nagoya'],
      tag: 'required',
    })
  }

  if (a.purpose === 'patent') {
    steps.push({
      title: 'Plan for origin disclosure in patent applications',
      detail: 'Several countries already require disclosure of origin, and the WIPO GRATK Treaty will require it in all member countries once it enters into force.',
      citations: ['gratk', 'pct'],
      tag: 'check',
    })
  }

  if (a.codified !== 'no') {
    steps.push({
      title: 'Codified knowledge is still traditional knowledge abroad',
      detail: 'India\'s exemption for codified traditional knowledge does not carry over to other countries. Foreign patent offices will still treat it as prior art through TKDL.',
      citations: ['tkdl', 'gratk'],
      tag: 'check',
    })
  }

  return steps
}
