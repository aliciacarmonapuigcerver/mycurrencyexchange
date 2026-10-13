/* =====================================================================
   PAÍSES Y SUS MONEDAS
   ---------------------------------------------------------------------
   Formato: "CÓDIGO_PAÍS:MONEDA"  (códigos ISO oficiales).
   Si un país usa varias monedas, se separan con "|" (la primera es la
   principal). Los nombres de países y monedas en español e inglés los
   pone el navegador automáticamente, así que no hace falta traducirlos.
   ===================================================================== */
window.MCE_COUNTRIES = (
  "AD:EUR,AE:AED,AF:AFN,AG:XCD,AI:XCD,AL:ALL,AM:AMD,AO:AOA,AR:ARS,AS:USD," +
  "AT:EUR,AU:AUD,AW:AWG,AX:EUR,AZ:AZN,BA:BAM,BB:BBD,BD:BDT,BE:EUR,BF:XOF," +
  "BG:EUR,BH:BHD,BI:BIF,BJ:XOF,BL:EUR,BM:BMD,BN:BND,BO:BOB,BQ:USD,BR:BRL," +
  "BS:BSD,BT:BTN|INR,BW:BWP,BY:BYN,BZ:BZD,CA:CAD,CC:AUD,CD:CDF,CF:XAF," +
  "CG:XAF,CH:CHF,CI:XOF,CK:NZD,CL:CLP,CM:XAF,CN:CNY,CO:COP,CR:CRC,CU:CUP," +
  "CV:CVE,CW:XCG,CX:AUD,CY:EUR,CZ:CZK,DE:EUR,DJ:DJF,DK:DKK,DM:XCD,DO:DOP," +
  "DZ:DZD,EC:USD,EE:EUR,EG:EGP,EH:MAD,ER:ERN,ES:EUR,ET:ETB,FI:EUR,FJ:FJD," +
  "FK:FKP,FM:USD,FO:DKK,FR:EUR,GA:XAF,GB:GBP,GD:XCD,GE:GEL,GF:EUR,GG:GBP," +
  "GH:GHS,GI:GIP,GL:DKK,GM:GMD,GN:GNF,GP:EUR,GQ:XAF,GR:EUR,GS:GBP,GT:GTQ," +
  "GU:USD,GW:XOF,GY:GYD,HK:HKD,HN:HNL,HR:EUR,HT:HTG,HU:HUF,ID:IDR,IE:EUR," +
  "IL:ILS,IM:GBP,IN:INR,IO:USD,IQ:IQD,IR:IRR,IS:ISK,IT:EUR,JE:GBP,JM:JMD," +
  "JO:JOD,JP:JPY,KE:KES,KG:KGS,KH:KHR,KI:AUD,KM:KMF,KN:XCD,KR:KRW,KW:KWD," +
  "KY:KYD,KZ:KZT,LA:LAK,LB:LBP,LC:XCD,LI:CHF,LK:LKR,LR:LRD,LS:LSL|ZAR,LT:EUR," +
  "LU:EUR,LV:EUR,LY:LYD,MA:MAD,MC:EUR,MD:MDL,ME:EUR,MF:EUR,MG:MGA,MH:USD," +
  "MK:MKD,ML:XOF,MM:MMK,MN:MNT,MO:MOP,MP:USD,MQ:EUR,MR:MRU,MS:XCD,MT:EUR," +
  "MU:MUR,MV:MVR,MW:MWK,MX:MXN,MY:MYR,MZ:MZN,NA:NAD|ZAR,NC:XPF,NE:XOF,NF:AUD," +
  "NG:NGN,NI:NIO,NL:EUR,NO:NOK,NP:NPR,NR:AUD,NU:NZD,NZ:NZD,OM:OMR,PA:PAB|USD," +
  "PE:PEN,PF:XPF,PG:PGK,PH:PHP,PK:PKR,PL:PLN,PM:EUR,PN:NZD,PR:USD,PS:ILS|JOD," +
  "PT:EUR,PW:USD,PY:PYG,QA:QAR,RE:EUR,RO:RON,RS:RSD,RU:RUB,RW:RWF,SA:SAR," +
  "SB:SBD,SC:SCR,SD:SDG,SE:SEK,SG:SGD,SH:SHP,SI:EUR,SJ:NOK,SK:EUR,SL:SLE," +
  "SM:EUR,SN:XOF,SO:SOS,SR:SRD,SS:SSP,ST:STN,SV:USD,SX:XCG,SY:SYP,SZ:SZL|ZAR," +
  "TC:USD,TD:XAF,TF:EUR,TG:XOF,TH:THB,TJ:TJS,TL:USD,TM:TMT,TN:TND,TO:TOP," +
  "TR:TRY,TT:TTD,TV:AUD,TW:TWD,TZ:TZS,UA:UAH,UG:UGX,US:USD,UY:UYU,UZ:UZS," +
  "VA:EUR,VC:XCD,VE:VES,VG:USD,VI:USD,VN:VND,VU:VUV,WF:XPF,WS:WST,XK:EUR," +
  "YE:YER,YT:EUR,ZA:ZAR,ZM:ZMW,ZW:ZWG|USD"
).split(",").map(function (pair) {
  var p = pair.split(":");
  return { code: p[0], currencies: p[1].split("|") };
});

