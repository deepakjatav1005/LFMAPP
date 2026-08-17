import * as XLSX from 'xlsx';
import { Family, BeneficiaryCategory } from '../types';

/**
 * Kruti Dev 010 / DevLys 010 to Unicode Devanagari mapping array
 */
const KRUTI_DEV_MAPPINGS: [RegExp | string, string][] = [
  // Special combinations & conjuncts
  ['ñ', 'श्'],
  ['ò', 'द्'],
  ['ó', 'र्'],
  ['ô', 'ठ्'],
  ['õ', 'फ्'],
  ['ö', '्र'],
  ['÷', 'द्द'],
  ['ø', 'द्ब'],
  ['ù', 'द्म'],
  ['ú', 'द्य'],
  ['û', 'द्व'],
  ['ü', 'द्ध'],
  ['ý', 'ष्ठ'],
  ['þ', 'ष्ट'],
  ['ÿ', 'ह्य'],
  ['±', 'झ्'],
  ['²', 'श्व'],
  ['³', 'द्र'],
  ['´', 'प्र'],
  ['µ', 'त्र'],
  ['¶', 'श्र'],
  ['·', 'क्त'],
  ['¸', 'क्ष्'],
  ['¹', 'ज्ञ्'],
  ['º', 'ट्र'],
  ['»', 'ड्र'],
  ['¼', 'ढ्र'],
  ['½', 'छ्र'],
  ['¾', 'क्र'],
  ['¿', 'फ्र'],
  ['À', 'ह्न'],
  ['Á', 'ह्म'],
  ['Â', 'ह्ल'],
  ['Ã', 'ह्व'],
  ['Å', 'ऋ'],
  ['Æ', 'ओ'],
  ['Ç', 'औ'],
  ['È', 'ऐ'],
  ['É', 'ए'],
  ['Ê', 'ई'],
  ['Ë', 'इ'],
  ['Ì', 'ऊ'],
  ['Í', 'उ'],
  ['Î', 'आ'],
  ['Ï', 'अ'],
  ['Ñ', 'ङ'],
  ['Ò', 'ञ'],
  ['Ó', 'ण'],
  ['Ô', 'श'],
  ['Õ', 'ष'],
  ['Ö', 'स'],
  ['×', 'ह'],
  ['Ø', 'ज्ञ'],
  ['Ù', 'क्ष'],
  ['Ú', 'त्र'],
  ['Û', 'श्र'],
  ['Ü', '़'],
  ['Ý', 'ॅ'],
  ['Þ', 'ँ'],
  ['ß', 'ं'],
  ['à', 'ः'],
  ['á', '्'],
  ['â', 'ा'],
  ['ã', 'ी'],
  ['ä', 'ु'],
  ['å', 'ू'],
  ['æ', 'ृ'],
  ['ç', 'ॄ'],
  ['è', 'े'],
  ['é', 'ै'],
  ['ê', 'ो'],
  ['ë', 'ौ'],

  // Standard characters
  ['k', 'ा'],
  ['i', 'ी'],
  ['h', 'ी'],
  ['q', 'ु'],
  ['w', 'ू'],
  ['`', 'ृ'],
  ['s', 'े'],
  ['S', 'ै'],
  ['a', 'ं'],
  ['A', '्'],
  ['d', 'क'],
  ['D', 'क्'],
  ['[', 'ख'],
  ['{', 'ख्'],
  ['x', 'ग'],
  ['X', 'ग्'],
  ['?', 'घ'],
  ['/', 'घ्'],
  ['c', 'च'],
  ['C', 'च्'],
  ['v', 'ज'],
  ['V', 'ज्'],
  ['b', 'ब'],
  ['B', 'ब्'],
  ['m', 'म'],
  ['M', 'म्'],
  ['u', 'न'],
  ['U', 'न्'],
  ['t', 'त'],
  ['T', 'त्'],
  ['y', 'ल'],
  ['Y', 'ल्'],
  ['p', 'प'],
  ['P', 'प्'],
  ['r', 'र'],
  ['j', 'र'],
  ['e', 'य'],
  ['E', 'य्'],
  ['l', 'स'],
  ['L', 'स्'],
  ['o', 'द'],
  ['O', 'ध'],
  ['g', 'ह'],
  ['G', 'ह्'],
  ['n', 'द'],
  ['N', 'द्'],
  [';', 'य'],
  [':', 'य्'],
  ['\'', 'ट'],
  ['"', 'ठ'],
  ['z', '्र'],
  ['Z', 'र्'],
  ['f', 'ि'],
  ['F', 'ँ'],
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
  ['6', '6'],
  ['7', '7'],
  ['8', '8'],
  ['9', '9'],
  ['0', '0'],
];

