export interface AnalysisData {
    response: string;
    timestamp: string;
    diffLength: number;
}

export type AnalysisType = 'all' | 'staged';

export interface WebviewMessage {
    command: string;
    file?: string;
}
