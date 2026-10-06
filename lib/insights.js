// Reads the parent's comments and works out:
//  - is it really a complaint, or a positive remark ("she is happy") with a 4-star rating?
//  - which area the concern is about (category)
//  - a suggested action + who should own it
// Rule-based (free, instant, no AI key needed). Edit the lists below to tune it.

const SCHOOL = [
  { name: 'Safety & Bullying', owner: 'Principal / Coordinator', high: true,
    words: ['bully', 'bullying', 'hit my', 'hit him', 'hit her', 'physically', 'punish', 'safety', 'safe', 'unsafe', 'cctv', 'injur', 'hurt', 'unwell', 'not informed', 'security', 'guard should stay', 'harass', 'trouble'],
    action: 'Coordinator to inquire within 24 hours, speak to the class teacher / staff involved and the parent, record the action taken and inform the Principal.' },
  { name: 'Frequent Teacher Changes', owner: 'Academic Coordinator',
    words: ['teacher chang', 'change the teacher', 'changes in', 'changed during', 'frequent chang', 'badli', 'new teachers', 'old teacher', 'staff changes', 'keep your physics staff', 'daily change', 'change their math', 'every few days'],
    action: 'Share the subject-teacher plan for the session with the class; avoid mid-session changes; ensure proper handover (syllabus status, weak students) when a change is unavoidable.' },
  { name: 'Teaching Quality & Attention', owner: 'Academic Coordinator / HOD',
    words: ['not dedicated', 'attention', 'concept', 'understand', 'syllabus', 'revision', 'focus', 'experienced teacher', 'teaching', 'copy che', 'copy not', 'homework', 'doubt', 'not upto the mark', 'education standard', 'practical approach', 'extra classes', 'extra class', 'chatgpt', 'writing', 'confidence', 'not doing well'],
    action: 'HOD to observe the subject teacher in class; start remedial / doubt-clearing periods; share the revision plan with parents; review notebook checking.' },
  { name: 'Class Strength', owner: 'Principal',
    words: ['strength', 'students in every section', 'less than 25', 'more than 25', '32 students'],
    action: 'Review section strength for the class and share the plan with parents.' },
  { name: 'Discipline & Behaviour', owner: 'Class Teacher / Discipline In-charge',
    words: ['discipline', 'abusive', 'abuse', 'rude', 'behav', 'manners', 'moral', 'nuisance', 'undisciplined', 'aggression', 'strict'],
    action: 'Counsel the students concerned; review staff conduct if a teacher is named; consider a weekly value-education / moral science period.' },
  { name: 'Communication & PTM', owner: 'Class Teacher',
    words: ['phone', 'calls not', 'ptm', 'parents teachers meeting', 'parent teacher meeting', 'no action on the ground', 'feedback regularly', 'informed', 'takes too long', 'resolved promptly', 'concerns raised', 'batate kuch'],
    action: 'Class teacher to call the parent back within 24 hours; schedule a PTM / meeting; share the action taken in writing.' },
  { name: 'Infrastructure & Hygiene', owner: 'Admin / Maintenance',
    words: ['washroom', 'clean', 'water', 'pani', 'fan', 'air condition', 'cooler', 'hot class', 'computer', 'smell', 'smael', 'shed', 'fabric'],
    action: 'Admin to inspect and fix within 7 days; share a photo / confirmation with the parent.' },
  { name: 'Parking & Traffic', owner: 'Admin / Security',
    words: ['parking', 'traffic', 'pick and drop', 'pick up', 'pickup', 'main school gate', 'vehicles', 'stand in the sun', 'congestion'],
    action: 'Post a guard for traffic control at dismissal; mark a parent pick-up / waiting area; share the arrangement with parents.' },
  { name: 'Transport', owner: 'Transport In-charge',
    words: ['bus', 'van', 'transport', 'came home late', 'driver', 'route'],
    action: 'Transport in-charge to check route timing and staff conduct; call the parent with the fix.' },
  { name: 'Sports & Activities', owner: 'Sports Department',
    words: ['sport', 'games', 'physical activity', 'tournament', 'table tennis', 'competition', 'activities'],
    action: 'Sports department to add activity periods / inter-school events and inform parents.' },
  { name: 'Language Skills', owner: 'Language Department',
    words: ['english', 'spoken', 'grammar', 'hindi', 'punjabi'],
    action: 'Language department to run extra speaking / grammar sessions for the class.' },
  { name: 'Fees & Concession', owner: 'Accounts / Principal',
    words: ['fee ', 'fees', 'fee.', 'fee,', 'concession'],
    action: 'Accounts / Principal to review the request and reply to the parent.' },
  { name: 'Child Care & Belongings', owner: 'Class Teacher',
    words: ['lost', 'bottle', 'fruit box', 'stationary', 'stationery', 'lunch'],
    action: 'Class teacher to keep an eye on belongings / lunch and update the parent.' },
  { name: 'Study Pressure', owner: 'Academic Coordinator',
    words: ['pressure', 'too much study', 'burden'],
    action: 'Review homework and test load for the class; share the weekly plan with parents.' }
];