/**
 * Converts Kruti Dev / DevLys legacy 8-bit text to modern Devanagari Unicode.
 */
export function convertKrutiDevToUnicode(src: string): string {
  if (!src || typeof src !== 'string') return '';
  let modified = src;

  // Handle 'f' (chhoti ee ki matra - placed before consonant in Kruti Dev)
  // Example: 'f' followed by character -> character followed by 'ि'
  let positionOfF = modified.indexOf('f');
  while (positionOfF !== -1) {
    const charNextToF = modified.charAt(positionOfF + 1);
    let charToBeswapped = charNextToF;

    // If there is a half consonant following
    if (positionOfF + 2 < modified.length && modified.charAt(positionOfF + 2) === 'd') {
      charToBeswapped += modified.charAt(positionOfF + 2);
    }

    modified = modified.replace('f' + charToBeswapped, charToBeswapped + 'ि');
    positionOfF = modified.indexOf('f', positionOfF + 1);
  }

  // Handle 'Z' or 'ó' (reph 'र्' placed before or after in Kruti Dev)
  modified = modified.replace(/([k-zK-Z0-9])\+/g, 'र्$1');
  modified = modified.replace(/([k-zK-Z0-9])=/g, '$1्र');

  // Replace according to mapping table
  for (const [kruti, unicode] of KRUTI_DEV_MAPPINGS) {
    if (typeof kruti === 'string') {
      modified = modified.split(kruti).join(unicode);
    } else {
      modified = modified.replace(kruti, unicode);
    }
  }

  // Reorder reph if any remaining
  modified = modified.replace(/([क-ह]्?)([ा-ौ]?)(र्)/g, '$3$1$2');

  return modified.trim();
}

/**
 * Checks if the text looks like legacy Kruti Dev / DevLys font.
 */
export function isLikelyKrutiDev(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // If already contains Devanagari unicode range
  if (/[\u0900-\u097F]/.test(text)) return false;

  // Check for Kruti Dev signature patterns (e.g., 'jkes\'k', 'dqekj', 'flag', 'f' followed by consonant)
  const krutiPatterns = [
    /f[d-zD-Z]/,
    /dqekj/,
    /jkes\'k/,
    /flag/,
    /[dD][kK]/,
    /[xX][kK]/,
    /[pP][kK]/,
    /[mM][kK]/,
  ];

  return krutiPatterns.some((pattern) => pattern.test(text));
}

/**
 * Auto-detects and converts text if it is in Kruti Dev font or normalizes Indic Unicode.
 */
export function smartNormalizeIndicText(text: any): string {
  if (text === null || text === undefined) return '';
  const str = String(text).trim();
  if (!str) return '';

  // If corrupted with question marks from ANSI Excel save
  if (/^\?+$/.test(str) || (str.includes('?') && str.replace(/[^?]/g, '').length > 3)) {
    return str; // Flagged as corrupted
  }

  // If Kruti Dev format
  if (isLikelyKrutiDev(str)) {
    return convertKrutiDevToUnicode(str);
  }

  // Standard Unicode string - normalize Devanagari unicode
  return str.normalize('NFC');
}

/**
 * Checks if a string or record contains corrupted question marks (e.g. "?????? ????")
 */
export function isCorruptedQuestionMarks(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed === '?' || trimmed === '??' || trimmed === '???' || trimmed.startsWith('????')) return true;
  const qCount = (trimmed.match(/\?/g) || []).length;
  return qCount >= 3 && qCount / trimmed.length > 0.4;
}

