import type { Topic, TopicId } from '../types'

export const TOPICS: Topic[] = [
  {
    id: 'patent',
    label: 'Patenting a classical formulation',
    keywords: [
      'patent', 'patentable', 'patenting', 'invention', 'classical formulation', 'classical formula',
      'chyawanprash', 'churna', 'prior art', 'pct', 'novelty', 'पेटेंट', 'आविष्कार',
    ],
    answers: {
      india: {
        title: 'You cannot patent a classical formulation as it is written',
        summary: {
          en: 'A formulation taken from a classical Ayurveda text is traditional knowledge, and section 3(p) of the Patents Act says that is not an invention. You may be able to patent something genuinely new that you built on top of it, such as a new process or a new composition with a proven, unexpected effect.',
          hi: 'किसी शास्त्रीय आयुर्वेद ग्रंथ से लिया गया योग पारंपरिक ज्ञान है, और पेटेंट अधिनियम की धारा 3(p) के अनुसार यह आविष्कार नहीं है। उस पर आधारित कोई सचमुच नई चीज़, जैसे नई प्रक्रिया या सिद्ध, अप्रत्याशित प्रभाव वाली नई संरचना, पेटेंट योग्य हो सकती है।',
        },
        keyPoints: [
          'Section 3(p) excludes traditional knowledge and mere combinations of the known properties of traditional ingredients.',
          'Section 3(e) also excludes simple mixtures whose effect is just the sum of their parts. You need data showing a synergistic or unexpected effect.',
          'Examiners search TKDL, so claims that match a classical text will be refused, and third parties can oppose under s.25(1)(k).',
          'You must disclose the source and geographical origin of any plant or other biological material you used (s.10(4)(d)(ii)(D)).',
          'If the plant material came from India, check the Biological Diversity Act before the patent is granted.',
        ],
        citations: ['patents-act', 'tkdl', 'bd-act'],
        confidence: {
          level: 'high',
          score: 5,
          reason: 'Settled statutory text, applied consistently by the Indian Patent Office.',
        },
        links: [
          { label: 'IP India: Acts and Rules', url: 'https://ipindia.gov.in/acts-rules-patents.htm' },
          { label: 'TKDL', url: 'https://www.tkdl.res.in/' },
        ],
      },
      international: {
        title: 'Other patent offices also treat classical formulations as prior art',
        summary: {
          en: 'There is no single international patent. Through the PCT you can file once and keep your date in over 155 countries, but each office judges novelty itself. Offices that use TKDL, such as the EPO and USPTO, will find classical formulations and refuse claims that copy them. The 2024 WIPO GRATK Treaty will also require you to disclose where the genetic resources and traditional knowledge came from.',
          hi: 'कोई एक अंतरराष्ट्रीय पेटेंट नहीं होता। PCT के ज़रिए एक आवेदन से 155 से अधिक देशों में आपकी तिथि सुरक्षित रहती है, पर हर कार्यालय नवीनता स्वयं तय करता है। EPO और USPTO जैसे कार्यालय TKDL देखते हैं और शास्त्रीय योगों की नकल वाले दावे अस्वीकार करते हैं। 2024 की WIPO GRATK संधि के तहत आनुवंशिक संसाधनों और पारंपरिक ज्ञान का स्रोत भी बताना होगा।',
        },
        keyPoints: [
          'A PCT application gives you one filing date and an international search report, then a national phase in each country, usually at 30 months.',
          'The EPO, USPTO, JPO and others have TKDL access agreements, so classical texts are searched as prior art.',
          'Under the GRATK Treaty (adopted May 2024), member countries must require disclosure of the origin of genetic resources and associated traditional knowledge once it enters into force.',
          'A genuinely new process, dosage form or clinically proven new use may still be patentable in some countries, but the rules differ; the US and Europe treat new uses differently.',
        ],
        citations: ['pct', 'tkdl', 'gratk', 'trips'],
        confidence: {
          level: 'high',
          score: 4,
          reason: 'Treaty text is clear; GRATK disclosure rules are not yet in force in most countries.',
        },
        links: [
          { label: 'WIPO: PCT', url: 'https://www.wipo.int/pct/en/' },
          { label: 'WIPO: GRATK Treaty', url: 'https://www.wipo.int/web/ip-genetic-resources-and-traditional-knowledge/' },
        ],
      },
    },
  },
  {
    id: 'gi',
    label: 'Geographical indications',
    keywords: [
      'gi', 'gi tag', 'geographical indication', 'geographical', 'region', 'origin', 'navara',
      'place name', 'local product', 'जीआई', 'भौगोलिक',
    ],
    answers: {
      india: {
        title: 'A GI tag protects a regional name, and producers apply together',
        summary: {
          en: 'A geographical indication protects a name that tells buyers a product comes from a particular place and has qualities linked to it, such as Navara rice from Kerala. An association of producers applies to the GI Registry in Chennai, not an individual company. Once registered, producers sign up as authorised users.',
          hi: 'भौगोलिक संकेत (GI) उस नाम की रक्षा करता है जो बताता है कि उत्पाद किसी खास जगह से है और उसके गुण उस जगह से जुड़े हैं, जैसे केरल का नवारा चावल। आवेदन उत्पादकों का संघ चेन्नई की GI रजिस्ट्री में करता है, कोई एक कंपनी नहीं। पंजीकरण के बाद उत्पादक अधिकृत उपयोगकर्ता बनते हैं।',
        },
        keyPoints: [
          'You must show the link between the place and the product\'s quality, reputation or other characteristics.',
          'The applicant is an association of producers or a body representing them (s.11).',
          'Registration lasts 10 years and can be renewed without limit (s.18).',
          'Only registered authorised users may use the name; others are infringing (s.22).',
          'A GI does not protect a formulation or recipe. Use it alongside trade marks and trade secrets.',
        ],
        citations: ['gi-act', 'gi-registry'],
        confidence: {
          level: 'high',
          score: 5,
          reason: 'Clear statutory procedure with many registered examples.',
        },
        links: [
          { label: 'IP India: GI', url: 'https://ipindia.gov.in/gi.htm' },
          { label: 'GI public search', url: 'https://search.ipindia.gov.in/GIRPublic/' },
        ],
      },
      international: {
        title: 'Outside India, you protect a GI country by country',
        summary: {
          en: 'TRIPS requires every WTO member to stop GIs being used in a misleading way, but it does not create a global register. To protect an Indian GI abroad you register it in each market that offers a GI system, rely on bilateral agreements, or use certification or collective trade marks where there is no GI system, as in the US.',
          hi: 'TRIPS हर WTO सदस्य से GI के भ्रामक उपयोग को रोकने की अपेक्षा करता है, पर कोई वैश्विक रजिस्टर नहीं बनाता। किसी भारतीय GI को विदेश में बचाने के लिए हर बाज़ार में अलग पंजीकरण, द्विपक्षीय समझौते, या जहाँ GI व्यवस्था नहीं है (जैसे अमेरिका) वहाँ प्रमाणन या सामूहिक ट्रेड मार्क का सहारा लेना होता है।',
        },
        keyPoints: [
          'TRIPS Art. 22 sets a baseline: no misleading use of a GI.',
          'Art. 23 gives stronger protection only to wines and spirits, so herbal and food GIs get the baseline level.',
          'Art. 24 allows exceptions, for example names that have become generic in that country.',
          'The EU runs its own GI register for agricultural products and foods, and non-EU GIs can apply.',
          'Your Indian registration usually has to exist first; foreign offices ask for proof of home protection.',
        ],
        citations: ['trips', 'gi-act'],
        confidence: {
          level: 'medium',
          score: 3,
          reason: 'Depends heavily on the target country\'s own GI or trade mark system.',
        },
        links: [{ label: 'WTO: TRIPS text', url: 'https://www.wto.org/english/docs_e/legal_e/27-trips_04b_e.htm' }],
      },
    },
  },
  {
    id: 'trademark',
    label: 'Trade marks',
    keywords: [
      'trademark', 'trade mark', 'brand', 'logo', 'brand name', 'madrid', 'name my product',
      'ट्रेडमार्क', 'ब्रांड',
    ],
    answers: {
      india: {
        title: 'Register your brand, not the classical name',
        summary: {
          en: 'A trade mark protects your brand name, logo or label. You cannot register a classical formulation name such as "Chyawanprash" as your own, because it is generic. Register a distinctive brand in the right class, usually class 5 for Ayurvedic medicines, and use it with the generic name.',
          hi: 'ट्रेड मार्क आपके ब्रांड नाम, लोगो या लेबल की रक्षा करता है। "च्यवनप्राश" जैसा शास्त्रीय नाम आप अपना नहीं बना सकते, क्योंकि वह सामान्य नाम है। सही वर्ग में, आयुर्वेदिक दवाओं के लिए आमतौर पर वर्ग 5 में, एक विशिष्ट ब्रांड पंजीकृत करें और उसे सामान्य नाम के साथ इस्तेमाल करें।',
        },
        keyPoints: [
          'Generic or descriptive words are refused under s.9. Invented or arbitrary words are strongest.',
          'Search the register first for similar marks in the same class to avoid refusal under s.11.',
          'Class 5 covers Ayurvedic medicines, class 3 covers cosmetics and classes 29 and 30 cover foods.',
          'Registration lasts 10 years and can be renewed indefinitely.',
          'Use the ® symbol only after registration; use ™ before that.',
        ],
        citations: ['tm-act'],
        confidence: {
          level: 'high',
          score: 5,
          reason: 'Well-established statutory rules and registry practice.',
        },
        links: [{ label: 'IP India: Trade marks', url: 'https://ipindia.gov.in/acts-rules-tm.htm' }],
      },
      international: {
        title: 'Use the Madrid System to protect your brand in many countries at once',
        summary: {
          en: 'Once you have an Indian application or registration, you can file one international application through IP India and designate the countries you want. Each designated country examines the mark under its own law. For the first five years, the international registration depends on your Indian base mark.',
          hi: 'भारतीय आवेदन या पंजीकरण होने पर आप IP India के माध्यम से एक अंतरराष्ट्रीय आवेदन दाखिल कर मनचाहे देश चुन सकते हैं। हर चुना गया देश अपने कानून से जाँच करता है। पहले पाँच साल अंतरराष्ट्रीय पंजीकरण आपके भारतीय मूल मार्क पर निर्भर रहता है।',
        },
        keyPoints: [
          'One application, one language, one set of fees in Swiss francs, covering 130+ member countries.',
          'Each country has 12 or 18 months to refuse protection.',
          'If the Indian base mark is cancelled within five years, protection abroad falls with it ("central attack").',
          'Check that your brand does not mean something unfortunate or descriptive in the target language.',
        ],
        citations: ['madrid', 'tm-act'],
        confidence: {
          level: 'high',
          score: 4,
          reason: 'Clear treaty procedure; country-level refusals still vary.',
        },
        links: [{ label: 'WIPO: Madrid System', url: 'https://www.wipo.int/madrid/en/' }],
      },
    },
  },
  {
    id: 'abs',
    label: 'Access and benefit sharing',
    keywords: [
      'abs', 'benefit sharing', 'biodiversity', 'biological resource', 'sourcing plants', 'source plants',
      'sourcing', 'nba', 'nagoya', 'cbd', 'herbs', 'raw material', 'medicinal plants', 'जैव विविधता',
    ],
    answers: {
      india: {
        title: 'Whether you need NBA approval depends on who you are and what you do',
        summary: {
          en: 'Foreign-controlled companies need approval from the National Biodiversity Authority to access Indian biological resources. Indian companies using them commercially give prior intimation to their State Biodiversity Board and share benefits. The 2023 amendment exempts codified traditional knowledge, cultivated medicinal plants and registered AYUSH practitioners from some of these steps.',
          hi: 'विदेशी नियंत्रण वाली कंपनियों को भारतीय जैविक संसाधनों के लिए राष्ट्रीय जैव विविधता प्राधिकरण (NBA) की मंज़ूरी चाहिए। वाणिज्यिक उपयोग करने वाली भारतीय कंपनियाँ राज्य जैव विविधता बोर्ड को पूर्व सूचना देती हैं और लाभ साझा करती हैं। 2023 के संशोधन ने संहिताबद्ध पारंपरिक ज्ञान, खेती वाले औषधीय पौधों और पंजीकृत आयुष चिकित्सकों को कुछ चरणों से छूट दी है।',
        },
        keyPoints: [
          'Foreign-controlled entities: prior NBA approval before accessing resources or associated knowledge (s.3).',
          'Indian entities, commercial use: prior intimation to the State Biodiversity Board (s.7), unless an exemption applies.',
          'Exemptions after 2023: codified traditional knowledge, cultivated medicinal plants and their products, and registered AYUSH practitioners.',
          'Patents: the NBA check now happens before grant, not before you apply (s.6).',
          'Benefit sharing is agreed with the NBA, often a small share of annual ex-factory sales.',
        ],
        citations: ['bd-act', 'abs-regs'],
        confidence: {
          level: 'medium',
          score: 3,
          reason: 'The 2023 amendment is recent and implementing regulations are still being updated.',
        },
        links: [
          { label: 'National Biodiversity Authority', url: 'https://nbaindia.org/' },
          { label: 'Try the ABS Helper', url: '/abs' },
        ],
      },
      international: {
        title: 'Follow the provider country\'s rules and keep proof for user countries',
        summary: {
          en: 'Under the CBD and the Nagoya Protocol, the country a plant comes from decides access terms. You need its prior informed consent and mutually agreed terms. Countries where you use or sell the product, such as EU members, may ask you to show due diligence that the resource was obtained lawfully.',
          hi: 'CBD और नागोया प्रोटोकॉल के तहत, पौधा जिस देश से आता है वही पहुँच की शर्तें तय करता है। आपको उसकी पूर्व सूचित सहमति और परस्पर सहमत शर्तें चाहिए। जिन देशों में आप उत्पाद का उपयोग या बिक्री करते हैं, जैसे EU देश, वे यह दिखाने को कह सकते हैं कि संसाधन वैध रूप से प्राप्त हुआ।',
        },
        keyPoints: [
          'Prior informed consent (PIC) and mutually agreed terms (MAT) come from the provider country (CBD Art. 15).',
          'Nagoya Protocol Arts. 15 to 17 make user countries monitor compliance.',
          'EU Regulation 511/2014 requires users to exercise due diligence and keep records for 20 years.',
          'An internationally recognised certificate of compliance, published on the ABS Clearing-House, is the best evidence.',
        ],
        citations: ['cbd', 'nagoya', 'gratk'],
        confidence: {
          level: 'medium',
          score: 3,
          reason: 'Rules differ between provider and user countries and change often.',
        },
        links: [{ label: 'CBD: ABS Clearing-House', url: 'https://absch.cbd.int/' }],
      },
    },
  },
  {
    id: 'advertising',
    label: 'Advertising and labelling claims',
    keywords: [
      'advertis', 'advert', 'label', 'labelling', 'labeling', 'claim', 'claims', 'cure', 'marketing',
      'packaging', 'promote', 'dshea', 'fda', 'विज्ञापन', 'लेबल', 'दावा',
    ],
    answers: {
      india: {
        title: 'Do not claim to cure or prevent the diseases in the DMR Act Schedule',
        summary: {
          en: 'The Drugs and Magic Remedies Act bans advertisements that claim a product treats or prevents listed diseases such as diabetes, cancer or obesity, whether the product is Ayurvedic or not. Labels on Ayurvedic drugs must follow the Drugs Rules, and any claim must be truthful and not misleading.',
          hi: 'ड्रग्स एंड मैजिक रेमेडीज़ अधिनियम ऐसे विज्ञापनों पर रोक लगाता है जो दावा करें कि उत्पाद मधुमेह, कैंसर या मोटापा जैसी सूचीबद्ध बीमारियों का इलाज या रोकथाम करता है, चाहे उत्पाद आयुर्वेदिक हो या नहीं। आयुर्वेदिक दवाओं के लेबल ड्रग्स नियमों के अनुसार हों, और हर दावा सच्चा और भ्रामक न हो।',
        },
        keyPoints: [
          'Check your claim against the DMR Act Schedule of diseases before any advertisement.',
          'Misleading claims about any drug are banned under s.4, even for diseases not in the Schedule.',
          'Rule 161 of the Drugs Rules sets what an ASU drug label must show, including "Ayurvedic medicine" and the reference text.',
          'Food products under the Ayurveda Aahar Regulations cannot make disease claims at all.',
          'The status of Rule 170 (ASU advertisements) has been before the Supreme Court since 2024; check current orders.',
        ],
        citations: ['dmr-act', 'dc-act', 'fssai-aahar'],
        confidence: {
          level: 'medium',
          score: 4,
          reason: 'The Act is clear, but Rule 170 is the subject of ongoing court proceedings.',
        },
        links: [{ label: 'CDSCO: Acts and Rules', url: 'https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/' }],
      },
      international: {
        title: 'Abroad, most Ayurvedic products cannot make disease claims at all',
        summary: {
          en: 'In the EU, a traditional herbal medicine can be registered under Directive 2004/24/EC for minor conditions only, with a standard statement that the use is based on long-standing tradition. In the US, most Ayurvedic products are dietary supplements under DSHEA and may only make structure or function claims with an FDA disclaimer.',
          hi: 'EU में पारंपरिक हर्बल दवा निर्देश 2004/24/EC के तहत केवल छोटी बीमारियों के लिए पंजीकृत हो सकती है, एक मानक कथन के साथ कि उपयोग लंबी परंपरा पर आधारित है। अमेरिका में अधिकतर आयुर्वेदिक उत्पाद DSHEA के तहत आहार पूरक हैं और FDA अस्वीकरण के साथ केवल शरीर की संरचना या कार्य से जुड़े दावे कर सकते हैं।',
        },
        keyPoints: [
          'EU: 30 years of traditional use, including 15 within the EU, and indications limited to self-care.',
          'EU label wording is fixed: "traditional herbal medicinal product for use in … exclusively based upon long-standing use".',
          'US: "supports healthy digestion" is a structure or function claim; "treats IBS" is a drug claim and is not allowed.',
          'US: notify FDA within 30 days of first marketing a structure or function claim, and print the standard disclaimer.',
        ],
        citations: ['eu-thmpd', 'us-dshea'],
        confidence: {
          level: 'high',
          score: 4,
          reason: 'Clear statutory text; enforcement practice varies by member state.',
        },
        links: [
          { label: 'EUR-Lex: Directive 2004/24/EC', url: 'https://eur-lex.europa.eu/eli/dir/2004/24/oj' },
          { label: 'NIH ODS: DSHEA', url: 'https://ods.od.nih.gov/About/DSHEA_Wording.aspx' },
        ],
      },
    },
  },
  {
    id: 'budapest',
    label: 'Budapest Treaty deposits',
    keywords: [
      'budapest', 'microorganism', 'micro-organism', 'microbe', 'deposit', 'strain', 'culture',
      'bacteria', 'fungus', 'probiotic', 'mtcc', 'सूक्ष्मजीव',
    ],
    answers: {
      india: {
        title: 'Deposit the microorganism with an Indian IDA before you file',
        summary: {
          en: 'If your invention uses a microorganism that you cannot fully describe in writing and that is not publicly available, the Patents Act requires you to deposit it with an International Depositary Authority no later than your filing date. India has IDAs such as MTCC at CSIR-IMTECH Chandigarh and MCC at NCCS Pune.',
          hi: 'अगर आपके आविष्कार में ऐसा सूक्ष्मजीव है जिसे लिखकर पूरा नहीं बताया जा सकता और जो सार्वजनिक रूप से उपलब्ध नहीं है, तो पेटेंट अधिनियम के अनुसार उसे दाखिल करने की तिथि तक किसी अंतरराष्ट्रीय निक्षेपण प्राधिकरण (IDA) में जमा करना होगा। भारत में चंडीगढ़ का MTCC और पुणे का MCC ऐसे IDA हैं।',
        },
        keyPoints: [
          'Deposit on or before the date you file the patent application (s.10(4)(d)(ii)(A)).',
          'Quote the IDA name, accession number and deposit date in the specification.',
          'Indian IDAs include MTCC (CSIR-IMTECH, Chandigarh) and MCC (NCCS, Pune).',
          'If the strain was isolated from Indian soil or plants, the Biological Diversity Act also applies.',
        ],
        citations: ['patents-act', 'mtcc', 'bd-act'],
        confidence: {
          level: 'high',
          score: 4,
          reason: 'Clear statutory requirement; IDA fees and forms change occasionally.',
        },
        links: [{ label: 'MTCC', url: 'https://mtccindia.res.in/' }],
      },
      international: {
        title: 'One Budapest deposit covers every member country',
        summary: {
          en: 'Under the Budapest Treaty, a single deposit with any International Depositary Authority is recognised for patent purposes in all member countries. The IDA issues a receipt and keeps the sample for at least 30 years, and at least 5 years after the last request for a sample.',
          hi: 'बुडापेस्ट संधि के तहत किसी भी अंतरराष्ट्रीय निक्षेपण प्राधिकरण में एक बार जमा करना सभी सदस्य देशों में पेटेंट के लिए मान्य है। IDA रसीद देता है और नमूने को कम से कम 30 वर्ष, और अंतिम अनुरोध के बाद कम से कम 5 वर्ष तक रखता है।',
        },
        keyPoints: [
          'Deposit once; every Budapest member recognises it (Art. 3).',
          'The IDA tests viability and issues a viability statement (Rule 10).',
          'Samples are stored for at least 30 years (Rule 9).',
          'Samples are released only to people entitled under patent law, such as after publication in some countries (Rule 11).',
        ],
        citations: ['budapest', 'pct'],
        confidence: {
          level: 'high',
          score: 5,
          reason: 'Long-standing treaty with uniform rules across members.',
        },
        links: [{ label: 'WIPO: Budapest Treaty', url: 'https://www.wipo.int/treaties/en/registration/budapest/' }],
      },
    },
  },
]

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, Topic>

