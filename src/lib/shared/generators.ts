import crypto from "crypto";

export type UsernamePattern =
  | "random_word"
  | "random_chars"
  | "adjective_noun"
  | "indonesian"
  | "chinese"
  | "japanese"
  | "english";

const WORDLIST_EN_LEGACY = [
  "alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel",
  "india","juliet","kilo","lima","mike","november","oscar","papa",
  "apple","banana","cherry","dragon","eagle","falcon","grape","honey",
  "amber","blaze","coral","ember","frost","glow","ivory","jewel",
  "lunar","maple","nova","orbit","pixel","quartz","solar","terra",
  "ultra","vapor","wave","xenon","yield","zenith","azure","bronze",
];

const ADJECTIVES = [
  "happy","brave","calm","eager","fast","gentle","jolly","keen",
  "lively","mighty","noble","proud","quick","rare","swift","vivid",
  "bold","cool","epic","fierce","grand","iron","jazzy","lucky",
  "magic","neon","open","prime","quiet","royal","sharp","tiny",
  "amber","crisp","daring","elite","fresh","golden","hardy","ideal",
  "jade","keen","light","mellow","nimble","olive","plain","quirky",
  "rustic","sleek","tidy","unique","vast","warm","young","zesty",
];

const NOUNS = [
  "wolf","hawk","bear","lion","tiger","eagle","shark","whale",
  "fox","deer","crow","dove","frog","goat","hare","jay","kite",
  "lynx","mole","orca","pike","rook","seal","toad","wren","bison",
  "camel","dingo","finch","gecko","heron","koala","lemur","moose",
  "panda","quail","raven","stoat","tapir","viper","walrus","yak",
  "crane","finch","ibis","lark","newt","otter","plover","robin",
];

const WORDS_INDONESIAN = [
  "bintang","langit","bunga","rimba","lautan","gunung","angin","hujan",
  "cahaya","matahari","bulan","bumi","alam","hutan","sungai","pantai",
  "danau","lembah","padang","sawah","kebun","taman","pohon","daun",
  "akar","batu","pasir","tanah","udara","api","air","awan",
  "pelangi","fajar","senja","malam","pagi","siang","waktu","masa",
  "jalan","jembatan","rumah","pintu","jendela","atap","dinding","lantai",
  "kota","desa","pulau","negeri","bangsa","rakyat","warga","teman",
  "sahabat","kawan","saudara","keluarga","ibu","ayah","anak","adik",
  "kakak","nenek","kakek","paman","bibi","cucu","menantu","mertua",
  "harapan","impian","cita","tujuan","rencana","usaha","kerja","karya",
  "ilmu","pikir","rasa","hati","jiwa","semangat","tekad","niat",
  "berani","jujur","setia","sabar","bijak","cerdas","tangkas","sigap",
  "indah","cantik","bagus","elok","molek","permai","asri","hijau",
  "merah","biru","putih","hitam","kuning","ungu","oranye","coklat",
  "manis","segar","harum","wangi","lembut","halus","kuat","teguh",
  "cepat","gesit","lincah","tangkas","ringan","berat","tinggi","rendah",
  "panjang","pendek","lebar","sempit","besar","kecil","tebal","tipis",
  "muda","tua","baru","lama","awal","akhir","pertama","terakhir",
  "utama","pokok","dasar","inti","puncak","ujung","tepi","tengah",
  "timur","barat","utara","selatan","atas","bawah","depan","belakang",
  "dalam","luar","dekat","jauh","sini","sana","situ","mana",
  "kapan","kenapa","siapa","apa","bagaimana","berapa","dimana","kemana",
  "selalu","sering","kadang","jarang","pernah","belum","sudah","akan",
  "bisa","boleh","harus","perlu","mau","ingin","suka","cinta",
  "tahu","kenal","ingat","lupa","dengar","lihat","rasa","pikir",
  "bicara","cerita","tanya","jawab","minta","beri","ambil","taruh",
  "pergi","datang","pulang","tinggal","duduk","berdiri","jalan","lari",
  "terbang","berenang","bermain","belajar","bekerja","berlatih","mencoba","berhasil",
  "mulai","selesai","berhenti","lanjut","balik","ubah","ganti","tukar",
  "buka","tutup","masuk","keluar","naik","turun","angkat","letakkan",
  "bangun","tidur","makan","minum","masak","cuci","bersih","rapi",
  "senang","gembira","bahagia","suka","ceria","riang","girang","puas",
  "sedih","kecewa","marah","takut","khawatir","bingung","heran","kagum",
  "bangga","malu","rindu","kangen","sayang","kasih","peduli","hormat",
  "damai","tenang","aman","nyaman","sehat","kuat","segar","bugar",
  "pintar","pandai","cerdas","bijak","arif","mahir","ahli","terampil",
  "rajin","tekun","gigih","ulet","sabar","teliti","cermat","hati",
  "baik","buruk","benar","salah","tepat","pas","cocok","sesuai",
  "penting","perlu","berguna","berharga","istimewa","spesial","unik","khas",
  "baru","lama","modern","klasik","tradisi","budaya","seni","karya",
  "musik","lagu","tari","drama","cerita","kisah","dongeng","legenda",
  "sejarah","ilmu","sains","teknologi","inovasi","kreasi","gagasan","ide",
  "rencana","strategi","metode","cara","teknik","sistem","proses","hasil",
  "produk","barang","benda","alat","mesin","kendaraan","kapal","pesawat",
  "rumah","gedung","kantor","sekolah","kampus","pasar","toko","warung",
  "jalan","lorong","gang","simpang","persimpangan","bundaran","jembatan","terowongan",
  "sawah","ladang","kebun","hutan","taman","pantai","laut","danau",
  "sungai","gunung","bukit","lembah","ngarai","gua","goa","tebing",
  "batu","pasir","tanah","lumpur","debu","abu","asap","uap",
  "api","air","udara","angin","hujan","salju","es","embun",
  "matahari","bulan","bintang","planet","galaksi","alam","semesta","langit",
];

