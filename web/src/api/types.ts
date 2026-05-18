export interface StageDefinition {
  id: number;
  key: string;
  label: string;
  dotColor: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarColor: string;
}

export interface TagDefinition {
  id: number;
  tagType: string;
  label: string;
  countryCode: string | null;
  sortOrder: number;
  isActive: boolean;
  colorBg: string | null;
  colorBorder: string | null;
  colorText: string | null;
}

export interface CustomerTag {
  id: number;
  customerId: number;
  tagDefinitionId: number;
  tagDefinition: TagDefinition;
  taggedAt: string;
}

export interface Customer {
  id: number;
  lineUserId: string | null;
  displayName: string;
  initials: string;
  avatarColor: string;
  stageId: number;
  stage: StageDefinition;
  commitmentScore: number | null;
  urgencyFlag: boolean;
  notes: string | null;
  assignedAgentId: number | null;
  assignedAgent: Agent | null;
  scoreUpdatedBy: number | null;
  scoreUpdater: Agent | null;
  scoreUpdatedAt: string | null;
  lastMessageAt: string | null;
  lastReplyAt: string | null;
  lastReplyBy: number | null;
  lastReplier: Agent | null;
  followedAt: string | null;
  totalMessages: number;
  createdAt: string;
  tags: CustomerTag[];
}

export interface Message {
  id: number;
  customerId: number;
  direction: 'in' | 'out';
  msgType: string;
  body: string;
  sentAt: string;
  agentId: number | null;
  agent: Agent | null;
}

export interface MessageResponse {
  data: Message[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  activeCustomers: number;
  unattendedCount: number;
  appliedThisMonth: number;
  enrolledThisMonth: number;
}

export interface AgentMetrics {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
  assignedCount: number;
  unattendedCount: number;
  stageBreakdown: Record<string, number>;
  lastActiveAt: string | null;
}
