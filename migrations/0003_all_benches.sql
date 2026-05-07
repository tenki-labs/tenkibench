-- TenkiBench v0.3 — register the full catalog of benches and their categories
-- Idempotent: safe to re-run.

-- Categories: vi BEHOLDER global slug-uniqueness fra 0001 (FK-er fra
-- task_results og run_category_scores er avhengige av den). Legger heller
-- til en composite (bench_slug, slug) UNIQUE for å støtte ON CONFLICT-spec
-- nedenfor og fremtidig multi-bench-frihet.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'categories_bench_slug_uniq' and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_bench_slug_uniq unique (bench_slug, slug);
  end if;
end$$;

-- Benches catalog
insert into public.benches (slug, name, description, weight) values
  ('norwegian-smb',           'Norsk SMB',                 'Faktura, kontrakt, MVA, lov, Brreg, HR/lønn, kundeservice, Bokmål↔Nynorsk', 1.0),
  ('eu-ai-act',               'EU AI Act',                  'Konformitet med EU AI Act for høy- og minimum-risiko KI-systemer', 1.0),
  ('hallucination',           'Hallusinasjon',              'Hallusinasjons-deteksjon på norsk juridisk og forretningsmessig fakta', 1.0),
  ('extraction',              'Strukturert utdragning',     'PDF→JSON, e-post→action, tabell-tolkning på norske dokumenter', 1.0),
  ('tool-use',                'Verktøys-bruk',              'Riktig API-kall mot norske kilder (Brreg, Lovdata, Altinn, Skatteetaten)', 1.0),
  ('norwegian-language',      'Norsk språk',                'Dialekter, samiske språk, eldre rettskrivning, sosiolekt', 1.0),
  ('norwegian-construction',  'Bygg og anlegg',             'NS-standarder, HMS, akkord, anbud — for byggebransjen', 1.0),
  ('norwegian-healthcare',    'Helse og omsorg',            'Helsepersonelloven, taushetsplikt, HELFO, journalføring', 1.0),
  ('norwegian-finance',       'Finans og bank',             'KYC, hvitvasking, finansavtaleloven, verdipapirhandel', 1.0),
  ('gdpr-advanced',           'GDPR avansert',              'DPIA, 72-timers avvik, SCC, BCR, berettiget interesse', 1.0),
  ('safety-norwegian',        'Adferd og lojalitet',        'Profesjonelt avvik, brukerlojalitet, kulturell sensitivitet', 1.0),
  ('norwegian-realestate',    'Eiendom',                    'Tilstandsrapport, husleieloven, eierseksjon, borettslag', 1.0),
  ('norwegian-retail',        'Detaljhandel',               'Angrerett, FKL, markedsføringsloven', 1.0),
  ('norwegian-transport',     'Transport',                  'Yrkestransport, kjøretid, fraktbrev, ADR, toll', 1.0),
  ('norwegian-agriculture',   'Landbruk',                   'Tilskudd, dyrevelferd, konsesjon, beitelovgivning', 1.0),
  ('norwegian-hospitality',   'Restaurant og servering',    'Skjenkebevilling, alkoholloven, HACCP, Mattilsyn', 1.0),
  ('norwegian-tech',          'IT og SaaS',                 'DPA, SaaS-vilkår, OSS-lisens, NSM, NIS2', 1.0),
  ('norwegian-media',         'Media',                      'Kringkastingsloven, redaktøransvar, sitatretten', 1.0),
  ('norwegian-civil-society', 'Frivillighet',               'Frivillighetsregisteret, idrett, trossamfunn, stiftelser', 1.0),
  ('maritime-petroleum',      'Maritim og petroleum',       'Sjøfartsloven, sjøforsikring, IMO, petroleumsloven', 1.0),
  ('research-ethics',         'Forskningsetikk',            'Forskningsetikkloven, helseforskningsloven, REK, NSD', 1.0),
  ('competition-aml',         'Konkurranse og AML',         'Konkurranseloven, hvitvasking, korrupsjonsbestemmelser', 1.0),
  ('accessibility',           'Universell utforming',       'Likestillings-/diskrimineringsloven, WCAG, EU AA', 1.0),
  ('vision-norwegian',        'Bildetolkning (norsk)',      'Skannet faktura, håndskreven kvittering, kart, organisasjonskart', 1.0),
  ('audio-norwegian',         'Lydforståelse (norsk)',      'Norsk tale, dialekt-transkripsjon, kundesamtale → action items', 1.0),
  ('long-context-norwegian',  'Lang kontekst (norsk)',      '100+ siders kontrakter, finn én klausul', 1.0),
  ('temporal-consistency',    'Tids-konsistens',            'Foreldede lover, gjeldende per dato, historiske takster', 1.0),
  ('dialect-translation',     'Dialekt-oversettelse',       '10 dialekter med 10 oppgaver hver — morsmål-validert', 1.0),
  ('nordic-comparative',      'Nordisk sammenligning',      '"Hvilken nordisk lov gjelder for X?" — NO/SE/DK/FI', 1.0),
  ('swedish-smb',             'Svensk SMB',                 'Svensk MVA, Bolagsverket, svenska lagar', 1.0),
  ('danish-smb',              'Dansk SMB',                  'Dansk moms, CVR, danske kontrakter', 1.0),
  ('finnish-smb',             'Finsk SMB',                  'Finsk ALV, PRH, finsk lovgivning', 1.0)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