// Bodyzone (gym)
const GYM = [
  { name: 'Safety & Injury', owner: 'Floor Manager', high: true,
    words: ['injur', 'hurt', 'unsafe', 'safety', 'accident', 'fell', 'harass', 'misbehav', 'theft', 'stolen', 'locker broken'],
    action: 'Floor Manager to call the member the same day, inspect the area / equipment involved, record the incident and inform Amit Kumar Sir.' },
  { name: 'Equipment & Machines', owner: 'Floor Manager / Maintenance',
    words: ['machine', 'equipment', 'equipmemt', 'treadmill', 'cycle', 'cross trainer', 'elliptical', 'incline', 'dumbbell', 'barbell', 'bench', 'cable', 'band', 'outdated', 'worn', 'broken', 'repair', 'not working', 'out of order', 'faulty', 'upgrad', 'replace'],
    action: 'Log each faulty machine in the Machine Uptime Board, repair / replace within 48 hours, put an "Under repair" tag meanwhile and update the member.' },
  { name: 'Towels, Washroom & Hygiene', owner: 'Housekeeping Supervisor',
    words: ['towel', 'washroom', 'restroom', 'toilet', 'shower', 'locker room', 'hygiene', 'dirty', 'clean', 'stink', 'smell', 'dust', 'sanit'],
    action: 'Housekeeping to fix towel stock and washroom cleaning schedule (hourly checklist), supervisor to verify daily for one week.' },
  { name: 'Steam / Sauna / Pool', owner: 'Floor Manager / Maintenance',
    words: ['sauna', 'steam', 'jacuzzi', 'pool', 'heat'],
    action: 'Maintenance to check heater / temperature settings today and confirm working condition to the member.' },
  { name: 'AC, Ventilation & Water', owner: 'Maintenance',
    words: ['ac ', 'ac.', 'ac,', 'air condition', 'aircondition', 'vent', 'cooling', 'hot inside', 'fan', 'water dispenser', 'cold water', 'drinking water', 'water cooler'],
    action: 'Maintenance to check AC / ventilation and water dispenser, set a fixed AC on-off schedule, and inform the member once done.' },
  { name: 'Trainer & Staff Support', owner: 'Amit Kapoor / Floor Manager',
    words: ['trainer', 'gt', 'pt ', 'personal training', 'staff', 'attention', 'guidance', 'preferred clients', 'favour', 'rude', 'behaviour', 'behavior', 'reminded again'],
    action: 'Floor Manager to speak with the trainer / staff concerned, assign a floor trainer for the member\'s time slot, and follow up after one week.' },
  { name: 'Crowd & Timing', owner: 'Floor Manager',
    words: ['crowd', 'rush', 'waiting', 'wait for', 'peak', 'timing', 'closed early', 'opening time'],
    action: 'Review peak-hour floor staffing and machine availability; share timing / slot options with the member.' },
  { name: 'Membership, Fees & Billing', owner: 'Sales / Accounts',
    words: ['fee ', 'fees', 'fee.', 'fee,', 'price', 'expensive', 'membership', 'renewal', 'refund', 'billing', 'discount', '50,000', 'charges'],
    action: 'Sales / Accounts to call the member, explain the plan details and resolve the billing or renewal query.' },
  { name: 'Parking', owner: 'Admin / Security', words: ['parking', 'traffic'],
    action: 'Admin to review parking arrangement and guard deployment; inform the member.' }
];