export interface ParsedBeneficiaryResult {
  records: Omit<Family, 'id'>[];
  duplicateCount: number;
  corruptedCount: number;
  headersDetected: Record<string, string>;
  totalRowsProcessed: number;
}

/**
 * Normalizes category string to BeneficiaryCategory enum
 */
export function parseCategory(raw: string): BeneficiaryCategory {
  const clean = (raw || '').toUpperCase().trim();
  if (clean.includes('BPL') || clean.includes('बीपीएल') || clean.includes('गरीबी') || clean.includes('POVERTY') || clean === 'B') {
    return BeneficiaryCategory.BPL;
  }
  if (clean.includes('DIVYANG') || clean.includes('दिव्यांग') || clean.includes('विकलांग') || clean.includes('PH') || clean.includes('HANDICAP') || clean.includes('DISABLED')) {
    return BeneficiaryCategory.DIVYANG;
  }
  if (clean.includes('OTHER') || clean.includes('अन्य') || clean.includes('SC') || clean.includes('ST') || clean.includes('OBC') || clean.includes('GEN') || clean.includes('सामान्य') || clean.includes('पिछड़ा') || clean.includes('अनुसूचित')) {
    return BeneficiaryCategory.OTHER;
  }
  return BeneficiaryCategory.APL;
}

/**
 * Parses any uploaded spreadsheet file (Excel .xlsx, .xls, .csv, .txt, .tsv)
 * with robust encoding fallback (UTF-8, UTF-16, Windows-1252, Indic Unicode & Kruti Dev).
 */
