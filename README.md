# VELYOS · Obchod lékaři

Interní volací kokpit pro nabídku digitální identity ordinacím a navazujícího pilotu MEDVISION.

## Co aplikace umí

- databáze praktiků, gynekologů a stomatologů z veřejného registru NRPZS,
- scénář hovoru upravený podle oboru,
- evidence výsledku, poznámek, follow-upů a schůzek,
- lokální ukládání dat v prohlížeči,
- export do CSV a záloha/obnova přes JSON,
- školení, námitky, následný e-mail a hranice obchodních tvrzení.

## Důležité omezení dat

GitHub Pages nemá databázi. Historie hovorů a poznámky proto zůstávají v `localStorage` konkrétního prohlížeče. Pravidelně používejte tlačítko **Záloha**. Pro přenos na jiné zařízení použijte **Obnovit**.

## Lokální spuštění

```bash
npm install
npm run prepare:leads
npm run dev
```

## Publikování

Workflow `.github/workflows/deploy-pages.yml` sestaví web po každém pushi do větve `main`. V nastavení repozitáře musí být jako zdroj GitHub Pages zvoleno **GitHub Actions**.

## Zdroj kontaktů

Vstupní CSV: `../outputs/kv-lekari-karlovarsky-kraj-2026-08-03/kv_lekari_nrpzs_raw_2026-08-03.csv`.
Generátor vybere pouze samostatné ordinace s kódy 320, 322 a 323.
