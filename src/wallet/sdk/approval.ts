import { ApprovalPolicy } from '../constants';
import type { ApprovalHandler } from './types';

/** A simulated user for tests and eval: always approves, or always rejects. */
export const autoApproval =
  (policy: ApprovalPolicy): ApprovalHandler =>
  async () =>
    policy === ApprovalPolicy.Approve;
