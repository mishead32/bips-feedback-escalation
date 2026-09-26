// Reads the parent's comments and works out:
//  - is it really a complaint, or a positive remark ("she is happy") with a 4-star rating?
//  - which area the concern is about (category)
//  - a suggested action + who should own it
// Rule-based (free, instant, no AI key needed). Edit the lists below to tune it.

const CATEGORIES = [
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

const POSITIVE = ['happy', 'satisfied', 'very good', 'good', 'excellent', 'no problem', 'no concern', 'no concerns', 'everything is fine', 'fine', 'great', 'well done', 'none', 'nothing', 'growing well', 'no issue', 'no issues', 'improve english', 'appreciat'];
const NEGATIVE = ['but', 'not ', 'no proper', 'problem', 'issue', 'concern', 'complain', 'bad', 'poor', 'late', 'rude', 'dirty', 'mess', 'improve', 'need', 'should', 'want', 'request', 'lack', 'change', 'unhappy', 'worst', 'less', "don't", 'dont', 'however', 'missing', 'suggest', 'would like', 'more attention'];

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
export function analyse(r) {
  const text = low(r.improve) + ' | ' + low(r.suggest);
  const positive = isPositiveComment(r.improve, r.suggest);
  const found = positive ? [] : CATEGORIES.filter(c => c.words.some(w => has(text, w)));
  const lowRating = r.overall && r.overall <= 4;
  let actions = found.map(c => ({ category: c.name, owner: c.owner, action: c.action }));
  if (!actions.length && lowRating && !positive) {
    actions = [{ category: low(r.improve) ? 'General Concern' : 'Low Rating – No Comment', owner: 'MIS / Class Teacher',
      action: low(r.improve) ? 'Call the parent to understand the concern in detail and route it to the right department.'
        : 'Call the parent to understand why the rating is low, then record the concern in the ticket.' }];
  }
  let priority = '';
  if (lowRating && !positive) {
    priority = (found.some(c => c.high) || r.overall <= 2) ? 'High' : r.overall === 3 ? 'Medium' : 'Low';
  }
  return { positive, categories: actions.map(a => a.category), actions, priority };
}

const normName = s => low(s).replace(/[^a-z]/g, '');
const mob10 = s => String(s || '').replace(/\D/g, '').slice(-10);

/**
 * Marks older duplicate responses. Same student (name) AND (same mobile OR same parent name) = duplicate.
 * The most recent response is kept; older ones get r.dupOf = row number of the kept one.
 */
export function markDuplicates(list) {
  const kept = [];
  [...list].sort((a, b) => (b.ts || 0) - (a.ts || 0) || b.row - a.row).forEach(r => {
    const st = normName(r.student), m = mob10(r.mobile), p = normName(r.parent);
    const k = st && kept.find(x => x._st === st && ((m && x._m === m) || (p && x._p === p)));
    if (k) r.dupOf = k.row;
    else kept.push(Object.assign(r, { _st: st, _m: m, _p: p }));
  });
  list.forEach(r => { delete r._st; delete r._m; delete r._p; });
  return list;
}