const WORDS_CHINESE = [
  "ming","zhu","tian","long","feng","yun","shan","he",
  "hai","hu","lin","yuan","chun","xia","qiu","dong",
  "ri","yue","xing","guang","hua","cao","mu","shi",
  "shui","huo","tu","jin","yin","bai","hei","hong",
  "lv","lan","huang","zi","cheng","fen","zong","hui",
  "da","xiao","gao","di","chang","duan","kuan","zhai",
  "zhong","qing","nong","dan","ying","ruan","ying","gang",
  "kuai","man","zao","wan","xin","jiu","duo","shao",
  "hao","huai","mei","chou","dui","cuo","zhen","jia",
  "an","wei","le","ku","ai","hen","pa","ji",
  "wang","lai","qu","jin","chu","shang","xia","kai",
  "guan","zou","pao","fei","you","wan","chi","he",
  "shuo","wen","kan","ting","xiang","zhi","jue","gan",
  "ai","xi","nu","pa","jing","xi","bei","chou",
  "ren","jia","guo","cheng","cun","zhen","jie","lu",
  "qiao","men","chuang","fang","wu","ting","yuan","lou",
  "tai","jie","shi","chang","gong","yuan","hua","yuan",
  "shan","shui","tian","di","kong","yun","feng","yu",
  "xue","bing","lei","dian","hong","wu","yan","chen",
  "chao","xi","ye","zhou","nian","yue","ri","shi",
  "fen","miao","ke","zao","wan","zhong","qian","hou",
  "zuo","you","shang","xia","li","wai","qian","hou",
  "dong","xi","nan","bei","zhong","yuan","jin","yuan",
  "da","xiao","duo","shao","gao","di","chang","duan",
  "xin","lao","kuai","man","zao","wan","hao","huai",
  "mei","chou","dui","cuo","zhen","jia","an","wei",
  "le","ku","ai","hen","pa","ji","wang","lai",
  "qu","jin","chu","shang","xia","kai","guan","zou",
  "pao","fei","you","wan","chi","he","shuo","wen",
  "kan","ting","xiang","zhi","jue","gan","ai","xi",
  "nu","pa","jing","xi","bei","chou","ren","jia",
  "guo","cheng","cun","zhen","jie","lu","qiao","men",
  "chuang","fang","wu","ting","yuan","lou","tai","jie",
  "shi","chang","gong","yuan","hua","yuan","shan","shui",
  "tian","di","kong","yun","feng","yu","xue","bing",
  "lei","dian","hong","wu","yan","chen","chao","xi",
  "ye","zhou","nian","yue","ri","shi","fen","miao",
  "ke","zao","wan","zhong","qian","hou","zuo","you",
  "dong","xi","nan","bei","zhong","yuan","jin","yuan",
  "bao","bei","cai","dao","en","fa","ge","hai",
  "ji","kai","lai","mao","nai","ou","pai","qi",
  "ran","sao","tai","uai","wan","xian","yan","zai",
  "bai","can","dan","fan","gan","han","jian","kan",
  "lan","man","nan","pan","qian","ran","san","tan",
  "wan","xian","yan","zan","bang","cang","dang","fang",
  "gang","hang","jiang","kang","lang","mang","nang","pang",
  "qiang","rang","sang","tang","wang","xiang","yang","zang",
  "beng","ceng","deng","feng","geng","heng","jing","keng",
  "leng","meng","neng","peng","qing","reng","seng","teng",
  "weng","xing","yeng","zeng","bing","ding","fing","ging",
  "hing","jing","king","ling","ming","ning","ping","qing",
  "ring","sing","ting","wing","xing","ying","zing","bong",
  "cong","dong","fong","gong","hong","jong","kong","long",
  "mong","nong","pong","qong","rong","song","tong","wong",
  "xiong","yong","zong","bun","cun","dun","fun","gun",
  "hun","jun","kun","lun","mun","nun","pun","qun",
  "run","sun","tun","wun","xun","yun","zun","hua",
  "kua","gua","zhua","chua","shua","rua","nua","lua",
  "dua","tua","bia","dia","lia","nia","pia","qia",
  "xia","jia","zha","cha","sha","rha","nha","lha",
  "dha","tha","bha","pha","mha","fha","gha","kha",
];