-- Categories per bench. Existing norwegian-smb categories stay as-is.
-- Insert new ones for each new bench. Unique on (bench_slug, slug).

-- Backfill missing bench_slug (in case 0002 didn't reach all rows)
update public.categories set bench_slug = 'norwegian-smb' where bench_slug is null;

-- norwegian-smb categories already exist from 0001.

-- eu-ai-act
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('eu-ai-act','risk-klassifisering', 'Risiko-klassifisering',     'Plassering av use case i forbudt/høy/begrenset/minimum',    1.5),
  ('eu-ai-act','annex-iv',            'Annex IV-dokumentasjon',     'Tekniske dokumentasjons-elementer kreves for høy-risiko',  1.3),
  ('eu-ai-act','artikkel-13-transparens','Artikkel 13-transparens', 'Tekstutforming for åpenhet mot brukere',                   1.2),
  ('eu-ai-act','forbudte-praksiser',  'Forbudte praksiser',         'Identifisering av Article 5-brudd',                        1.4),
  ('eu-ai-act','konformitet',         'Konformitetsvurdering',      'Egenvurdering vs eksternt-konformitet',                    1.0),
  ('eu-ai-act','ai-literacy',         'AI Literacy',                'Article 4 — kompetansekrav for ansatte',                  0.8)
on conflict (bench_slug, slug) do nothing;

-- hallucination
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('hallucination','lov-sitering',       'Lov-sitering',           'Lovdata-verifikasjon — er § ekte og gjeldende?',         1.5),
  ('hallucination','fiktiv-bedrift',     'Fiktiv bedrift-deteksjon','Avstå fra oppfunnet info om bedrifter / personer',      1.3),
  ('hallucination','tids-foreldelse',    'Tids-foreldelse',        'Identifiser foreldede lover / takster',                  1.2),
  ('hallucination','vet-ikke-villighet', 'Vet-ikke-villighet',     'Si "vet ikke" når riktig (kalibrering)',                 1.0)
on conflict (bench_slug, slug) do nothing;

-- extraction
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('extraction','pdf-til-json',     'PDF → JSON',             'Strukturert utdragning fra ren tekst-PDF',          1.0),
  ('extraction','ocr-faktura',      'Skannet faktura',        'OCR-stress: skannede norske fakturaer',             1.3),
  ('extraction','e-post-action',    'E-post → action items',  'Identifisering av oppgaver i en e-post-tråd',       0.8),
  ('extraction','tabell',           'Tabell-tolkning',        'Excel/CSV-tolkning, pivottabell-resonnement',       1.0)
on conflict (bench_slug, slug) do nothing;

-- tool-use
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('tool-use','brreg-api',          'Brreg-API',              'Riktig formet kall til Brønnøysund API',            1.0),
  ('tool-use','lovdata-sok',        'Lovdata-søk',            'Søkestreng + parsing av Lovdata-svar',              1.0),
  ('tool-use','mva-kalkulator',     'MVA-kalkulator',         'Kall en regne-funksjon med riktige args',           0.8),
  ('tool-use','altinn-skjema',      'Altinn-skjema',          'Identifiser riktig Altinn-skjema for use case',     1.0)
on conflict (bench_slug, slug) do nothing;

-- norwegian-language
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('norwegian-language','trondersk',           'Trøndersk',           'Tolkning av Trønder-dialekt',                  1.0),
  ('norwegian-language','bergensk',            'Bergensk',            'Tolkning av Bergens-dialekt',                  1.0),
  ('norwegian-language','nord-norsk',          'Nord-norsk',          'Tolkning av Nord-norske dialekter',            1.0),
  ('norwegian-language','1938-rettskrivning',  '1938-rettskrivning',  'Eldre Bokmål-form i historiske dokumenter',    0.7),
  ('norwegian-language','nordsamisk',          'Nordsamisk',          'Forståelse av nordsamisk tekst',               1.0)
on conflict (bench_slug, slug) do nothing;

-- norwegian-construction
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('norwegian-construction','ns-8405',  'NS 8405',  'Standardkontrakt for arbeider/prosjektering',  1.5),
  ('norwegian-construction','ns-8407',  'NS 8407',  'Totalentreprise',                              1.3),
  ('norwegian-construction','hms',      'HMS',      'HMS-forskrifter på byggeplass',                1.2),
  ('norwegian-construction','akkord',   'Akkord',   'Akkord-beregning og -sjekk',                   1.0)
on conflict (bench_slug, slug) do nothing;

-- norwegian-healthcare
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('norwegian-healthcare','helsepersonelloven','Helsepersonelloven','Plikter og rettigheter for helsepersonell',  1.5),
  ('norwegian-healthcare','taushetsplikt',     'Taushetsplikt',     'Vurdering av taushetspliktbrudd',              1.3),
  ('norwegian-healthcare','helfo',             'HELFO-refusjon',    'Refusjons-vurderinger og koder',                1.0)
on conflict (bench_slug, slug) do nothing;

-- norwegian-finance
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('norwegian-finance','kyc',          'KYC',                  'Identifikasjons-prosedyrer',           1.2),
  ('norwegian-finance','hvitvasking',  'Hvitvaskingsloven',    'PEP, MTR, mistenkelig aktivitet',      1.5),
  ('norwegian-finance','finansavtale', 'Finansavtaleloven',    'Lån, kausjon, kreditvurdering',        1.0)
on conflict (bench_slug, slug) do nothing;

-- gdpr-advanced
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('gdpr-advanced','dpia',         'DPIA',           'Konsekvensvurdering — utforming og innhold',  1.5),
  ('gdpr-advanced','avvik-72t',    '72-timers avvik','Avviksrapportering til Datatilsynet',         1.3),
  ('gdpr-advanced','scc-bcr',      'SCC / BCR',      'Tredjelands-overføring',                       1.2)
on conflict (bench_slug, slug) do nothing;

-- safety-norwegian
insert into public.categories (bench_slug, slug, name, description, weight) values
  ('safety-norwegian','refusal-quality','Refusal quality',  'Avvis utenfor-kompetanse, ikke for ofte/sjelden',   1.5),
  ('safety-norwegian','loyalty',         'Brukerlojalitet',  'Hold brukerens hemmeligheter — ikke lekk',          1.3),
  ('safety-norwegian','kulturell',       'Kulturell sensitivitet','Norsk forretnings- og samisk kultur-respekt',1.2)
on conflict (bench_slug, slug) do nothing;
