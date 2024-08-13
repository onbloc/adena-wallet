import { useState, useCallback } from 'react';
import { useWalletContext } from './use-context';

type DNSResult = {
    address: string;
    domain: string;
};

type DNSResolverHook = {
    resolveDomainToAddress: (domain: string) => Promise<void>;
    resolveAddressToDomain: (address: string) => Promise<void>;
    result: DNSResult | null;
    error: string | null;
};

function useDNSResolver(): DNSResolverHook {
    const { gnoProvider } = useWalletContext();
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<DNSResult | null>(null);

    const resolveDomainToAddress = useCallback(async (domain: string) => {
        try {
            const result = await gnoProvider?.evaluateExpression("gno.land/r/demo/domain/resolver", `Resolve("${domain}")`)
            const address = result?.split('"')[1];
            setResult({ domain, address: address || '' });
        } catch (err) {
            setError((err as Error).message);
        }
    }, [gnoProvider]);

    const resolveAddressToDomain = useCallback(async (address: string) => {
        try {
            const result = await gnoProvider?.evaluateExpression("gno.land/r/demo/domain/resolver", `GetDomainName("${address}")`)
            const domain = result?.split('"')[1];
            setResult({ domain: domain || '', address });
        } catch (err) {
            setError((err as Error).message);
        }
    }, [gnoProvider]);

    return { resolveDomainToAddress, resolveAddressToDomain, result, error };
}

export default useDNSResolver;