const WORDS_JAPANESE = [
  "sakura","hikari","kaze","tsuki","hana","yuki","sora","umi",
  "yama","kawa","mori","hoshi","niji","asa","yoru","hi",
  "tori","uo","neko","inu","uma","shika","kuma","usagi",
  "kame","hebi","kaeru","cho","hachi","semi","hotaru","kumo",
  "ame","kiri","nami","shio","ishi","suna","tsuchi","ki",
  "kusa","take","ume","matsu","sugi","kiku","bara","fuji",
  "momo","nashi","kaki","ume","yuzu","mikan","ringo","budo",
  "cha","sake","miso","tofu","soba","udon","ramen","sushi",
  "mochi","dango","wagashi","anko","kinako","matcha","hojicha","sencha",
  "fuyu","natsu","haru","aki","tsuyu","arashi","taifuu","kaminari",
  "niji","murasaki","ao","aka","shiro","kuro","ki","midori",
  "kin","gin","daidai","momoiro","nezumi","chairo","haiiro","kon",
  "ookii","chiisai","nagai","mijikai","hiroi","semai","takai","hikui",
  "omoi","karui","hayai","osoi","atarashii","furui","wakai","toshiyori",
  "utsukushii","kawaii","kakkoii","yasashii","tsuyoi","yowai","kashikoi","baka",
  "tanoshii","kanashii","ureshii","sabishii","kowai","hazukashii","fushigi","subarashii",
  "ichi","ni","san","shi","go","roku","nana","hachi",
  "ku","juu","hyaku","sen","man","oku","choo","kei",
  "hito","futari","minna","dare","nani","doko","itsu","naze",
  "ima","mukashi","mirai","mae","ato","ue","shita","migi",
  "hidari","naka","soto","chikaku","tooku","koko","soko","asoko",
  "watashi","anata","kare","kanojo","karera","wareware","bokutachi","atashitachi",
  "tomodachi","kazoku","chichi","haha","ani","ane","otouto","imouto",
  "sofu","sobo","ojisan","obasan","musuko","musume","mago","shinseki",
  "sensei","seito","gakusei","isha","kangoshi","keikan","shoubousha","heiwa",
  "ai","yume","kibou","inochi","tamashii","kokoro","karada","te",
  "ashi","me","mimi","hana","kuchi","koe","kami","kao",
  "sora","daichi","umi","yama","kawa","mori","shizen","sekai",
  "kuni","machi","mura","shima","hanto","tairiku","umi","taiyou",
  "tsuki","hoshi","ginga","uchu","jikan","rekishi","bunka","geijutsu",
  "ongaku","eiga","hon","manga","anime","gemu","supootsu","ryouri",
  "tabemono","nomimono","yasai","kudamono","niku","sakana","tamago","kome",
  "pan","gyuunyuu","mizu","ocha","koohii","juusu","biiru","wain",
  "ie","heya","niwa","daidokoro","furo","toire","genkan","roka",
  "gakkou","kaisha","byouin","kouen","eki","kuukou","minato","douro",
  "hashi","kawa","ike","umi","yama","mori","nohara","sabaku",
  "kuruma","densha","hikouki","fune","jitensha","baiku","aruku","hashiru",
  "tobu","oyogu","noru","oriru","iku","kuru","kaeru","tomaru",
  "taberu","nomu","neru","okiru","hataraku","asobu","benkyou","yomu",
  "kaku","kiku","miru","hanasu","kangaeru","omou","shiru","wakaru",
  "suki","kirai","hoshii","iru","aru","nai","dekiru","shiranai",
];

