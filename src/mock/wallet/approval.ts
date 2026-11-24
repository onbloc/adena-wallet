import { ApprovalPolicy } from '../../agent';
import type { ApprovalHandler } from '../../agent';

/** A simulated user for tests and eval: always approves, or always rejects. */
export const autoApproval =
  (policy: ApprovalPolicy): ApprovalHandler =>
  async () =>
    policy === ApprovalPolicy.Approve;
