
export interface NormalizedPost {
  platform: 'Facebook' | 'Instagram';
  content: string;
  publishTime: Date;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  postType: string;
  permalink: string;
  totalEngagement: number;
}

export interface DataSet {
  id: string;
  name: string;
  uploadDate: string;
  posts: NormalizedPost[];
  filenames: string[];
}

export enum Platform {
    All = 'All',
    Facebook = 'Facebook',
    Instagram = 'Instagram'
}

export interface AnalysisData {
  insights: string;
  contentSuggestions: string;
  platformAdjustments: string;
}

export interface MonthlyFollowerData {
    fbGained: number | string;
    fbLost: number | string;
    igGained: number | string;
    igLost: number | string;
}

export interface AllMonthlyFollowerData {
    [month: string]: MonthlyFollowerData; // key is 'YYYY-MM'
}

export interface SelectionState {
  enabledDataSetIds: Record<string, boolean>;
  enabledPostPermalinks: Record<string, boolean>;
}

export interface BaseFollowerData {
    fbBase: number | string;
    igBase: number | string;
}

export interface CompanyProfile {
    companyName: string;
    instagramUrl: string;
    facebookUrl: string;
    logo?: string; // Base64 Data URL
}

export interface UserData {
    dataSets: DataSet[];
    selectionState: SelectionState;
    allMonthlyFollowerData: AllMonthlyFollowerData;
    baseFollowerData: BaseFollowerData;
    companyProfile: CompanyProfile;
}

export interface WorkspaceClient {
  name: string;
  userData: UserData;
  color?: ClientThemeColor;
}

// KV state.userData supports both the legacy single-client shape (UserData)
// and the multi-client workspace shape below.
export interface WorkspaceUserDataV2 {
  version: 2;
  /** Monotonic revision used to ignore stale remote polls. */
  rev?: number;
  currentClientId: string;
  clients: Record<string, WorkspaceClient>;
}

export interface GoogleFile {
  id: string;
  name: string;
  createdTime: string;
}

export interface ReadOnlyViewState {
  platformFilter: Platform;
  dateRangeFilter: string; // '7', '30', 'monthly', 'custom', 'all'
  customDateRange: { start: string; end: string };
  selectedMonth: string;
  absoluteDateRange?: { start: string; end: string };
}

export interface SharedData {
  allData: UserData;
  analyses: Record<string, AnalysisData>;
  viewState: ReadOnlyViewState;
  analysis: AnalysisData;
}

export type ThemeColor = 'zinc' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'orange';

// Client theme colors: keep defaults in earth-tone palette.
export type ClientThemeColor = Extract<ThemeColor, 'zinc' | 'amber' | 'orange' | 'emerald'>;
