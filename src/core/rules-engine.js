/**
 * rules-engine.js
 * Pure function module — no I/O, no side effects.
 * Evaluates a list of rules against a list of scanned files.
 * First matching rule wins. Returns matched and unmatched file lists.
 */

import path from 'path';

// ---------------------------------------------------------------------------
// Category extension lookup table
// ---------------------------------------------------------------------------
export const CATEGORY_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.heic', '.avif'],
  videos: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.csv', '.md'],
  archives: ['.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz', '.tgz'],
  code: [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java',
    '.c', '.cpp', '.h', '.cs', '.php', '.swift', '.kt', '.sh',
    '.json', '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.scss',
  ],
  // Screenshots: extension AND name check (see matchRule below)
  screenshots: ['.png', '.jpg', '.jpeg'],
  fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
};

// Human-readable label for each rule type (used in UI/terminal display)
export const RULE_TYPE_LABELS = {
  extension: 'File Extension',
  keyword: 'Filename Keyword',
  dateGroup: 'Group by Date',
  size: 'File Size',
  regex: 'Filename Regex',
  dateRange: 'Date Range',
  category: 'File Category',
};

// ---------------------------------------------------------------------------
// Quarter helper
// ---------------------------------------------------------------------------
function getQuarter(date) {
  const month = date.getMonth(); // 0-indexed
  return Math.floor(month / 3) + 1;
}

// ---------------------------------------------------------------------------
// Date group label builder
// ---------------------------------------------------------------------------
function buildDateGroupLabel(date, groupBy) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const quarter = getQuarter(date);

  switch (groupBy) {
    case 'year':    return `${year}`;
    case 'month':   return `${year}-${month}`;
    case 'quarter': return `${year}-Q${quarter}`;
    default:        return `${year}`;
  }
}

// ---------------------------------------------------------------------------
// Rule matchers
// Each returns { matched: boolean, destPath: string|null }
// ---------------------------------------------------------------------------

function matchExtension(file, condition, destinationBase) {
  const exts = (condition.extensions || []).map(e => e.toLowerCase());
  if (!exts.includes(file.ext)) return { matched: false };
  return {
    matched: true,
    destPath: path.join(destinationBase, file.name),
  };
}

function matchKeyword(file, condition, destinationBase) {
  const keyword = condition.caseSensitive
    ? condition.keyword
    : condition.keyword.toLowerCase();
  const filename = condition.caseSensitive
    ? file.name
    : file.name.toLowerCase();

  if (!filename.includes(keyword)) return { matched: false };
  return {
    matched: true,
    destPath: path.join(destinationBase, file.name),
  };
}

function matchDateGroup(file, condition, destinationBase) {
  // dateGroup always matches — it groups every file by date
  const label = buildDateGroupLabel(file.createdAt, condition.groupBy || 'month');
  return {
    matched: true,
    destPath: path.join(destinationBase, label, file.name),
  };
}

function matchSize(file, condition, destinationBase) {
  const { operator, bytes } = condition;
  const matched = operator === 'gt' ? file.size > bytes : file.size < bytes;
  if (!matched) return { matched: false };
  return {
    matched: true,
    destPath: path.join(destinationBase, file.name),
  };
}

function matchRegex(file, condition, destinationBase) {
  try {
    const re = new RegExp(condition.pattern, condition.flags || '');
    if (!re.test(file.name)) return { matched: false };
    return {
      matched: true,
      destPath: path.join(destinationBase, file.name),
    };
  } catch {
    // Invalid regex — treat as no match
    return { matched: false };
  }
}

function matchDateRange(file, condition, destinationBase) {
  const from = condition.from ? new Date(condition.from) : null;
  const to = condition.to ? new Date(condition.to + 'T23:59:59') : null;
  const fileDate = condition.dateField === 'modified' ? file.modifiedAt : file.createdAt;

  if (from && fileDate < from) return { matched: false };
  if (to && fileDate > to) return { matched: false };

  return {
    matched: true,
    destPath: path.join(destinationBase, file.name),
  };
}

