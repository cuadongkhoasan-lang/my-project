
export enum Answer {
  UNSET = 'unset',
  YES = 'yes',
  NO = 'no',
}

export interface Criterion {
  id: string;
  text: string;
  explanation?: string;
}

export type CriteriaState = Record<string, Answer>;

export enum RecommendationLevel {
  SUCCESS = 'success', // Green
  WARNING = 'warning', // Yellow
  DANGER = 'danger',   // Red
  INFO = 'info',     // Blue/Gray
}

export interface Recommendation {
  level: RecommendationLevel;
  title: string;
  text: string;
}