// Spa Kora
const SPA = [
  { name: 'Safety & Behaviour', owner: 'Spa Manager', high: true,
    words: ['unsafe', 'injur', 'hurt', 'burn', 'allerg', 'rash', 'harass', 'misbehav', 'uncomfortable', 'inappropriate', 'theft', 'stolen'],
    action: 'Spa Manager to call the client the same day, record the incident, take action with the staff involved and inform Amit Kumar Sir.' },
  { name: 'Therapist Service', owner: 'Spa Manager / Senior Therapist',
    words: ['therapist', 'massage', 'pressure', 'technique', 'treatment', 'therapy', 'rushed', 'short time', 'less time', 'not relaxing', 'skill'],
    action: 'Senior therapist to review the therapist\'s technique, assign a preferred therapist for the next visit and follow up with the client.' },
  { name: 'Hygiene & Linen', owner: 'Housekeeping',
    words: ['hygiene', 'clean', 'dirty', 'towel', 'linen', 'sheet', 'smell', 'stink', 'washroom', 'shower', 'sanit', 'dust'],
    action: 'Housekeeping to change linen / towels after every client and follow the room cleaning checklist; supervisor to verify daily.' },
  { name: 'Ambience & Room', owner: 'Spa Manager / Maintenance',
    words: ['ambience', 'ambiance', 'music', 'noise', 'noisy', 'light', 'temperature', 'cold', 'hot', 'ac ', 'air condition', 'room'],
    action: 'Spa Manager to check room temperature, lighting and music; fix the issue and confirm to the client.' },
  { name: 'Booking & Waiting Time', owner: 'Front Desk',
    words: ['appointment', 'booking', 'wait', 'waiting', 'late', 'delay', 'slot', 'time', 'reception'],
    action: 'Front desk to confirm bookings a day before, keep buffer time between sessions and call the client to offer a convenient slot.' },
  { name: 'Products', owner: 'Spa Manager', words: ['oil', 'product', 'cream', 'scrub', 'quality of'],
    action: 'Spa Manager to check product quality / stock and share the product used with the client.' },
  { name: 'Pricing & Packages', owner: 'Sales / Front Desk',
    words: ['price', 'expensive', 'package', 'membership', 'discount', 'offer', 'billing', 'refund', 'charges'],
    action: 'Front desk / sales to explain package benefits and resolve the billing query with the client.' }
];
const SETS = { school: SCHOOL, gym: GYM, spa: SPA };
const WHO = { school: 'parent', gym: 'member', spa: 'client' };
let CATEGORIES = SCHOOL;

const POSITIVE = ['happy', 'satisfied', 'very good', 'good', 'excellent', 'no problem', 'no concern', 'no concerns', 'everything is fine', 'fine', 'great', 'well done', 'none', 'nothing', 'growing well', 'no issue', 'no issues', 'improve english', 'appreciat', 'keep it up', 'love', 'loving', 'awesome', 'amazing', 'best', 'relaxing', 'wonderful', 'superb', 'nice'];
const NEGATIVE = ['but', 'not ', 'no proper', 'problem', 'issue', 'concern', 'complain', 'bad', 'poor', 'late', 'rude', 'dirty', 'mess', 'improve', 'need', 'should', 'want', 'request', 'lack', 'change', 'unhappy', 'worst', 'less', "don't", 'dont', 'however', 'missing', 'suggest', 'would like', 'more attention', 'wait', 'damp', 'stink', 'smell', 'broken', 'not working', 'outdated'];