/* Bandera que se muestra junto a cada moneda cuando se elige la moneda
   (no un país). null = moneda compartida por varios países (icono 🌍). */
window.MCE_CURRENCY_FLAG = {
  USD: "US", EUR: "EU", AUD: "AU", NOK: "NO", NZD: "NZ", MAD: "MA",
  XCD: null, XOF: null, XAF: null, XPF: null
};

/* Países que aparecen arriba antes de escribir nada. */
window.MCE_POPULAR = ["ES", "US", "GB", "MX", "CZ", "CH", "JP", "AR", "CO", "CN", "CA", "AU"];

/* Monedas más usadas: aparecen primero cuando varias coinciden
   (por ejemplo, al buscar "dólar" sale antes el estadounidense). */
window.MCE_POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "MXN", "CNY", "CZK", "ARS", "COP", "CLP", "PEN", "BRL"];

/* Otros nombres con los que la gente busca un país (en minúsculas,
   sin tildes). Añade los que quieras. */
window.MCE_ALIASES = {
  es: {
    US: "eeuu usa ee uu estados unidos de america america norteamerica",
    GB: "reino unido inglaterra uk gran bretana escocia gales irlanda del norte londres",
    CZ: "republica checa chequia praga",
    NL: "holanda paises bajos",
    AE: "emiratos dubai abu dabi",
    KR: "corea del sur corea",
    KP: "corea del norte",
    RU: "rusia",
    CN: "china pekin",
    CH: "suiza",
    DE: "alemania",
    MX: "mexico",
    DO: "republica dominicana",
    VA: "vaticano",
    BA: "bosnia",
    MK: "macedonia",
    CI: "costa de marfil",
    CD: "congo kinshasa",
    CG: "congo brazzaville",
    MM: "birmania myanmar",
    SZ: "suazilandia esuatini",
    TR: "turquia",
    TW: "taiwan",
    HK: "hong kong",
    CW: "curazao",
    EU: "europa zona euro union europea"
  },
  en: {
    US: "usa us america united states of america",
    GB: "uk england britain great britain scotland wales northern ireland london",
    CZ: "czech republic czechia prague",
    NL: "holland netherlands",
    AE: "uae emirates dubai abu dhabi",
    KR: "south korea korea",
    CI: "ivory coast",
    CD: "congo kinshasa drc",
    CG: "congo brazzaville",
    MM: "burma myanmar",
    SZ: "swaziland eswatini",
    TR: "turkey turkiye",
    VA: "vatican",
    EU: "europe eurozone european union"
  }
};
