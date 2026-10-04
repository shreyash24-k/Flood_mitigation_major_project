interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

/** Dependency-free health probe: proves the Node runtime itself is working. */
export default function handler(_req: unknown, res: Res) {
  return res.status(200).json({
    ok: true,
    runtime: process.version,
    at: new Date().toISOString(),
  });
}
