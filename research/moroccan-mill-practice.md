# Moroccan olive mill practice: registers, units, by-products, Client relations

Research date: 2026-10-21. Scope: what Moroccan olive mills (traditional *maâsras*, semi-modern press units, modern 2/3-phase continuous units) actually deal with, so the Oleoziza domain model stops relying on Tunisian mill software assumptions.

**Source trust legend**
- **[Primary]**: Bulletin Officiel texts (via FAOLEX), the official Code Général des Impôts published by the DGI, Ministry of Agriculture publications, IOC, FAO, UNIDO, peer-reviewed or academic papers.
- **[Press]**: Moroccan press quoting ONSSA, basin agencies or mill owners. Useful for current figures but weaker. Treat amounts as anecdotal.
- **[Weak]**: classified ads, reader comments, unsourced aggregations.

---

## 1. Registers and declarations a Moroccan mill must keep or file

### 1.1 ONSSA sanitary authorisation (not agrément)

- Law 28-07 on food safety is applied by **Decree 2-10-473 of 6 Sept 2011**. Under its art. 4, every food business must hold, before it starts operating, either an **agrément** (for the categories listed in the decree's annex) or an **autorisation sur le plan sanitaire** (for everything else). [Primary] ([BO n° 5984, via FAOLEX](https://faolex.fao.org/docs/pdf/mor106652.pdf))
- For plant products, the annex lists only juices and nectars, seed oils, heat-treated vegetable preserves and wine products. **Olive oil is not on it, so a mill needs an *autorisation sanitaire*, not an agrément.** This is my reading of the annex (section V). [Primary, my interpretation] (same source)
- **Decree 2-14-268 of 29 Jan 2015** (olive oil and olive-pomace oil quality) art. 8 confirms that establishments that produce, process, pack, store or transport these oils fall under arts. 4–5 of Decree 2-10-473 (authorisation/agrément). They must also ensure traceability under its art. 75. [Primary] ([BO n° 6336, via FAOLEX](https://faolex.fao.org/docs/pdf/mor145744.pdf))
- **Authorisation number format** (Decree 2-10-473 art. 13): activity code (letters) . prefecture/province code . application receipt number . last two digits of the year of issue, with groups separated by dots. **Art. 14:** this number must appear on the establishment's written and electronic documents, its correspondence, its advertising and its packaging. [Primary]
- ONSSA runs regular sanitary visits. **Art. 24: every regular sanitary visit must be recorded in a register kept by the operator** (date, inspectors, report reference). Art. 21: the operator must present the documents and registers required by the decree. [Primary]
- Scale: ONSSA reported **727 sanitary authorisations for olive crushing units** (including pomace-oil extraction units) as of end-December 2025. A November 2025 campaign of 439 inspections led to 7 withdrawals, 11 suspensions and 41 t of oil destroyed. [Press] ([Consonews, Jan 2026](https://consonews.ma/news/food-boissons/huile-dolive-non-conforme-58-affaires-devant-la-justice-apres-les-controles-sanitaires); [Le Desk](https://ledesk.ma/encontinu/lonssa-revoque-7-autorisations-dunites-dhuile-dolive-apres-439-inspections/))

### 1.2 Traceability content (law 28-07 / Decree 2-10-473 art. 75–76)

Art. 75 requires every food operator to have [Primary] ([FAOLEX](https://faolex.fao.org/docs/pdf/mor106652.pdf)):
1. systems and procedures that **identify the direct suppliers** of each input (for a mill: the farmer or Client who brought the olives);
2. **labelling or identification of the products** it puts on the market;
3. systems that **identify its professional customers** (one step down; final consumers are not covered);
4. a **withdrawal/recall procedure**.

Art. 76: if a product may be unsafe, the operator must tell ONSSA immediately and give:
- product name, **code or lot number**, establishment number and production date;
- **quantities: the total originally held, the total distributed before the recall and the total still held**;
- the distribution area by region/province, plus the names and addresses of wholesalers and retailers.

This is effectively the data model a mill's lot ledger must be able to produce.

The decree does **not** prescribe a paper register format for mills. "One step up, one step down + lot quantities" is the legal obligation.

### 1.3 Labelling and containers (Decree 2-14-268)

- Legal categories: vierge extra, vierge, vierge courant, lampante, raffinée, huile d'olive (blend), and the pomace oils (brute, raffinée, huile de grignons d'olive). [Primary] ([FAOLEX](https://faolex.fao.org/docs/pdf/mor145744.pdf)) The physico-chemical limits are fixed by **joint order 293-16 of 2 Feb 2016**. I found it cited but did not read it. [Press] ([Consonews](https://consonews.ma/news/food-boissons/huile-dolive-non-conforme-58-affaires-devant-la-justice-apres-les-controles-sanitaires))
- **Sale to the final consumer must use containers of these nominal volumes: 0.1, 0.25, 0.5, 0.75, 1, 2, 3, 5, 10, 20, 25 L.** [Primary] (art. 9)
- Labelling follows Decree 2-12-389. [Primary]

### 1.4 Ministry of Agriculture statistics / Interprolive / "ONH equivalent"

- **Not found:** no Moroccan text or circular requiring mills to file daily reception or production registers, or to declare crushed tonnages or oil stocks to the Ministry. I searched the Ministry, ONSSA, the BO via FAOLEX, and the press.
- Morocco has **no equivalent of Tunisia's ONH**. The Ministry's own article in the IOC journal says the olive oil market "remains free and prices fluctuate" (unlike seed oils, whose prices are regulated). [Primary] ([IOC, OLIVAE n° 125, 2019](https://www.internationaloliveoil.org/wp-content/uploads/2019/11/OLIVAE-125-ENG.pdf), p. 25)
- Interprolive is the olive interprofession (contract-programme partner, FAO/EBRD project partner). [Primary] ([FAO 2022](https://www.fao.org/3/cc1154fr/cc1154fr.pdf)) **Not found:** any reporting obligation on mills toward Interprolive.
- Temporary measure: olive oil exports were put under **export licence until 31 Dec 2024** (2023 arrêté). [Press] ([La Vie Éco](https://www.lavieeco.com/affaires/agriculture/huile-dolive-le-gouvernement-limite-les-exportations/))

### 1.5 Tax and invoicing (CGI 2025, official DGI edition)

All points below are [Primary] ([CGI 2025, DGI](https://portail.tax.gov.ma/wps/wcm/connect/d15709dd-1125-4da5-9700-d75522763d52/CGI+2025+FR..pdf?MOD=AJPERES)).
- **Art. 91-I-A-7°:** VAT exemption without right to deduct for "l'huile d'olive et les sous-produits de la trituration des olives fabriqués par les **unités artisanales**". Industrial or modern units are not covered by this line.
- FAO notes a **10 % VAT on oil sold in sealed bottles**. [Primary] ([FAO 2022](https://www.fao.org/3/cc1154fr/cc1154fr.pdf)) I did not check the CGI article that sets the rate.
- **Art. 145-III:** invoices must be **pre-numbered in a continuous series**, either printed or issued by a computer system. Mandatory content:
  - seller identity, tax ID (IF) and taxe professionnelle number;
  - date;
  - customer name and address, plus the customer's **ICE**;
  - price, quantity and nature of the goods or service;
  - VAT shown separately, or the exemption cited;
  - payment references and payment method.

  A **till receipt may replace the invoice for sales to individuals**: date, seller, product or service, quantity, price and VAT if any.
- **Art. 145-II:** a year-end inventory in quantities and values.
- **Art. 46:** the farmer's processing of their own produce counts as agricultural income, *except transformation by industrial means*. A modern mill is therefore taxed as a business.
- Not verified: whether the service-milling fee itself is subject to VAT for a modern mill. Ask an accountant.

### 1.6 Environmental (see §3)

Discharge authorisation from the basin agency under water law 36-15.

---

## 2. Traditional weight and volume units at reception

- **Quintal / *qantar* (قنطار) = 100 kg**. This is the working unit in Moroccan mill talk for yields ("litres per qantar") and for olive prices. Hespress mill owners use "per qantar" and "per 100 kg" interchangeably. [Press] ([Hespress, Nov 2024](https://www.hespress.com/%D9%85%D9%87%D9%86%D9%8A%D9%88-%D9%85%D8%B9%D8%A7%D8%B5%D8%B1-%D8%B2%D9%8A%D8%AA-%D8%A7%D9%84%D8%B2%D9%8A%D8%AA%D9%88%D9%86-%D9%8A%D8%A4%D9%83%D8%AF%D9%88%D9%86-%D9%88%D8%B5%D9%88%D9%84-%D9%83%D9%84-1457977.html)) The Ministry/INRA survey expresses yields as "kg d'huile par quintal". [Primary-ish] ([Agrimaroc, enquête nationale](https://www.agrimaroc.net/2018/06/10/qualite-des-huiles-dolive-au-maroc-enquete-nationale-et-analyses-au-laboratoire/5/))
- **Harvest crate (*caisse* / صندوق) ≈ 30–32 kg**, used for paying pickers (≈ 35 MAD per crate in 2025). [Press] ([Hespress EN, Dec 2025](https://en.hespress.com/128298-olive-harvest-in-morocco-faces-labor-shortages-despite-strong-output-industry-sources-say.html))
- **Oil is counted in litres**, often in 5 L bottles or jerrycans (e.g. "400 MAD per 5 L" in Nador, 2025). [Press] ([Hespress AR, Oct 2025](https://www.hespress.com/%D9%85%D9%88%D8%B3%D9%85-%D8%A7%D8%B3%D8%AA%D8%AB%D9%86%D8%A7%D8%A6%D9%8A-%D9%84%D9%85%D8%AD%D8%B5%D9%88%D9%84-%D8%A7%D9%84%D8%B2%D9%8A%D8%AA%D9%88%D9%86-%D9%8A%D8%AE%D9%81%D8%B6-%D8%A3%D8%B3%D8%B9-1643236.html)) Yields are quoted in litres per qantar in the press and in kg per quintal in technical sources. The app needs a density conversion (≈ 0.915 kg/L is the usual figure for olive oil; not taken from a Moroccan source).
- Historical Maghreb measures (mudd, ṣāʿ, qafīz) vary by place and era and have no fixed kg value. [Weak/academic, general] **Not found:** any documented Oriental-specific (Oujda/Berkane) traditional unit for olives at reception, with a kg value.

---

## 3. By-products: pomace (*grignons*, *fitour* فيتور) and vegetable water (*margines*, *amurca*, مرجان)

### 3.1 Quantities by process

Ministry of Agriculture technical bulletin, Table 1, per 100 kg of olives. [Primary] ([MADRPM/PNTTA BTTA n° 141, June 2006](https://www.agrimaroc.net/bulletins/btta_141.pdf))

| | 2-phase decanter | 3-phase decanter | Super-press |
|---|---|---|---|
| Pomace (kg/100 kg olives) | 75.5 | 57.5 | 45.5 |
| Pomace moisture (%) | 57.3 | 55.4 | 35.5 |
| Oil left in pomace (kg/100 kg) | 2.7 | 2.0 | 5.4 |
| Margines (L/100 kg olives) | 3.6 | 90 | 75 |
| Industrial extraction yield (%) | 86.1 | 85.5 | 84.5 |

The same bulletin gives 60–70 L of margines per 100 kg for the 3-phase process. Its takeaway for the model: **a 2-phase mill produces almost no margines but a wet pomace. A 3-phase or press mill produces both.**

### 3.2 Where pomace goes

- IOC/Ministry value chain: **wet pomace → drying → extraction unit → olive-pomace oil**. Side branches go to **fuel** and **livestock feed**. [Primary] ([OLIVAE 125](https://www.internationaloliveoil.org/wp-content/uploads/2019/11/OLIVAE-125-ENG.pdf), p. 27) Some agricultural EIGs (economic interest groups) dry pomace and pits and make **fuel logs** from them. [Primary] (same, p. 19)
- Historical baseline (1988): 20–25 % of fatty pomace was burnt in **brickworks** and the rest went to five extraction units. Exhausted pomace was used as fuel in factory boilers and brickworks. Pomace oil with high acidity went to **soap-making**. [Primary, old] ([Hachimi, CIHEAM Options Méditerranéennes 1988](https://ressources.ciheam.org/ressources/om/pdf/s18/CI010895.pdf))
- ONSSA (2026): use of *fitour* is **limited to approved pomace-oil extraction units**. Fitour is not a food, and pomace oil must never be sold as "virgin olive oil". [Press quoting ONSSA] ([Consonews](https://consonews.ma/news/food-boissons/huile-dolive-non-conforme-58-affaires-devant-la-justice-apres-les-controles-sanitaires))
- **Prices (anecdotal):** one Ouezzane mill owner (2024) separates paste from pits:
  - pomace paste sold to specialised companies at **0.40 MAD/kg**;
  - **crushed pits up to 1 MAD/kg**.

  A Chefchaouen mill owner says traders buy the crushed pits left after evaporation. [Press] ([Hespress AR, Nov 2024](https://www.hespress.com/%D8%AA%D8%B1%D8%A7%D8%AC%D8%B9-%D9%85%D8%AD%D8%B5%D9%88%D9%84-%D8%A7%D9%84%D8%B2%D9%8A%D8%AA%D9%88%D9%86-%D9%8A%D9%82%D9%84%D9%84-%D9%85%D9%86-%D8%A7%D9%84%D9%85%D8%AE%D9%84%D9%81%D8%A7%D8%AA-%D8%A7-1465334.html)) No official or Oriental-specific price found.

### 3.3 Margines: rules and practice

- **Water law 36-15**: any *déversement* of wastewater needs an authorisation from the **Agence du bassin hydraulique**, and fees apply. Direct or indirect discharges that alter surface or ground water are prohibited. [Primary] ([Loi 36-15, ABHT copy](https://abht.ma/wp-content/uploads/2023/12/LOI-36-15-RELATIVE-A-LEAU.pdf)) Decree 2-04-553 (2005) on discharges and joint order 2942-13 (2013, general discharge limit values) apply where no sector-specific limits exist. I saw these only in a search summary and did not read them. [Unverified] ([Arrêté 2942-13](https://abhsm.njt-group.com/uploads/cadreJuridiqueReglementaire/6/attachment/fr/1781080015_6a291fcf1b0e5_arrete-conjoint-n-2942-13-du-7-octobre-2013.pdf))
- **Not found:** a Moroccan text with discharge limits *specific* to olive mills.
- Practice: **lined (impermeable) evaporation ponds**, which the Oum Er-Rbia basin agency pushes. Fines under law 36-15: **10,000–500,000 MAD**. [Press] ([Le360, Oct 2024](https://fr.le360.ma/economie/graves-menaces-des-dechets-des-huileries-sur-lenvironnement_ZXYKJ75D3ZCPBE4MZEYTXU6RDQ/); [Médias24, 2020](https://medias24.com/2020/11/10/lagence-du-bassin-hydraulique-de-loum-rbia-sattaque-aux-rejets-des-huileries)) One mill reports a 2,000 m² pond no deeper than 1.5 m. [Press] (Hespress Nov 2024 above)
- Oriental: Bouknana et al. (2014) characterised margines from mills in **Oujda, Nador, Berkane, Taourirt and Jerada**. Average pH was 4.5–5.3. COD was highest for traditional presses (108–120 g O₂/L) and lowest for 2-phase (52–64 g/L). Municipal sewer discharge is not feasible. [Academic] ([J. Mater. Environ. Sci. 5(4) 2014, An-Najah record](https://staff.najah.edu/en/publications/963/)) The Oriental is covered almost entirely by the **Moulouya** basin agency. **Not found:** Moulouya-specific margines rules or campaigns.

---

## 4. Brokers / intermediaries (semsar, courtier)

- FAO survey of 136 mills (2022): **about 60 % of crushed volumes are service milling**. The remaining 40 % of oil is "sold to **intermediaries** and/or directly to consumers". FAO calls the domestic market largely **informal and dominated by bulk** (*vrac*). [Primary] ([FAO 2022, Montée en gamme de l'huile d'olive marocaine](https://www.fao.org/3/cc1154fr/cc1154fr.pdf), p. 7)
- 1988: olives already spent too long stored "at the farmer's and the intermediaries'". [Primary, old] ([Hachimi 1988](https://ressources.ciheam.org/ressources/om/pdf/s18/CI010895.pdf))
- A Driouch (Oriental region) mill owner cites "monopolisation by some intermediaries" (احتكار بعض الوسطاء) as a constraint in 2025. [Press] ([Hespress AR, Oct 2025](https://www.hespress.com/%D9%85%D9%88%D8%B3%D9%85-%D8%A7%D8%B3%D8%AA%D8%AB%D9%86%D8%A7%D8%A6%D9%8A-%D9%84%D9%85%D8%AD%D8%B5%D9%88%D9%84-%D8%A7%D9%84%D8%B2%D9%8A%D8%AA%D9%88%D9%86-%D9%8A%D8%AE%D9%81%D8%B6-%D8%A3%D8%B3%D8%B9-1643236.html)) Brokers also appear in the pomace trade. [Weak] ([EspaceAgro ads](https://www.espaceagro.com/ads/grignon-s-d-olive/courtier/maroc/))
- Maâsras mostly crush for the grower's own needs. Only a very limited number buy olives to sell oil. [Primary] ([OLIVAE 125](https://www.internationaloliveoil.org/wp-content/uploads/2019/11/OLIVAE-125-ENG.pdf), p. 25)
- **Not found:** any documented commission rate, or evidence that a *semsar* sits formally between farmer and mill in the milling transaction itself. Intermediaries show up mainly as **buyers of olives and bulk oil** and as traders of by-products.

---

## 5. Service Milling (trituration à façon) fees and oil yields

### Fees

- **Charging basis observed in Morocco: cash per kg of olives brought in.** Every Moroccan source found quotes ≈ **0.50 MAD/kg of olives** (≈ 50 MAD per quintal):
  - Chefchaouen, Nov 2024 [Press] ([Hespress AR](https://www.hespress.com/%D8%AA%D8%B1%D8%A7%D8%AC%D8%B9-%D9%85%D8%AD%D8%B5%D9%88%D9%84-%D8%A7%D9%84%D8%B2%D9%8A%D8%AA%D9%88%D9%86-%D9%8A%D9%82%D9%84%D9%84-%D9%85%D9%86-%D8%A7%D9%84%D9%85%D8%AE%D9%84%D9%81%D8%A7%D8%AA-%D8%A7-1465334.html));
  - Tadla/Beni Mellal area, Nov 2024 [Press] ([Hespress AR](https://www.hespress.com/%D9%85%D9%87%D9%86%D9%8A%D9%88-%D9%85%D8%B9%D8%A7%D8%B5%D8%B1-%D8%B2%D9%8A%D8%AA-%D8%A7%D9%84%D8%B2%D9%8A%D8%AA%D9%88%D9%86-%D9%8A%D8%A4%D9%83%D8%AF%D9%88%D9%86-%D9%88%D8%B5%D9%88%D9%84-%D9%83%D9%84-1457977.html));
  - Fès-Meknès [Press] ([LesEco](https://leseco.ma/maroc/fes-meknes-olives-les-unites-de-trituration-tournent-a-plein-regime.html); I saw this only in a search snippet because the page returned 403).
- FAO: the milling price at **continuous-system mills is ≈ 10 % higher** than at other mill types, while the price offered for olives is not higher. [Primary] ([FAO 2022](https://www.fao.org/3/cc1154fr/cc1154fr.pdf))
- **Not found for Morocco:** payment as a **share of the oil**, a fee per kg of oil, fees tied to by-products (e.g. the mill keeps the pomace), or Oriental-specific (Oujda/Berkane) rates. These schemes exist elsewhere in the Mediterranean (for example, Palestinian statistics define the fee as cash *or in kind*), but I found no Moroccan evidence for them.

### Oil yields

| Source | Figure |
|---|---|
| Picholine marocaine potential | 18–22 % oil [Primary] ([OLIVAE 125](https://www.internationaloliveoil.org/wp-content/uploads/2019/11/OLIVAE-125-ENG.pdf)) |
| National survey (Ministry/INRA) | semi-modern ≈ 14–16 kg oil/quintal; super-press and continuous ≈ 16–20 kg/quintal, "below the 22 % achievable" [Primary-ish] ([Agrimaroc](https://www.agrimaroc.net/2018/06/10/qualite-des-huiles-dolive-au-maroc-enquete-nationale-et-analyses-au-laboratoire/5/)) |
| Ministry bulletin 2006 | presses ≤ 20 % (oil mass / fruit mass) at best; extraction efficiency 84.5 % (press) / 85.5 % (3-phase) / 86.1 % (2-phase) [Primary] ([BTTA 141](https://www.agrimaroc.net/bulletins/btta_141.pdf)) |
| UNIDO 2007 | maâsras lose 8–10 % of the oil; ≈ 50 % of maâsra output is lampante [Primary] ([UNIDO guide](https://downloads.unido.org/ot/47/44/4744333/70520_GUIDE_DU_PROD._DE_LHUILE_DOLIVE.pdf)) |
| Mill owners 2024–25 | 13–16 L/qantar (Tadla), 16–20 L/qantar (Ouezzane/Chefchaouen), 14–18 L/qantar (Kelaâ) [Press] (Hespress links above) |

Yields swing strongly with the season and with the timing within it: low early in the season, higher later; drought years are worse.

### Sector context

- Sector counts:
  - **948 modern/semi-modern units** (1.8 Mt/yr capacity) and **≈ 11,000 maâsras** [Primary] ([OLIVAE 125](https://www.internationaloliveoil.org/wp-content/uploads/2019/11/OLIVAE-125-ENG.pdf));
  - FAO later cites **≈ 1,000 industrial/semi-industrial units** [Primary] ([FAO 2022](https://www.fao.org/3/cc1154fr/cc1154fr.pdf)).
- Oriental region: 51 modern units with 31,800 t capacity, mostly in Guercif and Taourirt (Le360, Dec 2023), or 375 crushing units of which 14 % are modern (Hespress). The two figures conflict. [Press]

---

## Implications for Oleoziza (recommendation)

**MVP-worthy:**
1. **Reception ticket per Client delivery**: Client identity, date, weight in kg (display and enter in quintals as well), olive variety, notes. This satisfies the art. 75 "identify direct supplier" requirement and is the basis of the Service Milling invoice.
2. **Service Milling fee as MAD per kg of olives** (configurable rate, default 0.50 MAD/kg), with a per-site override for continuous-chain sites. Keep "share of oil" and "per kg of oil" as *possible later* schemes. They have no Moroccan evidence yet.
3. **Lot/batch traceability**: a lot ID that links reception tickets → crushing batch → oil output (litres and kg) → where the oil went (Client pickup, or a sale to a professional customer). The ledger must be able to answer the art. 76 quantities: total produced, total distributed, total remaining.
4. **Yield per batch** in L/qantar and in %, since owners and Clients talk in litres per qantar.
5. **Invoices / receipts with continuous numbering** and the art. 145 mentions: site IF/ICE, Client ICE when the Client is a business, nature and quantity, VAT line or the exemption cited. Also show the **ONSSA authorisation number** on documents (art. 14 of Decree 2-10-473), per site.

**Post-MVP:**
- By-product ledger (pomace tonnes and buyer, pits, margines volume to pond) with sale prices.
- Intermediary/broker as a Client type: they exist as olive and bulk-oil buyers, but no fee model is documented.
- Oil stock and sales to consumers in the legal container sizes.
- ONSSA visit register (art. 24).

**Not needed:** Tunisian ONH-style daily regulatory declarations. Morocco has no equivalent, and none was found.
