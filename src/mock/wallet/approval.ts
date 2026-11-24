import { ApprovalPolicy } from '../../agent/wallet/constants';
import type { ApprovalHandler } from '../../agent/wallet/port';

/** A simulated user for tests and eval: always approves, or always rejects. */
export const autoApproval =
  (policy: ApprovalPolicy): ApprovalHandler =>
  async () =>
    policy === ApprovalPolicy.Approve;