const WORDS_ENGLISH = [
  "silver","forest","river","ocean","mountain","valley","meadow","canyon",
  "thunder","lightning","crystal","diamond","emerald","sapphire","amber","coral",
  "falcon","raven","phoenix","dragon","griffin","sphinx","titan","atlas",
  "solar","lunar","stellar","cosmic","nebula","aurora","zenith","horizon",
  "storm","breeze","gale","frost","ember","flame","spark","blaze",
  "shadow","mirror","prism","beacon","lantern","compass","anchor","vessel",
  "bridge","tower","castle","citadel","fortress","haven","harbor","shore",
  "garden","orchard","meadow","prairie","tundra","glacier","cavern","grotto",
  "marble","granite","obsidian","quartz","jasper","onyx","topaz","garnet",
  "copper","bronze","iron","steel","chrome","cobalt","indigo","violet",
  "crimson","scarlet","azure","cerulean","teal","jade","olive","ivory",
  "swift","nimble","agile","fierce","brave","noble","wise","keen",
  "bright","vivid","bold","sharp","clear","pure","calm","serene",
  "ancient","modern","classic","prime","elite","apex","peak","summit",
  "pioneer","ranger","hunter","scout","archer","knight","guardian","sentinel",
  "cipher","vector","matrix","nexus","vertex","apex","zenith","nadir",
  "atlas","cosmos","terra","luna","solar","astral","orbital","stellar",
  "echo","pulse","wave","signal","beacon","flare","spark","surge",
  "drift","glide","soar","dive","surge","rush","flow","stream",
  "grove","thicket","copse","glade","dell","vale","moor","fen",
  "crest","ridge","bluff","cliff","ledge","plateau","mesa","butte",
  "inlet","cove","bay","gulf","strait","channel","delta","estuary",
  "spring","brook","creek","tributary","cascade","torrent","rapid","eddy",
  "dusk","dawn","twilight","midnight","noon","solstice","equinox","zenith",
  "frost","dew","mist","haze","fog","vapor","steam","cloud",
  "petal","bloom","blossom","sprout","seedling","sapling","canopy","foliage",
  "acorn","pinecone","berry","spore","pollen","nectar","resin","sap",
  "cobalt","chrome","nickel","titanium","platinum","palladium","rhodium","iridium",
  "quasar","pulsar","nova","comet","meteor","asteroid","satellite","orbit",
  "cipher","token","rune","glyph","sigil","emblem","crest","seal",
  "haven","refuge","sanctuary","bastion","stronghold","citadel","keep","ward",
  "voyage","journey","quest","expedition","odyssey","venture","foray","sortie",
  "legend","myth","saga","epic","chronicle","annals","lore","fable",
  "craft","forge","anvil","bellows","tongs","chisel","lathe","press",
  "canvas","palette","easel","brush","pigment","glaze","varnish","lacquer",
  "tempo","rhythm","melody","harmony","chord","scale","octave","cadence",
  "verse","stanza","couplet","sonnet","ballad","lyric","ode","elegy",
  "prism","lens","mirror","aperture","focal","spectrum","wavelength","frequency",
  "vector","scalar","tensor","matrix","gradient","divergence","curl","flux",
  "enzyme","protein","peptide","amino","nucleic","genome","chromosome","allele",
  "neuron","synapse","cortex","cerebral","neural","axon","dendrite","myelin",
  "carbon","oxygen","hydrogen","nitrogen","sulfur","phosphorus","calcium","sodium",
  "photon","electron","proton","neutron","quark","boson","fermion","lepton",
  "delta","gamma","sigma","omega","alpha","beta","theta","lambda",
  "north","south","east","west","polar","equatorial","tropical","temperate",
  "urban","rural","coastal","inland","highland","lowland","upland","wetland",
  "market","bazaar","arcade","plaza","forum","agora","piazza","square",
  "manor","estate","villa","chalet","lodge","cabin","cottage","bungalow",
  "spire","dome","arch","vault","column","pillar","buttress","parapet",
  "harbor","marina","wharf","quay","pier","dock","berth","mooring",
  "trail","path","track","route","passage","corridor","arcade","gallery",
  "summit","pinnacle","apex","crest","peak","crown","cap","tip",
  "depth","abyss","chasm","gorge","ravine","gulch","trench","pit",
  "geyser","spring","well","aquifer","reservoir","cistern","basin","pool",
  "thorn","briar","bramble","nettle","thistle","fern","moss","lichen",
  "amber","topaz","citrine","peridot","tourmaline","spinel","zircon","tanzanite",
  "falcon","osprey","kestrel","merlin","hobby","harrier","buzzard","kite",
  "otter","beaver","marten","stoat","weasel","ferret","mink","polecat",
  "bison","aurochs","wisent","yak","gaur","banteng","kouprey","takin",
  "narwhal","beluga","orca","dugong","manatee","walrus","seal","porpoise",
  "condor","albatross","petrel","gannet","booby","frigatebird","tropicbird","skua",
  "python","anaconda","boa","mamba","cobra","viper","adder","racer",
  "gecko","iguana","chameleon","skink","monitor","agama","basilisk","anole",
  "trout","salmon","perch","pike","carp","tench","roach","bream",
  "maple","cedar","spruce","fir","larch","yew","holly","hazel",
  "willow","poplar","aspen","birch","alder","elm","ash","beech",
  "jasmine","lavender","rosemary","thyme","sage","basil","mint","oregano",
  "saffron","turmeric","cardamom","cinnamon","clove","nutmeg","pepper","ginger",
  "cobalt","azure","cerulean","ultramarine","prussian","indigo","navy","midnight",
  "vermillion","carmine","crimson","scarlet","ruby","garnet","maroon","burgundy",
  "chartreuse","lime","emerald","viridian","teal","cyan","turquoise","aquamarine",
  "ochre","sienna","umber","sepia","taupe","khaki","beige","ecru",
];

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

