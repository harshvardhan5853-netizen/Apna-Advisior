import type { MarketCapCategory } from "@/types/portfolio";

export interface StaticStockMeta {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: MarketCapCategory;
}

export const STOCKS: StaticStockMeta[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", industry: "Oil & Gas Refining", marketCap: "Large" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology", industry: "IT Services", marketCap: "Large" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "INFY", name: "Infosys", sector: "Information Technology", industry: "IT Services", marketCap: "Large" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "Consumer Staples", industry: "Personal Care", marketCap: "Large" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services", industry: "Public Bank", marketCap: "Large" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Communication Services", industry: "Telecom", marketCap: "Large" },
  { symbol: "ITC", name: "ITC", sector: "Consumer Staples", industry: "Diversified FMCG", marketCap: "Large" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Industrials", industry: "Construction & Engineering", marketCap: "Large" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Discretionary", industry: "Paints", marketCap: "Large" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "Information Technology", industry: "IT Services", marketCap: "Large" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer Discretionary", industry: "Retail", marketCap: "Large" },
  { symbol: "WIPRO", name: "Wipro", sector: "Information Technology", industry: "IT Services", marketCap: "Large" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Materials", industry: "Cement", marketCap: "Large" },
  { symbol: "NTPC", name: "NTPC", sector: "Utilities", industry: "Power Generation", marketCap: "Large" },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "Consumer Staples", industry: "Packaged Foods", marketCap: "Large" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India", sector: "Utilities", industry: "Power Transmission", marketCap: "Large" },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Industrials", industry: "Diversified Trading", marketCap: "Large" },
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", sector: "Industrials", industry: "Ports & Logistics", marketCap: "Large" },
  { symbol: "COALINDIA", name: "Coal India", sector: "Energy", industry: "Coal Mining", marketCap: "Large" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation", sector: "Energy", industry: "Oil & Gas Exploration", marketCap: "Large" },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Materials", industry: "Steel", marketCap: "Large" },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Materials", industry: "Steel", marketCap: "Large" },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Materials", industry: "Aluminium", marketCap: "Large" },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "Information Technology", industry: "IT Services", marketCap: "Large" },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Materials", industry: "Cement & Diversified", marketCap: "Large" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "CIPLA", name: "Cipla", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise", sector: "Healthcare", industry: "Hospitals", marketCap: "Large" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services", industry: "Financial Holding", marketCap: "Large" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Financial Services", industry: "Life Insurance", marketCap: "Large" },
  { symbol: "SBILIFE", name: "SBI Life Insurance", sector: "Financial Services", industry: "Life Insurance", marketCap: "Large" },
  { symbol: "BRITANNIA", name: "Britannia Industries", sector: "Consumer Staples", industry: "Packaged Foods", marketCap: "Large" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "Consumer Staples", industry: "Packaged Foods", marketCap: "Large" },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation", sector: "Energy", industry: "Oil & Gas Refining", marketCap: "Large" },
  { symbol: "IOC", name: "Indian Oil Corporation", sector: "Energy", industry: "Oil & Gas Refining", marketCap: "Large" },
  { symbol: "GAIL", name: "GAIL India", sector: "Energy", industry: "Gas Distribution", marketCap: "Large" },
  { symbol: "SHREECEM", name: "Shree Cement", sector: "Materials", industry: "Cement", marketCap: "Large" },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Industrials", industry: "Defence", marketCap: "Large" },
  { symbol: "BHEL", name: "Bharat Heavy Electricals", sector: "Industrials", industry: "Heavy Electricals", marketCap: "Mid" },
  { symbol: "PIDILITIND", name: "Pidilite Industries", sector: "Materials", industry: "Adhesives & Chemicals", marketCap: "Large" },
  { symbol: "DABUR", name: "Dabur India", sector: "Consumer Staples", industry: "Personal Care", marketCap: "Large" },
  { symbol: "GODREJCP", name: "Godrej Consumer Products", sector: "Consumer Staples", industry: "Personal Care", marketCap: "Large" },
  { symbol: "MARICO", name: "Marico", sector: "Consumer Staples", industry: "Personal Care", marketCap: "Large" },
  { symbol: "HAVELLS", name: "Havells India", sector: "Consumer Discretionary", industry: "Consumer Electricals", marketCap: "Large" },
  { symbol: "AMBUJACEM", name: "Ambuja Cements", sector: "Materials", industry: "Cement", marketCap: "Large" },
  { symbol: "DLF", name: "DLF", sector: "Real Estate", industry: "Real Estate Development", marketCap: "Large" },
  { symbol: "GODREJPROP", name: "Godrej Properties", sector: "Real Estate", industry: "Real Estate Development", marketCap: "Mid" },
  { symbol: "OBEROIRLTY", name: "Oberoi Realty", sector: "Real Estate", industry: "Real Estate Development", marketCap: "Mid" },
  { symbol: "TATAPOWER", name: "Tata Power Company", sector: "Utilities", industry: "Power Generation", marketCap: "Large" },
  { symbol: "ADANIGREEN", name: "Adani Green Energy", sector: "Utilities", industry: "Renewable Energy", marketCap: "Large" },
  { symbol: "ADANIPOWER", name: "Adani Power", sector: "Utilities", industry: "Power Generation", marketCap: "Large" },
  { symbol: "PFC", name: "Power Finance Corporation", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "RECLTD", name: "REC", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "IRCTC", name: "Indian Railway Catering & Tourism Corp", sector: "Consumer Discretionary", industry: "Travel Services", marketCap: "Mid" },
  { symbol: "IRFC", name: "Indian Railway Finance Corporation", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "ZOMATO", name: "Zomato", sector: "Consumer Discretionary", industry: "Food Delivery", marketCap: "Large" },
  { symbol: "NYKAA", name: "FSN E-Commerce Ventures", sector: "Consumer Discretionary", industry: "E-Commerce", marketCap: "Mid" },
  { symbol: "PAYTM", name: "One97 Communications", sector: "Financial Services", industry: "Fintech", marketCap: "Mid" },
  { symbol: "POLICYBZR", name: "PB Fintech", sector: "Financial Services", industry: "Fintech", marketCap: "Mid" },
  { symbol: "LTIM", name: "LTIMindtree", sector: "Information Technology", industry: "IT Services", marketCap: "Large" },
  { symbol: "PERSISTENT", name: "Persistent Systems", sector: "Information Technology", industry: "IT Services", marketCap: "Mid" },
  { symbol: "COFORGE", name: "Coforge", sector: "Information Technology", industry: "IT Services", marketCap: "Mid" },
  { symbol: "MPHASIS", name: "Mphasis", sector: "Information Technology", industry: "IT Services", marketCap: "Mid" },
  { symbol: "SYNGENE", name: "Syngene International", sector: "Healthcare", industry: "Contract Research", marketCap: "Mid" },
  { symbol: "BIOCON", name: "Biocon", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Mid" },
  { symbol: "LUPIN", name: "Lupin", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "TORNTPHARM", name: "Torrent Pharmaceuticals", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "ZYDUSLIFE", name: "Zydus Lifesciences", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Large" },
  { symbol: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Mid" },
  { symbol: "GLAND", name: "Gland Pharma", sector: "Healthcare", industry: "Pharmaceuticals", marketCap: "Mid" },
  { symbol: "MAXHEALTH", name: "Max Healthcare Institute", sector: "Healthcare", industry: "Hospitals", marketCap: "Large" },
  { symbol: "FORTIS", name: "Fortis Healthcare", sector: "Healthcare", industry: "Hospitals", marketCap: "Mid" },
  { symbol: "NH", name: "Narayana Hrudayalaya", sector: "Healthcare", industry: "Hospitals", marketCap: "Mid" },
  { symbol: "POLYCAB", name: "Polycab India", sector: "Consumer Discretionary", industry: "Cables & Wires", marketCap: "Large" },
  { symbol: "CROMPTON", name: "Crompton Greaves Consumer Electricals", sector: "Consumer Discretionary", industry: "Consumer Electricals", marketCap: "Mid" },
  { symbol: "VOLTAS", name: "Voltas", sector: "Consumer Discretionary", industry: "Consumer Electricals", marketCap: "Mid" },
  { symbol: "BLUESTARCO", name: "Blue Star", sector: "Consumer Discretionary", industry: "Consumer Electricals", marketCap: "Mid" },
  { symbol: "DIXON", name: "Dixon Technologies India", sector: "Consumer Discretionary", industry: "Consumer Electronics", marketCap: "Large" },
  { symbol: "PGEL", name: "PG Electroplast", sector: "Consumer Discretionary", industry: "Consumer Electronics", marketCap: "Small" },
  { symbol: "AMBER", name: "Amber Enterprises India", sector: "Consumer Discretionary", industry: "Consumer Electronics", marketCap: "Mid" },
  { symbol: "PIIND", name: "PI Industries", sector: "Materials", industry: "Agrochemicals", marketCap: "Large" },
  { symbol: "UPL", name: "UPL", sector: "Materials", industry: "Agrochemicals", marketCap: "Large" },
  { symbol: "BAYERCROP", name: "Bayer CropScience", sector: "Materials", industry: "Agrochemicals", marketCap: "Mid" },
  { symbol: "SRF", name: "SRF", sector: "Materials", industry: "Speciality Chemicals", marketCap: "Large" },
  { symbol: "AARTIIND", name: "Aarti Industries", sector: "Materials", industry: "Speciality Chemicals", marketCap: "Mid" },
  { symbol: "DEEPAKNTR", name: "Deepak Nitrite", sector: "Materials", industry: "Speciality Chemicals", marketCap: "Mid" },
  { symbol: "TATACHEM", name: "Tata Chemicals", sector: "Materials", industry: "Chemicals", marketCap: "Mid" },
  { symbol: "ANGELONE", name: "Angel One", sector: "Financial Services", industry: "Broking", marketCap: "Mid" },
  { symbol: "MOTILALOFS", name: "Motilal Oswal Financial Services", sector: "Financial Services", industry: "Broking", marketCap: "Mid" },
  { symbol: "ICICIGI", name: "ICICI Lombard General Insurance", sector: "Financial Services", industry: "General Insurance", marketCap: "Large" },
  { symbol: "ICICIPRULI", name: "ICICI Prudential Life Insurance", sector: "Financial Services", industry: "Life Insurance", marketCap: "Large" },
  { symbol: "MAXFIN", name: "Max Financial Services", sector: "Financial Services", industry: "Life Insurance Holding", marketCap: "Mid" },
  { symbol: "MUTHOOTFIN", name: "Muthoot Finance", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "MANAPPURAM", name: "Manappuram Finance", sector: "Financial Services", industry: "NBFC", marketCap: "Mid" },
  { symbol: "CHOLAFIN", name: "Cholamandalam Investment & Finance", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "BAJAJHLDNG", name: "Bajaj Holdings & Investment", sector: "Financial Services", industry: "Investment Holding", marketCap: "Large" },
  { symbol: "CDSL", name: "Central Depository Services India", sector: "Financial Services", industry: "Depository", marketCap: "Mid" },
  { symbol: "BSE", name: "BSE", sector: "Financial Services", industry: "Exchange", marketCap: "Mid" },
  { symbol: "MCX", name: "Multi Commodity Exchange of India", sector: "Financial Services", industry: "Exchange", marketCap: "Mid" },
  { symbol: "KFINTECH", name: "KFin Technologies", sector: "Financial Services", industry: "Registrar & Transfer Agent", marketCap: "Mid" },
  { symbol: "CAMS", name: "Computer Age Management Services", sector: "Financial Services", industry: "Registrar & Transfer Agent", marketCap: "Mid" },
  { symbol: "DATAPATTNS", name: "Data Patterns India", sector: "Industrials", industry: "Defence Electronics", marketCap: "Mid" },
  { symbol: "HAL", name: "Hindustan Aeronautics", sector: "Industrials", industry: "Defence", marketCap: "Large" },
  { symbol: "MAZDOCK", name: "Mazagon Dock Shipbuilders", sector: "Industrials", industry: "Defence", marketCap: "Large" },
  { symbol: "COCHINSHIP", name: "Cochin Shipyard", sector: "Industrials", industry: "Defence", marketCap: "Mid" },
  { symbol: "GRSE", name: "Garden Reach Shipbuilders", sector: "Industrials", industry: "Defence", marketCap: "Mid" },
  { symbol: "SIEMENS", name: "Siemens", sector: "Industrials", industry: "Heavy Electricals", marketCap: "Large" },
  { symbol: "ABB", name: "ABB India", sector: "Industrials", industry: "Heavy Electricals", marketCap: "Large" },
  { symbol: "CUMMINSIND", name: "Cummins India", sector: "Industrials", industry: "Industrial Machinery", marketCap: "Large" },
  { symbol: "THERMAX", name: "Thermax", sector: "Industrials", industry: "Industrial Machinery", marketCap: "Mid" },
  { symbol: "IEX", name: "Indian Energy Exchange", sector: "Utilities", industry: "Power Trading", marketCap: "Mid" },
  { symbol: "TRENT", name: "Trent", sector: "Consumer Discretionary", industry: "Retail", marketCap: "Large" },
  { symbol: "VBL", name: "Varun Beverages", sector: "Consumer Staples", industry: "Beverages", marketCap: "Large" },
  { symbol: "COLPAL", name: "Colgate-Palmolive India", sector: "Consumer Staples", industry: "Personal Care", marketCap: "Large" },
  { symbol: "PGHH", name: "Procter & Gamble Hygiene", sector: "Consumer Staples", industry: "Personal Care", marketCap: "Mid" },
  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services", industry: "NBFC", marketCap: "Large" },
  { symbol: "LICI", name: "Life Insurance Corporation of India", sector: "Financial Services", industry: "Life Insurance", marketCap: "Large" },
  { symbol: "IDBI", name: "IDBI Bank", sector: "Financial Services", industry: "Public Bank", marketCap: "Large" },
  { symbol: "BANKBARODA", name: "Bank of Baroda", sector: "Financial Services", industry: "Public Bank", marketCap: "Large" },
  { symbol: "PNB", name: "Punjab National Bank", sector: "Financial Services", industry: "Public Bank", marketCap: "Large" },
  { symbol: "CANBK", name: "Canara Bank", sector: "Financial Services", industry: "Public Bank", marketCap: "Large" },
  { symbol: "UNIONBANK", name: "Union Bank of India", sector: "Financial Services", industry: "Public Bank", marketCap: "Large" },
  { symbol: "IDFCFIRSTB", name: "IDFC First Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "FEDERALBNK", name: "Federal Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "RBLBANK", name: "RBL Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Mid" },
  { symbol: "YESBANK", name: "Yes Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Large" },
  { symbol: "AUBANK", name: "AU Small Finance Bank", sector: "Financial Services", industry: "Small Finance Bank", marketCap: "Large" },
  { symbol: "BANDHANBNK", name: "Bandhan Bank", sector: "Financial Services", industry: "Private Bank", marketCap: "Mid" },
  { symbol: "INDIAMART", name: "IndiaMART InterMESH", sector: "Communication Services", industry: "Online Marketplace", marketCap: "Mid" },
  { symbol: "INFOEDGE", name: "Info Edge India", sector: "Communication Services", industry: "Internet Services", marketCap: "Large" },
  { symbol: "IDEA", name: "Vodafone Idea", sector: "Communication Services", industry: "Telecom", marketCap: "Large" },
  { symbol: "TATACOMM", name: "Tata Communications", sector: "Communication Services", industry: "Telecom", marketCap: "Large" },
  { symbol: "SONACOMS", name: "Sona BLW Precision Forgings", sector: "Consumer Discretionary", industry: "Auto Components", marketCap: "Mid" },
  { symbol: "BHARATFORG", name: "Bharat Forge", sector: "Consumer Discretionary", industry: "Auto Components", marketCap: "Large" },
  { symbol: "MOTHERSON", name: "Samvardhana Motherson International", sector: "Consumer Discretionary", industry: "Auto Components", marketCap: "Large" },
  { symbol: "TVSMOTOR", name: "TVS Motor Company", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "ASHOKLEY", name: "Ashok Leyland", sector: "Consumer Discretionary", industry: "Automobiles", marketCap: "Large" },
  { symbol: "GUJGASLTD", name: "Gujarat Gas", sector: "Utilities", industry: "Gas Distribution", marketCap: "Mid" },
  { symbol: "IGL", name: "Indraprastha Gas", sector: "Utilities", industry: "Gas Distribution", marketCap: "Mid" },
  { symbol: "MGL", name: "Mahanagar Gas", sector: "Utilities", industry: "Gas Distribution", marketCap: "Mid" },
  { symbol: "PETRONET", name: "Petronet LNG", sector: "Energy", industry: "Gas Storage & Transport", marketCap: "Mid" },
  { symbol: "APLAPOLLO", name: "APL Apollo Tubes", sector: "Materials", industry: "Steel Products", marketCap: "Large" },
  { symbol: "JINDALSTEL", name: "Jindal Steel & Power", sector: "Materials", industry: "Steel", marketCap: "Large" },
  { symbol: "SAIL", name: "Steel Authority of India", sector: "Materials", industry: "Steel", marketCap: "Large" },
  { symbol: "VEDL", name: "Vedanta", sector: "Materials", industry: "Diversified Metals", marketCap: "Large" },
];

const BY_SYMBOL = new Map<string, StaticStockMeta>();
const BY_NAME_TOKEN = new Map<string, StaticStockMeta>();

for (const s of STOCKS) {
  BY_SYMBOL.set(s.symbol.toUpperCase(), s);
  const tokens = s.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
  const key = tokens.slice(0, 3).join(" ");
  if (key && !BY_NAME_TOKEN.has(key)) BY_NAME_TOKEN.set(key, s);
  const first = tokens[0];
  if (first && first.length >= 5 && !BY_NAME_TOKEN.has(first)) BY_NAME_TOKEN.set(first, s);
}

const NAME_ALIASES: Array<[RegExp, string]> = [
  [/bharat\s*elec/i, "BEL"],
  [/central\s*dep/i, "CDSL"],
  [/cholamandalam/i, "CHOLAFIN"],
  [/data\s*patterns/i, "DATAPATTNS"],
  [/pi\s*industries/i, "PIIND"],
  [/polycab/i, "POLYCAB"],
  [/syngene/i, "SYNGENE"],
  [/narayana/i, "NH"],
  [/angel\s*one/i, "ANGELONE"],
  [/asian\s*paints/i, "ASIANPAINT"],
  [/blue\s*star/i, "BLUESTARCO"],
  [/hcl\s*tech/i, "HCLTECH"],
  [/icici\s*bank/i, "ICICIBANK"],
  [/indiamart/i, "INDIAMART"],
  [/larsen/i, "LT"],
  [/hindustan\s*unilever/i, "HINDUNILVR"],
  [/hdfc\s*bank/i, "HDFCBANK"],
  [/tata\s*consult/i, "TCS"],
  [/reliance/i, "RELIANCE"],
  [/state\s*bank/i, "SBIN"],
];

export function lookupStock(symbol: string | null | undefined, stockName?: string | null): StaticStockMeta | null {
  if (symbol) {
    const bySymbol = BY_SYMBOL.get(symbol.trim().toUpperCase());
    if (bySymbol) return bySymbol;
  }
  if (stockName) {
    for (const [rx, sym] of NAME_ALIASES) {
      if (rx.test(stockName)) {
        const hit = BY_SYMBOL.get(sym);
        if (hit) return hit;
      }
    }
    const cleaned = stockName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const first = cleaned.split(" ")[0];
    if (first && first.length >= 5) {
      const hit = BY_NAME_TOKEN.get(first);
      if (hit) return hit;
    }
    for (const [key, meta] of BY_NAME_TOKEN.entries()) {
      if (cleaned.includes(key)) return meta;
    }
  }
  return null;
}

export const NSE_STATIC_COUNT = STOCKS.length;
