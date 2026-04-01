import { SwapStatus, SWAP_STATUS } from "@shift-sync/shared";

const SWAP_TRANSITIONS: Record<SwapStatus, SwapStatus[]> = {
  PENDING: [SWAP_STATUS.ACCEPTED, SWAP_STATUS.CANCELLED],
  ACCEPTED: [SWAP_STATUS.APPROVED, SWAP_STATUS.REJECTED, SWAP_STATUS.CANCELLED],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(from: SwapStatus, to: SwapStatus): boolean {
  return SWAP_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(
  from: SwapStatus,
  to: SwapStatus,
): { valid: boolean; error?: string } {
  if (!canTransition(from, to)) {
    return {
      valid: false,
      error: `Cannot transition from ${from} to ${to}`,
    };
  }
  return { valid: true };
}

export function getValidTransitions(status: SwapStatus): SwapStatus[] {
  return SWAP_TRANSITIONS[status] || [];
}

export function isTerminalStatus(status: SwapStatus): boolean {
  return ["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(status);
}

export function isActionableStatus(status: SwapStatus): boolean {
  return ["PENDING", "ACCEPTED"].includes(status);
}