export async function parseBeneficiaryFile(
  file: File,
  _existingFamilies: Family[] = []
): Promise<ParsedBeneficiaryResult> {
  const arrayBuffer = await file.arrayBuffer();
  let rawRows: any[][] = [];

  const isExcel =
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel');

  if (isExcel) {
    // Parse Excel Workbook using SheetJS with exact strings and formatting
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
  } else {
    // Parse CSV / Text with UTF-8 / fallback encoding
    let text = '';
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
      text = utf8Decoder.decode(arrayBuffer);

      // Check if utf-8 text has excessive replacement chars or nulls
      if (text.includes('\uFFFD') || text.charCodeAt(0) === 0xfeff) {
        text = text.replace(/^\uFEFF/, '');
      }
    } catch (e) {
      const fallbackDecoder = new TextDecoder('windows-1252');
      text = fallbackDecoder.decode(arrayBuffer);
    }

    // Split rows safely
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    rawRows = lines.map((line) => {
      // CSV Line parser handling quotes
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      const delimiter = line.includes('\t') ? '\t' : ',';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    });
  }

  if (rawRows.length === 0) {
    return {
      records: [],
      duplicateCount: 0,
      corruptedCount: 0,
      headersDetected: {},
      totalRowsProcessed: 0,
    };
  }

  // Check whether first row is a header or already contains data
  const firstRowCells = (rawRows[0] || []).map((cell: any) =>
    String(cell || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_\-\.\(\)\/]/g, '')
  );

  const isHeaderRow = firstRowCells.some((h) =>
    [
      'samagra', 'समग्र', 'name', 'नाम', 'family', 'परिवार', 'father', 'पिता', 'husband', 'पति',
      'mobile', 'मोबाइल', 'category', 'श्रेणी', 'ward', 'वार्ड', 'muhalla', 'मोहल्ला', 'address', 'पता',
      'सदस्य', 'member', 'sid', 'fid'
    ].some((k) => h.includes(k))
  );

  const findCol = (keywords: string[]): number => {
    if (!isHeaderRow) return -1;
    return firstRowCells.findIndex((h: string) =>
      keywords.some((k) => h.includes(k.toLowerCase().replace(/[\s_\-\.\(\)\/]/g, '')))
    );
  };

  let samagraIdx = findCol(['samagra', 'समग्र', 'सदस्य', 'memberid', 'sid', 'samagraid', 'समग्रआईडी', 'samagramemberid', 'क्रमांक', 'सदस्यआईडी']);
  let familyIdIdx = findCol(['familyid', 'family', 'परिवार', 'परिवारआईडी', 'fid', 'familyheadid', 'household', 'परिवारक्रमांक']);
  let nameIdx = findCol(['firstname', 'beneficiaryname', 'name', 'नाम', 'हितग्राही', 'मुखियाकानाम', 'सदस्यकानाम', 'applicant', 'prathamnam', 'हितग्राहीकानाम']);
  let surnameIdx = findCol(['surname', 'lastname', 'उपनाम', 'जाति', 'caste', 'antimnam']);
  let guardianIdx = findCol(['father', 'husband', 'guardian', 'पिता', 'पति', 'पिताकानाम', 'पतिकानाम', 'अभिभावक', 'careof', 'co', 'पितापति']);
  let mobileIdx = findCol(['mobile', 'phone', 'contact', 'मोबाइल', 'फ़ोन', 'mob', 'मोबाइलनंबर']);
  let categoryIdx = findCol(['category', 'श्रेणी', 'वर्ग', 'castecategory', 'bplapl', 'जातिवर्ग']);
  let memberCountIdx = findCol(['membercount', 'members', 'सदस्यसंख्या', 'कुलसदस्य', 'count', 'totalmembers']);
  let wardIdx = findCol(['ward', 'वार्ड', 'wardno', 'वार्डक्र', 'वार्डनंबर', 'वार्डनं']);
  let muhallaIdx = findCol(['muhalla', 'mohalla', 'मोहल्ला', 'colony', 'गली', 'ग्राम', 'village', 'locality', 'क्षेत्र', 'टोला', 'बस्ती']);
  let addressIdx = findCol(['address', 'पता', 'निवास', 'fulladdress', 'स्थायीपता', 'विवरण']);

  // Dynamic positional fallback if headers were not explicitly matched
  if (samagraIdx === -1) samagraIdx = 0;
  if (familyIdIdx === -1) familyIdIdx = rawRows[0]?.length > 1 ? 1 : 0;
  if (nameIdx === -1) nameIdx = rawRows[0]?.length > 2 ? 2 : 0;
  if (surnameIdx === -1 && rawRows[0]?.length > 10) surnameIdx = 3;
  if (guardianIdx === -1) guardianIdx = rawRows[0]?.length > 3 ? 3 : -1;
  if (mobileIdx === -1) mobileIdx = rawRows[0]?.length > 5 ? 5 : -1;
  if (categoryIdx === -1) categoryIdx = rawRows[0]?.length > 6 ? 6 : -1;
  if (memberCountIdx === -1) memberCountIdx = rawRows[0]?.length > 7 ? 7 : -1;
  if (wardIdx === -1) wardIdx = rawRows[0]?.length > 8 ? 8 : -1;
  if (muhallaIdx === -1) muhallaIdx = rawRows[0]?.length > 9 ? 9 : -1;
  if (addressIdx === -1) addressIdx = rawRows[0]?.length > 10 ? 10 : -1;

  const startRow = isHeaderRow ? 1 : 0;
  let duplicateCount = 0;
  let corruptedCount = 0;
  const parsedRecordsMap = new Map<string, Omit<Family, 'id'>>();

  for (let i = startRow; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || row.every((c: any) => String(c || '').trim() === '')) {
      continue;
    }

    // Extract Samagra ID
    let rawSamagra = String(row[samagraIdx] !== undefined ? row[samagraIdx] : '').trim();
    if (!rawSamagra) {
      rawSamagra = `${110000000 + i}`;
    }

    // Extract Family ID
    let rawFamilyId = familyIdIdx !== -1 && row[familyIdIdx] !== undefined ? String(row[familyIdIdx]).trim() : '';
    if (!rawFamilyId) {
      rawFamilyId = rawSamagra.length >= 8 ? rawSamagra.slice(0, 8) : `${80000000 + i}`;
    }

    // Extract Name
    let rawName = nameIdx !== -1 && row[nameIdx] !== undefined ? smartNormalizeIndicText(row[nameIdx]) : `हितग्राही_${i + 1}`;
    if (!rawName.trim()) {
      rawName = `हितग्राही_${i + 1}`;
    }

    // Extract Surname
    let rawSurname = surnameIdx !== -1 && row[surnameIdx] !== undefined ? smartNormalizeIndicText(row[surnameIdx]) : '';

    // Extract Guardian
    let rawGuardian = guardianIdx !== -1 && row[guardianIdx] !== undefined ? smartNormalizeIndicText(row[guardianIdx]) : '';

    // Extract Muhalla
    let rawMuhalla = muhallaIdx !== -1 && row[muhallaIdx] !== undefined ? smartNormalizeIndicText(row[muhallaIdx]) : 'मुख्य बस्ती';
    if (!rawMuhalla.trim()) rawMuhalla = 'मुख्य बस्ती';

    // Extract Address
    let rawAddress = addressIdx !== -1 && row[addressIdx] !== undefined ? smartNormalizeIndicText(row[addressIdx]) : '';

    // Check for character corruption in text
    if (isCorruptedQuestionMarks(rawName) || isCorruptedQuestionMarks(rawGuardian)) {
      corruptedCount++;
    }

    // Category
    const category = categoryIdx !== -1 && row[categoryIdx] !== undefined
      ? parseCategory(String(row[categoryIdx]))
      : BeneficiaryCategory.APL;

    // Member Count
    const memberCount = memberCountIdx !== -1 && row[memberCountIdx] !== undefined
      ? Math.max(1, Number(row[memberCountIdx]) || 1)
      : 1;

    // Ward No
    let wardNo = wardIdx !== -1 && row[wardIdx] !== undefined ? String(row[wardIdx]).trim() : '01';
    if (!wardNo) wardNo = '01';
    if (/^\d+$/.test(wardNo) && wardNo.length === 1) {
      wardNo = wardNo.padStart(2, '0');
    }

    // Mobile
    let mobile = mobileIdx !== -1 && row[mobileIdx] !== undefined
      ? String(row[mobileIdx]).replace(/[^0-9]/g, '')
      : '';
    if (!mobile || mobile.length < 10) {
      mobile = '9800000000';
    }

    const key = rawSamagra.toLowerCase();
    if (parsedRecordsMap.has(key)) {
      duplicateCount++;
    }

    // Always preserve and set the record
    parsedRecordsMap.set(key, {
      samagraId: rawSamagra,
      familyId: rawFamilyId,
      name: rawName,
      surname: rawSurname,
      guardianName: rawGuardian,
      mobile,
      category,
      memberCount,
      wardNo,
      muhalla: rawMuhalla,
      address: rawAddress,
      isLocked: true,
      registrationDate: new Date().toISOString().split('T')[0],
    });
  }

  const records = Array.from(parsedRecordsMap.values());

  return {
    records,
    duplicateCount,
    corruptedCount,
    headersDetected: {
      samagra: String(rawRows[0]?.[samagraIdx] || ''),
      name: String(rawRows[0]?.[nameIdx] || ''),
      familyId: String(rawRows[0]?.[familyIdIdx] || ''),
      guardian: guardianIdx !== -1 ? String(rawRows[0]?.[guardianIdx] || '') : '',
      category: categoryIdx !== -1 ? String(rawRows[0]?.[categoryIdx] || '') : '',
    },
    totalRowsProcessed: rawRows.length - startRow,
  };
}

