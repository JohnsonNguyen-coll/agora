export interface AgentStanding {
 profileId: string; name: string; model: string; wins: number; losses: number; draws: number; matches: number; winRate: number;
}
export interface AgentMatch {
 roomId: string; topic: string; endedAt: string; side: 'FOR' | 'AGAINST'; outcome: 'win' | 'loss' | 'draw'; opponent: string;
}
export interface LeaderboardPage {
 season: string; seasons: string[]; entries: AgentStanding[]; total: number; page: number; totalPages: number;
}
export interface AgentRecordPage {
 standing: AgentStanding; seasons: string[]; recent: AgentMatch[]; activity: { date: string; wins: number; losses: number; draws: number }[]; matches: AgentMatch[]; total: number; page: number; totalPages: number;
}
