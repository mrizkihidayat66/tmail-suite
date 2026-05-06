import crypto from "crypto";

export type UsernamePattern = "random" | "en" | "id" | "zh" | "ja";

type CountryWordlist = {
  names: string[];
  words: string[];
};

const WORDLISTS: Record<string, CountryWordlist> = {
  en: {
    names: [
      "nova","ember","frost","blaze","coral","azure","amber","ivory",
      "falcon","raven","phoenix","titan","atlas","aurora","zenith","horizon",
      "crystal","diamond","emerald","sapphire","onyx","jasper","garnet","topaz",
      "storm","breeze","spark","flare","beacon","prism","cipher","vector",
      "shadow","echo","pulse","surge","drift","glide","soar","crest",
      "haven","forge","ranger","hunter","scout","guardian","sentinel","pioneer",
    ],
    words: [
      "silver","forest","river","ocean","mountain","valley","meadow","canyon",
      "thunder","lightning","marble","granite","obsidian","quartz","cobalt","chrome",
      "solar","lunar","stellar","cosmic","nebula","orbital","astral","polar",
      "swift","nimble","agile","fierce","brave","noble","wise","keen",
      "bright","vivid","bold","sharp","clear","pure","calm","serene",
      "ancient","modern","classic","prime","elite","apex","peak","summit",
      "maple","cedar","spruce","willow","birch","aspen","grove","thicket",
      "inlet","cove","gulf","delta","spring","brook","cascade","torrent",
      "dusk","dawn","twilight","midnight","solstice","equinox","frost","mist",
      "petal","bloom","blossom","sprout","canopy","foliage","acorn","berry",
    ],
  },
  id: {
    names: [
      "bintang","langit","fajar","senja","rimba","lautan","gunung","angin",
      "cahaya","matahari","bulan","pelangi","alam","hutan","pantai","danau",
      "lembah","padang","taman","pohon","batu","pasir","api","awan",
      "harapan","impian","cita","semangat","tekad","niat","jiwa","hati",
      "berani","jujur","setia","sabar","bijak","cerdas","tangkas","sigap",
      "indah","cantik","elok","permai","asri","hijau","segar","harum",
    ],
    words: [
      "bunga","sungai","sawah","kebun","desa","pulau","negeri","bangsa",
      "rakyat","warga","teman","sahabat","kawan","saudara","keluarga","cucu",
      "ilmu","pikir","rasa","karya","usaha","kerja","rencana","tujuan",
      "manis","lembut","halus","kuat","teguh","cepat","gesit","lincah",
      "ringan","tinggi","panjang","lebar","besar","muda","baru","utama",
      "timur","barat","utara","selatan","dalam","dekat","selalu","sering",
      "musik","lagu","tari","cerita","kisah","sejarah","budaya","seni",
      "teknologi","inovasi","kreasi","gagasan","strategi","sistem","proses","hasil",
    ],
  },
  zh: {
    names: [
      "ming","zhu","long","feng","yun","shan","tian","hai",
      "lin","yuan","chun","xia","qiu","dong","ri","yue",
      "xing","guang","hua","cao","mu","shi","shui","huo",
      "jin","bai","hong","lv","lan","huang","zi","cheng",
      "da","gao","chang","zhong","qing","ying","gang","kuai",
      "hao","mei","an","le","ai","wang","lai","qu",
    ],
    words: [
      "tu","yin","fen","zong","hui","xiao","di","duan",
      "kuan","zhai","nong","dan","ruan","man","zao","wan",
      "xin","jiu","duo","shao","huai","chou","dui","cuo",
      "zhen","jia","wei","ku","hen","pa","ji","jin",
      "chu","shang","xia","kai","guan","zou","pao","fei",
      "you","wan","chi","he","shuo","wen","kan","ting",
      "xiang","zhi","jue","gan","xi","nu","jing","bei",
      "ren","guo","cheng","cun","jie","lu","qiao","men",
    ],
  },
  ja: {
    names: [
      "sakura","hikari","kaze","tsuki","hana","yuki","sora","umi",
      "yama","kawa","mori","hoshi","niji","asa","yoru","hi",
      "fuji","matsu","ume","kiku","bara","momo","yuzu","cha",
      "kin","gin","ao","aka","shiro","kuro","midori","murasaki",
      "ai","yume","kibou","inochi","tamashii","kokoro","karada","koe",
      "haru","natsu","fuyu","aki","tsubaki","kumo","nami","shio",
    ],
    words: [
      "tori","uo","neko","inu","uma","shika","kuma","usagi",
      "kame","hebi","kaeru","cho","hachi","semi","hotaru","kumo",
      "ame","kiri","nami","shio","ishi","suna","tsuchi","ki",
      "kusa","take","sake","miso","tofu","soba","udon","mochi",
      "ookii","chiisai","nagai","hiroi","takai","omoi","karui","hayai",
      "atarashii","furui","wakai","utsukushii","kawaii","yasashii","tsuyoi","kashikoi",
      "tanoshii","kanashii","ureshii","sabishii","kowai","fushigi","subarashii","hito",
      "tomodachi","kazoku","chichi","haha","ani","ane","sensei","seito",
    ],
  },
};

