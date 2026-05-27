const fs = require('fs');
const path = require('path');

const industries = [
  "E-Commerce", "HR", "Events", "Healthcare", 
  "Marketing", "Technology", "Education", "Real Estate", 
  "Finance", "Hospitality", "Legal", "Creative"
];

const colors = [
  "slate", "gray", "red", "orange", "amber", "yellow", 
  "lime", "green", "emerald", "teal", "cyan", "sky", 
  "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"
];

const fonts = ["font-sans", "font-serif", "font-mono"];

const borderStyles = [
  { card: "rounded-xl shadow-md border-0", input: "rounded-lg border-2", btn: "rounded-full shadow-sm" },
  { card: "rounded-none shadow-none border-2", input: "rounded-none border", btn: "rounded-none" },
  { card: "rounded-3xl shadow-xl border border-white/20", input: "rounded-2xl border-0 ring-1", btn: "rounded-2xl shadow-lg" },
  { card: "rounded-sm shadow-[8px_8px_0_0_#000] border-4 border-black", input: "rounded-none border-2 border-black", btn: "rounded-sm border-2 border-black shadow-[4px_4px_0_0_#000]" }
];

const bgStyles = [
  "bg-COLOR-50",
  "bg-gradient-to-br from-COLOR-100 to-white",
  "bg-COLOR-950 text-COLOR-50"
];

let themesOutput = "type ThemeConfig = {\n  page: string;\n  card: string;\n  divider: string;\n  title: string;\n  muted: string;\n  label: string;\n  input: string;\n  textarea: string;\n  select: string;\n  optionChip: string;\n  optionChipSelected: string;\n  checkboxRow: string;\n  checkboxRowSelected: string;\n  checkboxEl: string;\n  starInactive: string;\n  starActive: string;\n  button: string;\n  buttonGhost: string;\n  progressTrack: string;\n  progressFill: string;\n  counter: string;\n  required: string;\n  convBg: string;\n  dropzone: string;\n  cardPadding: string;\n  titleLayout: string;\n  fieldGap: string;\n  labelSpacing: string;\n};\n\nexport const THEMES: Record<string, ThemeConfig> = {\n";

themesOutput += "  default: {\n    page: \"bg-white text-black font-sans\",\n    card: \"bg-white border-2 border-gray-200 rounded-xl shadow-sm\",\n    divider: \"border-gray-200\",\n    title: \"text-gray-900 font-bold tracking-tight\",\n    muted: \"text-gray-500\",\n    label: \"text-gray-700 font-medium text-sm\",\n    input: \"bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all px-3\",\n    textarea: \"bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all p-3\",\n    select: \"bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none px-3\",\n    optionChip: \"border border-gray-200 bg-white text-gray-700 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-colors font-medium\",\n    optionChipSelected: \"border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-lg font-semibold shadow-sm\",\n    checkboxRow: \"border border-gray-200 bg-white text-gray-700 rounded-lg hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors font-medium\",\n    checkboxRowSelected: \"border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-lg font-semibold\",\n    checkboxEl: \"rounded border-gray-300 text-blue-600\",\n    starInactive: \"text-gray-300 hover:text-yellow-400\",\n    starActive: \"text-yellow-400 fill-yellow-400\",\n    button: \"bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm\",\n    buttonGhost: \"bg-white text-gray-600 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors\",\n    progressTrack: \"bg-gray-100\",\n    progressFill: \"bg-blue-600\",\n    counter: \"text-gray-500 font-medium text-[11px] uppercase tracking-wider\",\n    required: \"text-red-500\",\n    convBg: \"bg-gray-50 text-gray-900\",\n    dropzone: \"border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 rounded-lg\",\n    cardPadding: \"p-6 sm:p-10\",\n    titleLayout: \"space-y-2 border-b border-gray-100 pb-6\",\n    fieldGap: \"space-y-8\",\n    labelSpacing: \"space-y-2\",\n  },\n";

const templatesDb = [];

