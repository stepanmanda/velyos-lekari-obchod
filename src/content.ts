import type { Specialty } from "./types";

export const specialtyCopy: Record<Specialty, {
  hook: string;
  value: string;
  questions: string[];
  medvisionQuestions: string[];
  medvision: string;
}> = {
  Praktik: {
    hook: "Pomáháme ordinacím zpřehlednit jejich digitální prezentaci, aby pacient rychle našel ordinační dobu, aktuální informace a správný způsob kontaktu — a nemusel kvůli všemu volat sestře.",
    value: "Nový web sjednotí informace pro pacienty, zlepší důvěryhodnost ordinace a může převzít část opakovaných dotazů. Součástí je vlastní vizuální identita a brandbook, texty, grafika, mobilní verze, formulář, základní SEO a napojení na Google.",
    questions: [
      "Jak jste spokojený se současným webem a jeho aktualizací?",
      "Kvůli kterým informacím pacienti nejčastěji volají?",
      "Mohou dnes pacienti jednoduše požádat o termín nebo vám poslat požadavek?",
      "Kdyby nový web vyřešil jednu věc opravdu dobře, co by to mělo být?",
    ],
    medvisionQuestions: [
      "Které telefonáty a administrativní požadavky dnes nejvíc zatěžují sestru?",
      "Jak dnes přijímáte žádosti o recept, objednání nebo potvrzení?",
      "Používáte jeden systém, nebo se požadavky sbíhají z telefonu, e-mailu a formulářů?",
      "Kde dnes nejčastěji vzniká zdržení nebo nutnost něco přepisovat?",
    ],
    medvision: "U praktiků navíc připravujeme MEDVISION — lokálního digitálního asistenta ordinace pro objednávání, příjem požadavků, připomínky a přehled dne. Citlivé zpracování běží přímo v ordinaci a člověk má vždy poslední slovo.",
  },
  Pediatrie: {
    hook: "Pomáháme dětským ordinacím zpřehlednit informace pro rodiče, aby rychle našli ordinační dobu, postup při akutních potížích, očkování i správný způsob kontaktu bez zbytečného telefonování.",
    value: "Nový web sjednotí praktické informace pro rodiče, aktuality a bezpečné kontaktní cesty. Součástí je vlastní vizuální identita a brandbook, texty, grafika, mobilní verze, formulář, základní SEO a napojení na Google.",
    questions: [
      "Kvůli kterým informacím rodiče nejčastěji volají?",
      "Najdou dnes snadno postup pro akutní potíže, očkování a objednání?",
      "Umíte na web rychle přidat dovolenou nebo změnu ordinační doby?",
      "Kdyby nový web ubral jednu opakovanou agendu, která by to byla?",
    ],
    medvisionQuestions: [
      "Které požadavky rodičů nejčastěji přicházejí telefonicky?",
      "Jak dnes třídíte objednání, recepty, potvrzení a akutní dotazy?",
      "Kolik komunikačních kanálů musí sestra během dne sledovat?",
      "Kterou opakovanou administrativu by dávalo největší smysl zjednodušit?",
    ],
    medvision: "U dětských praktiků ověřujeme MEDVISION jako navazující variantu pro objednávání, příjem administrativních požadavků a přehled komunikace. Nejdřív potřebujeme pochopit konkrétní workflow ordinace a rodičů.",
  },
  Gynekologie: {
    hook: "Pomáháme gynekologickým ordinacím vytvořit moderní a důvěryhodnou digitální prezentaci, kde pacientky rychle pochopí služby, způsob objednání i praktické informace bez zbytečného telefonování.",
    value: "Web postavíme s důrazem na důvěru, soukromí a snadnou orientaci. Součástí je vlastní vizuální identita a brandbook, texty, grafika, mobilní verze, formulář, základní SEO a napojení na Google.",
    questions: [
      "Odpovídá současný web tomu, jak chcete, aby ordinace působila?",
      "Najdou pacientky snadno informace o objednání, prevenci a přijímání nových pacientek?",
      "Které opakované dotazy dnes nejvíc zatěžují telefon?",
      "Je pro vás důležitější modernější prezentace, nebo snížení administrativy?",
    ],
    medvisionQuestions: [
      "Jak dnes rozlišujete objednání, administrativní požadavky a akutní dotazy pacientek?",
      "Které typy telefonátů se během dne nejčastěji opakují?",
      "Kde by automatizace musela respektovat specifické workflow vaší ordinace?",
      "Co musí vždy zůstat pod přímou kontrolou sestry nebo lékaře?",
    ],
    medvision: "Vedle webů vyvíjíme MEDVISION. Pro specialisty připravujeme možnost přizpůsobit objednávání, požadavky a připomínky jejich konkrétnímu provozu. Dnes nabízíme přední místo mezi zájemci o pilot, ne hotové nasazení pro gynekologii.",
  },
  Stomatologie: {
    hook: "Pomáháme stomatologickým ordinacím postavit web, který působí profesionálně, jasně představí péči a pacientovi rovnou ukáže, jak se objednat nebo co dělat při akutním problému.",
    value: "Web sjednotí služby, tým, kontakty, přijímání nových pacientů a objednávání. Součástí je vlastní vizuální identita a brandbook, texty, grafika, mobilní verze, formulář, základní SEO a napojení na Google.",
    questions: [
      "Přivádí vám současný web správný typ pacientů, nebo jen existuje?",
      "Najde pacient snadno, zda přijímáte nové pacienty a jak se objednat?",
      "Kolik času zabírají opakované telefonáty o termíny a praktické informace?",
      "Které služby byste chtěli na webu prezentovat lépe?",
    ],
    medvisionQuestions: [
      "Jak dnes řešíte nové objednávky, změny termínů a připomínky?",
      "Které telefonáty se recepci nejčastěji opakují?",
      "Používáte pro komunikaci s pacienty jeden systém, nebo více kanálů?",
      "Kde by digitální asistent musel respektovat specifika stomatologického provozu?",
    ],
    medvision: "Vedle webů vyvíjíme MEDVISION. Pro stomatologii může časem pomoci s objednáváním, připomínkami a tříděním administrativních požadavků. Dnes nabízíme přední místo mezi zájemci o pilot, ne hotový stomatologický systém.",
  },
  ORL: {
    hook: "Pomáháme ORL ordinacím vytvořit přehlednou a důvěryhodnou digitální prezentaci, kde pacient rychle najde služby, způsob objednání, postup při akutních potížích i správný kontakt bez zbytečného telefonování.",
    value: "Web jasně představí vyšetření, audiologii, péči o děti i dospělé, objednání a aktuální provozní informace. Součástí je vlastní vizuální identita a brandbook, texty, grafika, mobilní verze, formulář, základní SEO a napojení na Google.",
    questions: [
      "Odpovídá současný web tomu, jak chcete, aby ORL ordinace působila?",
      "Najde pacient snadno, jak se objednat a co dělat při akutním problému?",
      "Které dotazy na vyšetření, termíny nebo audiologii se po telefonu nejčastěji opakují?",
      "Je pro vás důležitější modernější prezentace, nebo snížení administrativy?",
    ],
    medvisionQuestions: [
      "Jak dnes rozlišujete objednání, administrativní požadavky a akutní potíže?",
      "Které telefonáty se během dne nejčastěji opakují?",
      "Přicházejí požadavky jedním kanálem, nebo se sbíhají z telefonu, e-mailu a formulářů?",
      "Co musí při případném zjednodušení vždy zůstat pod přímou kontrolou sestry nebo lékaře?",
    ],
    medvision: "Vedle webů vyvíjíme MEDVISION. Pro ORL nejdřív ověřujeme, zda může bezpečně pomoci s objednáváním a tříděním administrativních požadavků podle konkrétního provozu ordinace. Dnes nabízíme validační rozhovor a možnost pilotu, ne hotové oborové řešení.",
  },
};

