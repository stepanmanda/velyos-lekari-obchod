# VELYOS · Obchod lékaři

Interní volací kokpit pro nabídku digitální identity ordinacím a navazujícího pilotu MEDVISION.

## Co aplikace umí

- 532 auditovaných míst péče: praktici, pediatři, gynekologové, stomatologové, ortodontisté, ORL, dermatologové, oční lékaři, kardiologové a ortopedi z NRPZS,
- digitální skóre, obchodní priorita a doporučená nabídka z veřejného auditu,
- město, adresa a veřejně dohledané ordinační hodiny s odkazem na zdroj,
- scénář hovoru upravený podle oboru,
- individuální strategie `Pouze web`, `Pouze MEDVISION` nebo `Web + MEDVISION` s editovatelnými texty pro každou ordinaci,
- evidence výsledku, poznámek, follow-upů a schůzek,
- lokální ukládání dat v prohlížeči,
- export do CSV a záloha/obnova přes JSON,
- školení, námitky, následný e-mail a hranice obchodních tvrzení.

## Důležité omezení dat

GitHub Pages nemá databázi. Historie hovorů a poznámky proto zůstávají v `localStorage` konkrétního prohlížeče. Při aktualizaci centrálního seznamu se čerstvá data automaticky sloučí s lokální historií podle stabilního ID místa NRPZS; stejné místo se proto nevytvoří podruhé. Pravidelně používejte tlačítko **Záloha**. Pro přenos na jiné zařízení použijte **Obnovit**.

## Lokální spuštění

```bash
npm install
python3 scripts/enrich-opening-hours.py
npm run prepare:leads
npm run dev
```

## Publikování

Workflow `.github/workflows/deploy-pages.yml` sestaví web po každém pushi do větve `main`. V nastavení repozitáře musí být jako zdroj GitHub Pages zvoleno **GitHub Actions**.

## Zdroj kontaktů

Vstupní CSV: `../outputs/kv-lekari-karlovarsky-kraj-2026-08-03/kv_lekari_digitalni_audit_2026-08-03.csv`.
Generátor přebírá všech 532 auditovaných míst péče. Primární deduplikační klíč je `misto_id` z NRPZS; stejné IČO na více adresách zůstává záměrně jako více provozoven.
Ordinační hodiny jsou uloženy v `data/opening-hours.json`. Zobrazují se pouze při jednoznačném spárování veřejného profilu nebo strukturovaných dat vlastního webu; jinak aplikace uvádí `Nedohledáno`.