for (let i = 0; i < industries.length; i++) {
  const industry = industries[i];
  const indKey = industry.toLowerCase().replace(/[^a-z0-9]/g, '');
  const c = colors[i % colors.length];

  for (let j = 0; j < 10; j++) {
    const themeId = indKey + "_" + (j + 1);
    
    const font = fonts[(i + j) % fonts.length];
    const border = borderStyles[(i * 3 + j) % borderStyles.length];
    const bg = bgStyles[(i * 5 + j) % bgStyles.length].replace(/COLOR/g, c);
    
    const isDark = bg.includes('950');
    
    const pageBg = isDark ? "bg-" + c + "-950 text-" + c + "-50" : bg;
    const cardBg = isDark ? "bg-" + c + "-900/50 backdrop-blur border-" + c + "-700" : "bg-white border-" + c + "-200";
    const textColor = isDark ? "text-" + c + "-50" : "text-" + c + "-950";
    const mutedColor = isDark ? "text-" + c + "-400" : "text-" + c + "-500";
    const primaryBg = "bg-" + c + "-600";
    const primaryText = "text-white";
    const ringColor = "ring-" + c + "-500";
    
    const config = "  " + themeId + ": {\n" +
    "    page: \"" + pageBg + " " + font + " min-h-screen p-4 flex items-center justify-center\",\n" +
    "    card: \"w-full max-w-3xl " + cardBg + " " + border.card + "\",\n" +
    "    divider: \"border-" + c + "-200\",\n" +
    "    title: \"" + textColor + " font-bold text-3xl\",\n" +
    "    muted: \"" + mutedColor + " text-sm\",\n" +
    "    label: \"" + textColor + " font-medium text-sm\",\n" +
    "    input: \"bg-transparent " + border.input + " border-" + c + "-300 " + textColor + " focus-visible:" + ringColor + " focus-visible:ring-2 px-4 py-2 w-full transition-all\",\n" +
    "    textarea: \"bg-transparent " + border.input + " border-" + c + "-300 " + textColor + " focus-visible:" + ringColor + " focus-visible:ring-2 p-4 w-full transition-all\",\n" +
    "    select: \"bg-transparent " + border.input + " border-" + c + "-300 " + textColor + " focus-visible:" + ringColor + " px-4 py-2 w-full\",\n" +
    "    optionChip: \"border border-" + c + "-200 " + (isDark ? 'bg-black/20' : 'bg-white') + " " + textColor + " " + border.input + " hover:border-" + c + "-400 transition-colors cursor-pointer\",\n" +
    "    optionChipSelected: \"border-2 border-" + c + "-500 " + (isDark ? 'bg-'+c+'-900/50' : 'bg-'+c+'-50') + " text-" + c + "-700 " + border.input + "\",\n" +
    "    checkboxRow: \"border border-" + c + "-200 " + (isDark ? 'bg-black/20' : 'bg-white') + " " + textColor + " " + border.input + " hover:border-" + c + "-400 transition-colors cursor-pointer px-4 py-3\",\n" +
    "    checkboxRowSelected: \"border-2 border-" + c + "-500 " + (isDark ? 'bg-'+c+'-900/50' : 'bg-'+c+'-50') + " text-" + c + "-700 " + border.input + " px-4 py-3\",\n" +
    "    checkboxEl: \"rounded border-" + c + "-300 text-" + c + "-600\",\n" +
    "    starInactive: \"text-" + c + "-200 hover:text-" + c + "-400\",\n" +
    "    starActive: \"text-" + c + "-500 fill-" + c + "-500\",\n" +
    "    button: \"" + primaryBg + " " + primaryText + " " + border.btn + " font-semibold hover:opacity-90 transition-opacity py-3 px-6\",\n" +
    "    buttonGhost: \"bg-transparent " + textColor + " border border-" + c + "-300 " + border.btn + " hover:bg-" + c + "-100 transition-colors py-3 px-6\",\n" +
    "    progressTrack: \"bg-" + c + "-100\",\n" +
    "    progressFill: \"" + primaryBg + "\",\n" +
    "    counter: \"" + mutedColor + " font-bold text-xs uppercase\",\n" +
    "    required: \"text-red-500\",\n" +
    "    convBg: \"" + pageBg + "\",\n" +
    "    dropzone: \"border-2 border-dashed border-" + c + "-300 " + (isDark ? 'bg-black/10' : 'bg-'+c+'-50') + " " + mutedColor + " " + border.input + "\",\n" +
    "    cardPadding: \"p-8\",\n" +
    "    titleLayout: \"space-y-2 mb-8 border-b border-" + c + "-100 pb-4\",\n" +
    "    fieldGap: \"space-y-6\",\n" +
    "    labelSpacing: \"space-y-2\",\n" +
    "  },\n";

    themesOutput += config;
    
    templatesDb.push({
      title: industry + " Form " + (j + 1),
      description: "A highly optimized and uniquely designed " + industry + " template. Build forms tailored precisely for your use case.",
      industry: industry,
      theme: themeId,
      downloadsCount: Math.floor(Math.random() * 5000),
      isCurated: true,
      price: j > 4 ? 999 : 0
    });
  }
}

themesOutput += "};\n";

fs.writeFileSync(path.join(__dirname, 'apps/web/lib/themes.ts'), themesOutput);
fs.writeFileSync(path.join(__dirname, 'templates_data.json'), JSON.stringify(templatesDb, null, 2));

console.log('Successfully generated 120 unique themes and template data!');
