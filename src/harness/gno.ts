import { z } from 'zod';

export const GNO_MAINNET_CHAIN = 'gnoland-1';
export const gnoPublicAddress = z.string().regex(/^g1[023456789acdefghjklmnpqrstuvwxyz]{38}$/);
