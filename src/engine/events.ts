import type { CloseReason } from '@/types'

export type EngineEvent =
  | { type: 'STARTED'; auctionId: string }
  | { type: 'NEW_BID'; auctionId: string; dealerId: string; amount: number }
  | { type: 'OUTBID'; auctionId: string; dealerId: string; reason: 'outbid' | 'proxy_exhausted' }
  | { type: 'EXTENDED'; auctionId: string; extendedMs: number }
  | { type: 'ENDING_SOON'; auctionId: string }
  | { type: 'ENDING_BELOW_RESERVE'; auctionId: string }
  | { type: 'NO_BID_ALERT'; auctionId: string }
  | { type: 'CLOSED_DEAL'; auctionId: string; dealerId: string; amount: number }
  | { type: 'CLOSED_PASSED'; auctionId: string; reason: CloseReason }
  | { type: 'NEGOTIATION_INVITE'; auctionId: string; dealerId: string; amount: number }
  | { type: 'WITHDRAWN'; auctionId: string }
