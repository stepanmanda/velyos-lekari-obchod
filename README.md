# VELYOS · Obchod lékaři

Interní volací kokpit pro nabídku digitální identity ordinacím a navazujícího pilotu MEDVISION.

## Co aplikace umí

- 404 auditovaných míst péče: praktici, pediatři, gynekologové, stomatologové a ortodontisté z NRPZS,
- digitální skóre, obchodní priorita a doporučená nabídka z veřejného auditu,
- scénář hovoru upravený podle oboru,
- evidence výsledku, poznámek, follow-upů a schůzek,
- lokální ukládání dat v prohlížeči,
- export do CSV a záloha/obnova přes JSON,
- školení, námitky, následný e-mail a hranice obchodních tvrzení.

## Důležité omezení dat

GitHub Pages nemá databázi. Historie hovorů a poznámky proto zůstávají v `localStorage` konkrétního prohlížeče. Při aktualizaci centrálního seznamu se čerstvá data automaticky sloučí s lokální historií podle stabilního ID místa NRPZS; stejné místo se proto nevytvoří podruhé. Pravidelně používejte tlačítko **Záloha**. Pro přenos na jiné zařízení použijte **Obnovit**.

## Lokální spuštění

```bash
npm install
npm run prepare:leads
npm run dev
```

## Publikování

Workflow `.github/workflows/deploy-pages.yml` sestaví web po každém pushi do větve `main`. V nastavení repozitáře musí být jako zdroj GitHub Pages zvoleno **GitHub Actions**.

## Zdroj kontaktů

Vstupní CSV: `../outputs/kv-lekari-karlovarsky-kraj-2026-08-03/kv_lekari_digitalni_audit_2026-08-03.csv`.
Generátor přebírá všech 404 auditovaných míst péče. Primární deduplikační klíč je `misto_id` z NRPZS; stejné IČO na více adresách zůstává záměrně jako více provozoven.
