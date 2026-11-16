import { useCallback, useEffect, useRef, useState } from 'react';
import { RpcError, rpcName } from './rpc.ts';

export { RpcError };

export type CallState<Output> = {
  /** The last successful result. It stays while a refetch runs. */
  data: Output | undefined;
  error: RpcError | undefined;
  /** True until the first result, and again during a refetch. */
  loading: boolean;
  refetch: () => void;
};

/**
 * Calls a procedure when the component mounts and whenever its input changes:
 * `const { data, error, loading } = useCall(rpc.contacts.get, { id })`. It tracks loading
 * state, errors and refetch, and nothing else. Wrap `rpc.*` in a cache if you need one.
 */
export function useCall<Input, Output>(
  procedure: (input: Input) => Promise<Output>,
  ...[input]: undefined extends Input ? [input?: Input] : [input: Input]
): CallState<Output> {
  const name = rpcName(procedure);
  if (!name) {
    throw new Error('useCall takes a procedure from `rpc`, such as `rpc.contacts.get`.');
  }
  const key = JSON.stringify(input ?? null);
  const latest = useRef(procedure);
  latest.current = procedure;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<CallState<Output>, 'refetch'>>({
    data: undefined,
    error: undefined,
    loading: true,
  });

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, loading: true }));
    latest.current(JSON.parse(key) ?? undefined).then(
      (data) => current && setState({ data, error: undefined, loading: false }),
      (error: unknown) =>
        current &&
        setState((previous) => ({
          ...previous,
          error: error instanceof RpcError ? error : new RpcError('INTERNAL', String(error), 0),
          loading: false,
        })),
    );
    return () => {
      current = false;
    };
  }, [name, key, attempt]);

  const refetch = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, refetch };
}