function matchCategory(file, condition, destinationBase) {
  const category = condition.category;
  const exts = CATEGORY_EXTENSIONS[category];
  if (!exts) return { matched: false };

  // Screenshots require both extension AND keyword in the filename
  if (category === 'screenshots') {
    const nameLower = file.name.toLowerCase();
    const hasKeyword = nameLower.includes('screenshot') || nameLower.includes('screen shot');
    if (!exts.includes(file.ext) || !hasKeyword) return { matched: false };
  } else {
    if (!exts.includes(file.ext)) return { matched: false };
  }

  return {
    matched: true,
    destPath: path.join(destinationBase, file.name),
  };
}

// ---------------------------------------------------------------------------
// Match dispatcher
// ---------------------------------------------------------------------------
function matchRule(file, rule, destinationBase) {
  // Build the destination base for this specific rule's destination subfolder
  const ruleDestBase = path.join(destinationBase, rule.destination);

  switch (rule.type) {
    case 'extension': return matchExtension(file, rule.condition, ruleDestBase);
    case 'keyword':   return matchKeyword(file, rule.condition, ruleDestBase);
    case 'dateGroup': return matchDateGroup(file, rule.condition, ruleDestBase);
    case 'size':      return matchSize(file, rule.condition, ruleDestBase);
    case 'regex':     return matchRegex(file, rule.condition, ruleDestBase);
    case 'dateRange': return matchDateRange(file, rule.condition, ruleDestBase);
    case 'category':  return matchCategory(file, rule.condition, ruleDestBase);
    default:          return { matched: false };
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Evaluates a list of rules against a list of files.
 * Rules are evaluated in order — first match wins.
 * Disabled rules are skipped.
 *
 * @param {object[]} files          - File info objects from scanner.js
 * @param {object[]} rules          - Rule objects from config
 * @param {string}   destinationBase - Absolute path of the destination folder
 * @returns {{ matched: object[], unmatched: object[] }}
 *   matched: [{ file, rule, destPath }]
 *   unmatched: [file]
 */
export function evaluate(files, rules, destinationBase) {
  const enabledRules = rules.filter(r => r.enabled !== false);
  const matched = [];
  const unmatched = [];

  for (const file of files) {
    let foundMatch = false;

    for (const rule of enabledRules) {
      const result = matchRule(file, rule, destinationBase);
      if (result.matched) {
        matched.push({ file, rule, destPath: result.destPath });
        foundMatch = true;
        break; // first-match wins
      }
    }

    if (!foundMatch) {
      unmatched.push(file);
    }
  }

  return { matched, unmatched };
}

/**
 * Returns a human-readable summary of a rule's condition.
 * Used in UI and terminal display.
 * @param {object} rule
 * @returns {string}
 */
export function describeRule(rule) {
  const { type, condition } = rule;

  switch (type) {
    case 'extension':
      return `Extension is ${(condition.extensions || []).join(', ')}`;
    case 'keyword':
      return `Filename contains "${condition.keyword}"${condition.caseSensitive ? ' (case-sensitive)' : ''}`;
    case 'dateGroup':
      return `Group by ${condition.groupBy || 'month'}`;
    case 'size': {
      const mb = (condition.bytes / (1024 * 1024)).toFixed(1);
      return `Size ${condition.operator === 'gt' ? '>' : '<'} ${mb} MB`;
    }
    case 'regex':
      return `Filename matches /${condition.pattern}/${condition.flags || ''}`;
    case 'dateRange': {
      const parts = [];
      if (condition.from) parts.push(`from ${condition.from}`);
      if (condition.to) parts.push(`to ${condition.to}`);
      return `${condition.dateField || 'created'} date ${parts.join(' ')}`;
    }
    case 'category':
      return `Category: ${condition.category}`;
    default:
      return type;
  }
}