const COUNTRY_CODES = Object.keys(WORDLISTS) as Array<keyof typeof WORDLISTS>;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand4(): number {
  return Math.floor(Math.random() * 9000) + 1000;
}

function rand2(): number {
  return Math.floor(Math.random() * 90) + 10;
}

function rand3(): number {
  return Math.floor(Math.random() * 900) + 100;
}

function rand1(): number {
  return Math.floor(Math.random() * 9) + 1;
}

const LEET_MAP: Record<string, string> = {
  a: "4", e: "3", i: "1", o: "0", t: "7", s: "5", g: "9", b: "8",
};

function leetPartial(word: string): string {
  return word
    .split("")
    .map((c) => (LEET_MAP[c] && Math.random() < 0.6 ? LEET_MAP[c] : c))
    .join("");
}

function truncate(word: string, minLen = 4): string {
  if (word.length <= minLen) return word;
  const cut = minLen + Math.floor(Math.random() * (word.length - minLen));
  return word.slice(0, cut);
}

const YEARS = ["99","00","01","02","03","04","05","06","07","08","09","10",
  "11","12","13","14","15","16","17","18","19","20","21","22","23","24","25"];

function variedFormat(word: string, extraWords?: string[]): string {
  const r = Math.random();
  const w2 = extraWords ? pick(extraWords) : null;

  if (r < 0.18) return `${word}${rand4()}`;
  if (r < 0.30) return `${word}${rand3()}`;
  if (r < 0.38) return `${word}${rand2()}`;
  if (r < 0.44) return `${word}_${rand3()}`;
  if (r < 0.50) return `${word}_${rand4()}`;
  if (r < 0.55) return `${word}${pick(YEARS)}`;
  if (r < 0.59) return `${rand2()}${word}`;
  if (r < 0.63) return `${rand3()}${word}`;
  if (r < 0.67) return `${leetPartial(word)}${rand3()}`;
  if (r < 0.71) return `${leetPartial(word)}${rand4()}`;
  if (r < 0.74) return `${word}${rand1()}${rand1()}${rand1()}`;
  if (r < 0.77) return `${truncate(word)}${rand4()}`;
  if (r < 0.80) return `${truncate(word)}${rand3()}`;
  if (r < 0.83) return w2 ? `${word}${w2}` : `${word}${rand4()}`;
  if (r < 0.86) return w2 ? `${word}_${w2}` : `${word}_${rand3()}`;
  if (r < 0.89) return w2 ? `${word}${w2}${rand2()}` : `${word}${rand2()}`;
  if (r < 0.92) return `x${word}${rand3()}`;
  if (r < 0.94) return `${word}x${rand2()}`;
  if (r < 0.96) return `${word}${rand2()}x`;
  if (r < 0.98) return `${leetPartial(word)}_${rand2()}`;
  return `${word}${rand4()}`;
}

function generateForCountry(code: string): string {
  const wl = WORDLISTS[code];
  const mode = Math.random();
  if (mode < 0.35) {
    return variedFormat(pick(wl.names));
  } else if (mode < 0.65) {
    return variedFormat(pick(wl.words));
  } else {
    return variedFormat(pick(wl.names), wl.words);
  }
}

export function generateUsername(pattern: UsernamePattern = "random"): string {
  if (pattern === "random") {
    return generateForCountry(pick(COUNTRY_CODES));
  }
  return generateForCountry(pattern);
}

export interface PasswordOptions {
  length?: number;
  includeSymbols?: boolean;
  includeNumbers?: boolean;
  includeUppercase?: boolean;
}

export function generatePassword(opts: PasswordOptions = {}): string {
  const {
    length = 16,
    includeSymbols = true,
    includeNumbers = true,
    includeUppercase = true,
  } = opts;

  let charset = "abcdefghjkmnpqrstuvwxyz";
  if (includeUppercase) charset += "ABCDEFGHJKMNPQRSTUVWXYZ";
  if (includeNumbers) charset += "23456789";
  if (includeSymbols) charset += "!@#$%^&*-_=+?";

  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

export function hashApiKey(rawKey: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(rawKey)
    .digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  const raw = `tm_${token}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix };
}

export function encryptApiKey(rawKey: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(rawKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptApiKey(encryptedData: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest();
  const buf = Buffer.from(encryptedData, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
