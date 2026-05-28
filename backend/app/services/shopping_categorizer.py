"""Auto-categorize shopping items based on common Hungarian food/household terms.

Dictionary-based classifier — no ML, no external dependencies.
Order matters: the first matching category wins (so put more specific
categories before generic ones like 'Tartós').
"""

CATEGORIES: dict[str, list[str]] = {
    "Tejtermék": [
        "tej", "joghurt", "sajt", "vaj", "túró", "tejföl", "tejszín", "kefir",
        "krémsajt", "mozzarella", "feta", "parmezán", "edami", "trappista",
        "márvány", "camembert", "brie", "író", "kókusztej", "zabtej",
        "mandulatej", "rizstej", "szójatej",
    ],
    "Pékáru": [
        "kenyér", "kifli", "zsemle", "péksüti", "croissant", "bagett", "kalács",
        "pogácsa", "lángos", "lepény", "tortilla", "pita", "bagel", "pirított",
        "zsemlemorzsa", "panírmorzsa",
    ],
    "Zöldség": [
        "paradicsom", "paprika", "uborka", "hagyma", "krumpli", "burgonya",
        "saláta", "répa", "cukkini", "padlizsán", "brokkoli", "karfiol",
        "káposzta", "spenót", "rukkola", "retek", "fokhagyma", "gomba",
        "csiperke", "vargánya", "cékla", "póréhagyma", "zeller", "petrezselyem",
        "kapor", "kapormag", "tök", "spárga", "kelkáposzta", "kelbimbó",
        "édesburgonya", "batáta", "csicseriborsó", "kukorica", "lencse",
    ],
    "Gyümölcs": [
        "alma", "banán", "narancs", "citrom", "eper", "körte", "szőlő",
        "barack", "őszibarack", "sárgabarack", "meggy", "cseresznye", "szilva",
        "málna", "áfonya", "ananász", "mangó", "kivi", "görögdinnye", "dinnye",
        "sárgadinnye", "avokádó", "lime", "grapefruit", "datolya", "kókusz",
        "gránátalma",
    ],
    "Hús & Hal": [
        "csirke", "csirkemell", "csirkecomb", "marha", "marhahús", "sertés",
        "sertéshús", "darált", "hal", "lazac", "tonhal", "kolbász", "virsli",
        "szalámi", "sonka", "bacon", "szalonna", "kacsa", "pulyka", "borjú",
        "bárány", "máj", "tarja", "karaj", "comb", "csülök",
    ],
    "Hűtött & Tojás": [
        "tojás", "felvágott", "hummusz", "tofu", "tempeh", "tzatziki",
    ],
    "Mirelit": [
        "fagyasztott", "mirelit", "jégkrém", "fagyi",
    ],
    "Italok": [
        "víz", "ásványvíz", "üdítő", "kóla", "fanta", "sprite", "tonik",
        "sör", "bor", "pezsgő", "pálinka", "vodka", "whiskey", "rum",
        "kávé", "tea", "gyümölcslé", "limonádé", "energiaital",
        "kakaó", "sziruptej",
    ],
    "Édesség & Snack": [
        "csokoládé", "csoki", "cukor", "süti", "keksz", "nasi", "chips",
        "ropi", "perec", "csemege", "gumicukor", "rágó", "rágógumi",
        "müzli szelet", "fagyi", "mentolos", "mézeskalács", "marcipán",
        "nutella", "mogyoróvaj",
    ],
    "Tartós": [
        "liszt", "rizs", "tészta", "spagetti", "penne", "makaróni", "olaj",
        "ecet", "konzerv", "bab", "babkonzerv", "kukoricakonzerv", "olíva",
        "olívabogyó", "mustár", "ketchup", "majonéz", "szósz", "só", "bors",
        "fűszer", "paprika por", "fahéj", "vanília", "élesztő", "sütőpor",
        "kakaópor", "méz", "lekvár", "dzsem", "müzli", "zabpehely", "korpa",
        "magvak", "dió", "mogyoró", "mandula", "kesudió", "napraforgómag",
        "tökmag", "csokoládédarabok",
    ],
    "Háztartás": [
        "mosogatószer", "mosogatótabletta", "mosószer", "mosókapszula",
        "öblítő", "wc papír", "papírtörlő", "szivacs", "szemeteszsák",
        "alufólia", "folpack", "sütőpapír", "gyufa", "gyertya", "izzó",
        "elem", "akkumulátor", "fertőtlenítő", "tisztító", "súroló",
        "ablaktisztító", "padlótisztító",
    ],
    "Drogéria": [
        "sampon", "fogkrém", "fogkefe", "szappan", "tusfürdő", "dezodor",
        "izzadásgátló", "kondicionáló", "borotva", "borotvahab", "krém",
        "arckrém", "kézkrém", "testápoló", "fényvédő", "naptej", "vatta",
        "vattakorong", "fültisztító", "tampon", "betét", "intim",
        "öblítőszer szájba", "szájvíz",
    ],
}


def categorize(name: str) -> str | None:
    """Return the best-matching category for a given item name, or None."""
    n = name.lower().strip()
    if not n:
        return None
    for cat, words in CATEGORIES.items():
        for w in words:
            if w in n:
                return cat
    return None