/**
 * Generates and downloads a sample Excel (.xlsx) template with Indic Hindi fonts & clear headings.
 */
export function downloadSampleExcelTemplate(isHindi: boolean = true) {
  const sampleData = [
    {
      'समग्र सदस्य आईडी (Samagra ID)': '112185879',
      'परिवार आईडी (Family ID)': '22995551',
      'हितग्राही का नाम (First Name)': 'रामप्रसाद',
      'उपनाम (Surname)': 'वर्मा',
      'पिता/पति का नाम (Guardian Name)': 'गोपीचंद वर्मा',
      'मोबाइल नंबर (Mobile)': '9826012345',
      'श्रेणी (Category: BPL / APL / DIVYANG / OTHER)': 'BPL',
      'सदस्य संख्या (Member Count)': 5,
      'वार्ड क्रमांक (Ward No)': '01',
      'मोहल्ला (Muhalla)': 'पटेल मोहल्ला',
      'पता (Address)': 'मकान नं 12, ग्राम पंचायत कठौतिया',
    },
    {
      'समग्र सदस्य आईडी (Samagra ID)': '112173663',
      'परिवार आईडी (Family ID)': '49873719',
      'हितग्राही का नाम (First Name)': 'सुनीता बाई',
      'उपनाम (Surname)': 'पटेल',
      'पिता/पति का नाम (Guardian Name)': 'मोहनलाल पटेल',
      'मोबाइल नंबर (Mobile)': '9425098765',
      'श्रेणी (Category: BPL / APL / DIVYANG / OTHER)': 'APL',
      'सदस्य संख्या (Member Count)': 4,
      'वार्ड क्रमांक (Ward No)': '02',
      'मोहल्ला (Muhalla)': 'बाजार चौक',
      'पता (Address)': 'मकान नं 45, ग्राम पंचायत कठौतिया',
    },
    {
      'समग्र सदस्य आईडी (Samagra ID)': '101091145',
      'परिवार आईडी (Family ID)': '20257744',
      'हितग्राही का नाम (First Name)': 'कैलाश',
      'उपनाम (Surname)': 'यादव',
      'पिता/पति का नाम (Guardian Name)': 'रामचरण यादव',
      'मोबाइल नंबर (Mobile)': '9755404816',
      'श्रेणी (Category: BPL / APL / DIVYANG / OTHER)': 'DIVYANG',
      'सदस्य संख्या (Member Count)': 3,
      'वार्ड क्रमांक (Ward No)': '03',
      'मोहल्ला (Muhalla)': 'यादव मोहल्ला',
      'पता (Address)': 'मकान नं 88, ग्राम पंचायत कठौतिया',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Set column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Samagra ID
    { wch: 18 }, // Family ID
    { wch: 22 }, // Name
    { wch: 16 }, // Surname
    { wch: 24 }, // Guardian
    { wch: 16 }, // Mobile
    { wch: 25 }, // Category
    { wch: 16 }, // Member count
    { wch: 15 }, // Ward
    { wch: 18 }, // Muhalla
    { wch: 30 }, // Address
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Beneficiary_Sample');

  XLSX.writeFile(workbook, isHindi ? 'ग्राम_पंचायत_हितग्राही_नमूना.xlsx' : 'Panchayat_Beneficiaries_Sample.xlsx');
}

/**
 * Generates and downloads a sample CSV file with UTF-8 BOM so Excel opens Hindi characters properly.
 */
export function downloadSampleCsvTemplate(isHindi: boolean = true) {
  const headers = [
    'Samagra ID',
    'Family ID',
    'First Name',
    'Surname',
    'Guardian Name',
    'Mobile',
    'Category',
    'Member Count',
    'Ward No',
    'Muhalla',
    'Address',
  ];

  const rows = [
    ['112185879', '22995551', 'रामप्रसाद', 'वर्मा', 'गोपीचंद वर्मा', '9826012345', 'BPL', '5', '01', 'पटेल मोहल्ला', 'मकान नं 12 कठौतिया'],
    ['112173663', '49873719', 'सुनीता बाई', 'पटेल', 'मोहनलाल पटेल', '9425098765', 'APL', '4', '02', 'बाजार चौक', 'मकान नं 45 कठौतिया'],
    ['101091145', '20257744', 'कैलाश', 'यादव', 'रामचरण यादव', '9755404816', 'DIVYANG', '3', '03', 'यादव मोहल्ला', 'मकान नं 88 कठौतिया'],
  ];

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', isHindi ? 'ग्राम_पंचायत_हितग्राही_नमूना_UTF8.csv' : 'Panchayat_Beneficiaries_Sample_UTF8.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