export interface Suggestion {
  topicId: TopicId
  en: string
  hi: string
}

export const SUGGESTIONS: Suggestion[] = [
  { topicId: 'patent', en: 'Can I patent my family\'s classical Chyawanprash formulation?', hi: 'क्या मैं अपने परिवार के शास्त्रीय च्यवनप्राश योग का पेटेंट करा सकता हूँ?' },
  { topicId: 'gi', en: 'How do we get a GI tag for a herb grown only in our district?', hi: 'हमारे ज़िले में ही उगने वाली जड़ी-बूटी के लिए GI टैग कैसे मिलेगा?' },
  { topicId: 'trademark', en: 'Can I register "Triphala" as my brand name?', hi: 'क्या मैं "त्रिफला" को अपने ब्रांड नाम के रूप में पंजीकृत कर सकता हूँ?' },
  { topicId: 'abs', en: 'Do I need NBA approval to source medicinal plants from forests?', hi: 'क्या जंगल से औषधीय पौधे लेने के लिए NBA की मंज़ूरी चाहिए?' },
  { topicId: 'advertising', en: 'Can my label say the product helps control diabetes?', hi: 'क्या मेरे लेबल पर लिख सकते हैं कि उत्पाद मधुमेह नियंत्रित करता है?' },
  { topicId: 'budapest', en: 'Where do I deposit a probiotic strain for a patent?', hi: 'पेटेंट के लिए प्रोबायोटिक स्ट्रेन कहाँ जमा करूँ?' },
]
