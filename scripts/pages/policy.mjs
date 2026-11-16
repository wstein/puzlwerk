// Preview decisions consume GitHub API objects, never event payloads as authority.
export const REPOSITORY = 'wstein/puzlwerk';
export const BUILD_WORKFLOW = '.github/workflows/acceptance-preview.yml';
const positive = value => Number.isSafeInteger(value) && value > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
export function eligible(pr) {
  return Boolean(pr && positive(pr.number) && pr.state === 'open' &&
    Array.isArray(pr.labels) && pr.labels.some(label => label?.name === 'preview') &&
    pr.base?.repo?.full_name === REPOSITORY && pr.head?.repo?.full_name === REPOSITORY && sha(pr.head?.sha));
}
export function currentBuild(pr, run) {
  return Boolean(eligible(pr) && run && positive(run.id) && positive(run.run_attempt) &&
    run.status === 'completed' && run.conclusion === 'success' && run.event === 'pull_request' &&
    run.path === BUILD_WORKFLOW && run.repository?.full_name === REPOSITORY &&
    run.head_repository?.full_name === REPOSITORY && run.head_sha === pr.head.sha &&
    Array.isArray(run.pull_requests) && run.pull_requests.length === 1 && run.pull_requests[0]?.number === pr.number);
}
export function publicationAllowed(gate, verifiedBaseline) {
  return gate === 'true' && verifiedBaseline === true;
}
// A complete, unambiguous list is required; never fall back after a failed run.
export function latestCurrentBuild(pr, runs, complete) {
  if (!eligible(pr) || complete !== true || !Array.isArray(runs) || runs.length === 0) return null;
  const seen = new Set();
  for (const run of runs) {
    if (!run || run.path !== BUILD_WORKFLOW || run.event !== 'pull_request' ||
        run.repository?.full_name !== REPOSITORY || run.head_repository?.full_name !== REPOSITORY ||
        run.head_sha !== pr.head.sha || typeof run.created_at !== 'string' ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(run.created_at) ||
        !Number.isFinite(Date.parse(run.created_at)) || seen.has(run.created_at)) return null;
    seen.add(run.created_at);
  }
  const latest = [...runs].sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
  return currentBuild(pr, latest) ? latest : null;
}
