import type { IAnswerBlock, IAssistantAnswer } from 'assistant/types/assistant';

export interface IMockAnswer {
  keywords: string[];
  entities: string[];
  answer: IAssistantAnswer;
}

const numberBlock = (title: string, key: string, kind: 'amount' | 'litres' | 'number', value: number): IAnswerBlock => ({
  type: 'number',
  title,
  columns: [{ key, kind }],
  rows: [{ [key]: value }],
  labelField: null,
  valueField: key,
  entity: 'lot',
  records: [],
  reporting: null,
  isTruncated: false,
});

const answer = (message: string, blocks: IAnswerBlock[], extras: Partial<IAssistantAnswer> = {}): IAssistantAnswer => ({ kind: 'answer', message, blocks, choices: [], scope: null, computedAt: null, ...extras });

const SEASON_RANGE = [
  { field: 'received_date', op: 'gte', value: '2026-11-01' },
  { field: 'received_date', op: 'lt', value: '2026-11-28' },
] as const;

/** Answers the mock service streams, picked by a keyword of the question; the last one is the fallback. */
export const MOCK_ANSWERS: IMockAnswer[] = [
  {
    keywords: ['ca', 'chiffre', 'revenue', 'دخل', 'رقم', 'dkhl'],
    entities: ['lot'],
    answer: answer('Le CA de la saison est de 186 420 DH, dont 142 300 DH déjà encaissés.', [
      numberBlock('CA de la saison', 'revenue', 'amount', 186420),
      {
        type: 'bar_chart',
        title: 'CA par semaine',
        columns: [{ key: 'received_week', kind: 'date' }, { key: 'revenue', kind: 'amount' }],
        rows: [
          { received_week: '2026-11-02', revenue: 31200 },
          { received_week: '2026-11-09', revenue: 44850 },
          { received_week: '2026-11-16', revenue: 52370 },
          { received_week: '2026-11-23', revenue: 58000 },
        ],
        labelField: 'received_week',
        valueField: 'revenue',
        entity: 'lot',
        records: [],
        reporting: null,
        isTruncated: false,
      },
    ], {
      suggestions: ['Quels clients ont le plus contribué au CA ?', 'Compare avec la saison dernière', 'Combien reste à encaisser ?'],
      method: {
        queries: [{ entity: 'lot', measures: ['revenue', 'collected'], groupBy: [], filters: [...SEASON_RANGE], period: null, compare: null }],
        calcs: [],
      },
    }),
  },
  {
    keywords: ['doi', 'impay', 'owe', 'ديون', 'كريدي', 'kridi'],
    entities: ['lot', 'client'],
    answer: answer('3 clients doivent encore 18 650 DH au total.', [
      {
        type: 'table',
        title: 'Plus gros impayés',
        columns: [{ key: 'client_name', kind: 'text' }, { key: 'outstanding', kind: 'amount' }],
        rows: [
          { client_name: 'Karim Bennani', outstanding: 9800 },
          { client_name: 'Coopérative Al Amal', outstanding: 6350 },
          { client_name: 'Fatima Zahra El Idrissi', outstanding: 2500 },
        ],
        labelField: 'client_name',
        valueField: 'outstanding',
        entity: 'lot',
        records: [],
        reporting: null,
        isTruncated: false,
      },
    ]),
  },
  {
    keywords: ['jour', 'stock', 'cuve', 'days', 'يوم', 'خزن'],
    entities: ['storage'],
    answer: answer('2 stockages de clients arrivent à leur date prévue dans les 10 prochains jours.', [
      {
        type: 'cards',
        title: 'Stockages à venir chercher',
        columns: [{ key: 'client_name', kind: 'text' }, { key: 'remaining_litres', kind: 'litres' }, { key: 'days_until_planned_end', kind: 'days' }],
        rows: [],
        labelField: null,
        valueField: null,
        entity: 'storage',
        records: [
          { id: 'mock-storage-1', entity: 'storage', label: 'OJ-2627-0142', link: null, facts: [{ key: 'client_name', kind: 'text', value: 'Karim Bennani' }, { key: 'remaining_litres', kind: 'litres', value: 220 }, { key: 'days_until_planned_end', kind: 'days', value: 4 }] },
          { id: 'mock-storage-2', entity: 'storage', label: 'OJ-2627-0157', link: null, facts: [{ key: 'client_name', kind: 'text', value: 'Fatima Zahra El Idrissi' }, { key: 'remaining_litres', kind: 'litres', value: 96 }, { key: 'days_until_planned_end', kind: 'days', value: 9 }] },
        ],
        reporting: null,
        isTruncated: false,
      },
    ]),
  },
  {
    keywords: [],
    entities: ['lot'],
    answer: answer('Cette saison, 412 lots ont été reçus pour 186 tonnes d’olives, avec un rendement moyen de 19,4 L par quintal.', [numberBlock('Lots reçus', 'count', 'number', 412), numberBlock('Huile produite', 'oil_litres', 'litres', 36084)]),
  },
];

export const MOCK_TRANSCRIPT = 'Quel est le chiffre d’affaires de la saison ?';