export function generateUsername(pattern: UsernamePattern = "random_word"): string {
  switch (pattern) {
    case "adjective_noun": {
      const adj = pick(ADJECTIVES);
      const noun = pick(NOUNS);
      const r = Math.random();
      if (r < 0.30) return `${adj}_${noun}`;
      if (r < 0.50) return `${adj}${noun}`;
      if (r < 0.62) return `${adj}${noun}${rand2()}`;
      if (r < 0.72) return `${adj}${noun}${rand3()}`;
      if (r < 0.80) return `${leetPartial(adj)}${noun}`;
      if (r < 0.87) return `${adj}_${noun}${rand2()}`;
      if (r < 0.93) return `${adj}${rand2()}${noun}`;
      return `${truncate(adj)}${noun}${rand3()}`;
    }
    case "random_chars": {
      const chars = "abcdefghjkmnpqrstuvwxyz23456789";
      const len = 7 + Math.floor(Math.random() * 4);
      const base = Array.from({ length: len }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      if (Math.random() < 0.3) {
        const pos = Math.floor(Math.random() * (base.length - 1)) + 1;
        return base.slice(0, pos) + "_" + base.slice(pos);
      }
      return base;
    }
    case "indonesian":
      return variedFormat(pick(WORDS_INDONESIAN), WORDS_INDONESIAN);
    case "chinese":
      return variedFormat(pick(WORDS_CHINESE), WORDS_CHINESE);
    case "japanese":
      return variedFormat(pick(WORDS_JAPANESE), WORDS_JAPANESE);
    case "english":
      return variedFormat(pick(WORDS_ENGLISH), WORDS_ENGLISH);
    default: {
      const word = pick(WORDLIST_EN_LEGACY);
      return variedFormat(word);
    }
  }
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
