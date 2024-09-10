import { useState, useCallback } from 'react';
import { useWalletContext } from './use-context';

type DNSResult = {
    address: string;
    domain: string;
};

type DNSResolverHook = {
    resolveDomainToAddress: (domain: string) => Promise<string | null>;
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
            if (!gnoProvider) throw new Error('gnoProvider is not available');

            const response = await gnoProvider.evaluateExpression("gno.land/r/varmeta/demo/v1/domain/resolver", `Resolve("${domain}")`);
            const address = response?.split('"')[1] || '';

            if (!address) throw new Error('Failed to resolve address');

            setResult({ domain, address });
            return address;  // Return the resolved address
        } catch (err) {
            setError((err as Error).message);
            setResult(null);
            return null;  // Return null on failure
        }
    }, [gnoProvider]);


    const resolveAddressToDomain = useCallback(async (address: string) => {
        setError(null);  // Clear previous errors
        try {
            if (!gnoProvider) throw new Error('gnoProvider is not available');

            const response = await gnoProvider.evaluateExpression("gno.land/r/varmeta/demo/v1/domain/resolver", `GetDomainName("${address}")`);
            const domain = response?.split('"')[1] || '';

            if (!domain) throw new Error('Failed to resolve domain');

            setResult({ domain, address });
        } catch (err) {
            setError((err as Error).message);
            setResult(null);  // Clear the result on error
        }
    }, [gnoProvider]);

    return { resolveDomainToAddress, resolveAddressToDomain, result, error };
}

export default useDNSResolver;