export const objections = [
  {
    title: "Web už máme.",
    answer: "Rozumím. Nejde mi o nový web za každou cenu. Můžu se jen zeptat: odpovídá dnešní web tomu, jak ordinace skutečně funguje, a umíte si ho snadno aktualizovat? Pokud ano, nebudu vás přesvědčovat.",
  },
  {
    title: "Nemáme čas.",
    answer: "Právě proto většinu přípravy bereme na sebe — návrh, texty, grafiku i technické provedení. První schůzka má jen zjistit, jestli to dává smysl; stačí 20 minut online nebo osobně.",
  },
  {
    title: "Je to drahé.",
    answer: "Kompletní web včetně vlastní identity a brandbooku držíme do 50 tisíc korun. Doména a hosting jsou zvlášť. Než cokoli nabídneme, na schůzce si potvrdíme rozsah, aby cena odpovídala tomu, co skutečně potřebujete.",
  },
  {
    title: "Pošlete informace e-mailem.",
    answer: "Určitě. Abych neposlal obecnou prezentaci: co je pro vás důležitější — vzhled a důvěryhodnost, nebo praktičtější komunikace s pacienty? Podle toho pošlu krátké a relevantní informace a navrhnu termín.",
  },
  {
    title: "Pacienty máme, web nepotřebujeme.",
    answer: "Chápu. Web nemusí sloužit jen k získávání pacientů. Často hlavně snižuje zmatek a opakované dotazy — aktuální ordinační doba, dovolená, služby, způsob objednání. Jestli ani to není problém, respektuji to.",
  },
  {
    title: "AI ve zdravotnictví nechceme.",
    answer: "Rozumím a web na AI nijak závislý není. MEDVISION zmiňuji jen jako budoucí možnost. Nemá rozhodovat o léčbě; administrativu připraví a lékař nebo sestra ji vždy kontroluje.",
  },
  {
    title: "Už používáme Medevio / jiný systém.",
    answer: "To není překážka. Web můžeme napojit na způsob objednávání, který už používáte. MEDVISION je samostatný připravovaný projekt a v této chvíli po vás nechci měnit ambulantní systém.",
  },
  {
    title: "Nemáme zájem.",
    answer: "Rozumím, děkuji za jasnou odpověď. Poznamenám si, že vás nemáme dál kontaktovat. Přeji klidný den.",
  },
];

export const forbiddenClaims = [
  "Neříkej, že MEDVISION je hotový nebo připravený k běžnému prodeji.",
  "Neslibuj konkrétní úsporu času, počet pacientů ani návratnost bez ověření.",
  "Neříkej, že AI diagnostikuje, doporučuje léčbu nebo sama vyhodnocuje naléhavost.",
  "Neslibuj finální cenu bez potvrzení rozsahu; bezpečná formulace je „kompletní web do 50 000 Kč, hosting a doména zvlášť“.",
  "U gynekologů, zubařů a ORL nepředstavuj MEDVISION jako hotové oborové řešení.",
  "Nevymýšlej reference. M3 MEDIC lze jmenovat pouze jako první implementaci/pilot od 10. 8. 2026.",
];