const low = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const reCache = {};
// match at the start of a word, so 'bus' does not match 'syllabus' and 'fee' does not match 'feedback'
const has = (t, w) => (reCache[w] || (reCache[w] = new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).test(t);

/** true when the comment only praises (e.g. "she is happy.", "Very good") */
export function isPositiveComment(improve, suggest) {
  const t = low(improve);
  if (!t) return false;
  if (!POSITIVE.some(w => has(t, w))) return false;
  const rest = t.replace(/no (problems?|concerns?|issues?)/g, ' ');
  if (NEGATIVE.some(w => has(rest, w))) return false;
  // a real complaint written in the suggestions box still counts
  const s = low(suggest);
  if (s && CATEGORIES.some(c => c.high && c.words.some(w => has(s, w)))) return false;
  return true;
}

/** categories + suggested actions for a response */
// words that show a real problem (used to catch complaints written by parents who still gave 5 stars)
const STRONG_NEG = ['stink', 'outdated', 'broken', 'faulty', 'out of order', 'not working', 'missing', 'not ', 'no proper', 'problem', 'issue', 'complain', 'bad', 'poor', 'late', 'rude', 'dirty', 'mess', 'lack', 'worst',
  'unhappy', 'missing', 'smell', 'smael', 'nhi', 'nahi', "don't", 'dont', 'never', 'hit', 'bully', 'unsafe', 'wrong', 'galat', 'concern', 'had to wait', 'waited', 'waiting', 'delay', 'damp', 'unclean', 'not clean', 'rushed', 'rushing', 'too hard', 'painful', 'overpriced', 'expensive', 'crowded', 'worn out'];

/**
 * complaint = true  -> escalate automatically
 *   - Overall <= 4 and the comment is not just praise, OR
 *   - Overall 5 but the comment clearly describes a problem (e.g. "fine but pick and drop is a mess")
 */
export function analyse(r, threshold = 4, set = 'school') {
  CATEGORIES = SETS[set] || SCHOOL;
  const text = low(r.improve) + ' | ' + low(r.suggest);
  const positive = isPositiveComment(r.improve, r.suggest);
  const found = positive ? [] : CATEGORIES.filter(c => c.words.some(w => has(text, w)));
  const lowRating = !!(r.overall && r.overall <= threshold);
  const imp = low(r.improve);
  const rest = imp.replace(/no (problems?|concerns?|issues?)/g, ' ');
  const negComment = !positive && !!imp && STRONG_NEG.some(w => has(rest, w)) &&
    (found.length > 0 || imp.length > 25);
  const safetyFlag = !positive && found.some(c => c.high);   // safety / bullying is always a complaint, whatever the stars
  const complaint = (lowRating && !positive) || (!lowRating && (negComment || safetyFlag));
  let actions = found.map(c => ({ category: c.name, owner: c.owner, action: c.action }));
  if (!actions.length && complaint) {
    actions = [{ category: imp ? 'General Concern' : 'Low Rating – No Comment', owner: set === 'school' ? 'MIS / Class Teacher' : 'MIS / Floor Manager',
      action: imp ? 'Call the ' + WHO[set] + ' to understand the concern in detail and route it to the right department.'
        : 'Call the ' + WHO[set] + ' to understand why the rating is low, then record the concern in the ticket.' }];
  }
  if (!complaint) actions = [];
  let priority = '';
  if (complaint) {
    if (found.some(c => c.high) || (r.overall && r.overall <= 2)) priority = 'High';
    else if (r.overall === 3) priority = 'Medium';
    else priority = 'Low';
  }
  const reason = !complaint ? '' : lowRating ? 'Overall ' + r.overall + '/5' : 'Negative comment (Overall ' + r.overall + '/5)';
  const confidential = set === 'school' && complaint && isAboutLeadership(r.improve, r.suggest);
  return { positive, complaint, reason, confidential, categories: actions.map(a => a.category), actions, priority };
}

// Complaint about the Principal (Indu Sharma Ma'am) -> confidential routing (not sent to the Principal or Poonam Gulati Ma'am)
const LEADERSHIP = [/(^|[^a-z])(vice[ -]?)?(principal|principle|pricipal|prinicipal|principel|princiapl|prinicpal)/, /(^|[^a-z])indu([^a-z]|$)/, /(^|[^a-z])(head ?mistress|head of (the )?school|school head|p\.? ?s\.? ma'?a?m)([^a-z]|$)/, /प्रिंसिपल|प्रधानाचार्य|इंदु/];
export function isAboutLeadership(...texts) {
  const t = texts.map(low).join(' | ');
  return LEADERSHIP.some(re => re.test(t));
}

const normName = s => low(s).replace(/[^a-z]/g, '');
const mob10 = s => String(s || '').replace(/\D/g, '').slice(-10);

/**
 * Marks older duplicate responses. BIPS: same student (name) AND (same mobile OR same parent name).
 * Bodyzone / Spa Kora (no student): same mobile number.
 * The most recent response is kept; older ones get r.dupOf = row number of the kept one.
 */
export function markDuplicates(list) {
  const kept = [];
  [...list].sort((a, b) => (b.ts || 0) - (a.ts || 0) || b.row - a.row).forEach(r => {
    const st = normName(r.student), m = mob10(r.mobile), p = normName(r.parent);
    const k = st ? kept.find(x => x._st === st && ((m && x._m === m) || (p && x._p === p)))
      : (m ? kept.find(x => !x._st && x._m === m) : null);   // Bodyzone / Spa Kora: same mobile number
    if (k) r.dupOf = k.row;
    else kept.push(Object.assign(r, { _st: st, _m: m, _p: p }));
  });
  list.forEach(r => { delete r._st; delete r._m; delete r._p; });
  return list;
}
