// Mock PR analysis data – used to simulate AI responses
export const MOCK_PR_DATA = {
    url: '',
    title: 'feat: Add real-time collaboration with WebSocket and conflict resolution',
    author: 'sarah-dev',
    authorAvatar: 'SD',
    repo: 'acme-corp/platform',
    branch: 'feature/realtime-collab → main',
    createdAt: '2 days ago',
    linesAdded: 847,
    linesRemoved: 203,
    filesChanged: 23,
    commits: 14,
    reviewers: ['jsmith', 'alex-k', 'pm-lee'],
    baseProbability: 62,
    description: 'Only partially describes the motivation and impact of changes.',
    hasTests: false,
    testCoverage: 41,
    riskFactors: [
        {
            id: 'loc',
            label: 'High Lines of Code',
            impact: -18,
            severity: 'high',
            description:
                'This PR modifies 847 lines — reviewer jsmith historically rejects 61% of PRs above 400 LOC on the first pass.',
            suggestion: 'Split into atomic PRs: WebSocket setup, conflict resolution, and UI separately.',
        },
        {
            id: 'tests',
            label: 'Missing Test Coverage',
            impact: -14,
            severity: 'high',
            description:
                'Current test coverage is 41%. The team standard is 75%+. Missing edge cases for conflict resolution logic.',
            suggestion: 'Add unit tests for the `resolveConflict()` function and WebSocket reconnect behavior.',
        },
        {
            id: 'desc',
            label: 'Weak PR Description',
            impact: -8,
            severity: 'medium',
            description:
                'The description only lists what changed, not why. Reviewers spend 40% longer reviewing under-described PRs.',
            suggestion:
                'Add motivation section, architecture decision, and link to related RFC or design doc.',
        },
        {
            id: 'complexity',
            label: 'High Cyclomatic Complexity',
            impact: -6,
            severity: 'medium',
            description:
                'The `handleConflict` function scores 24 on cyclomatic complexity (threshold is 10).',
            suggestion: 'Refactor into smaller, single-responsibility handlers.',
        },
        {
            id: 'staleness',
            label: 'Branch Staleness',
            impact: -4,
            severity: 'low',
            description: 'Branch is 12 commits behind main. Merge conflicts likely in auth module.',
            suggestion: 'Rebase on latest main before requesting review.',
        },
        {
            id: 'reviewer_load',
            label: 'Reviewer Workload',
            impact: -3,
            severity: 'low',
            description: 'Primary reviewer jsmith has 7 open review requests. Average response time: 3.2 days.',
            suggestion: 'Tag alex-k as co-reviewer to accelerate unblocking.',
        },
    ],
    suggestions: [
        {
            id: 'add_tests',
            label: 'Add Test Coverage',
            delta: 14,
            description: 'Bring coverage to 75%+ with targeted unit tests.',
            effort: 'Medium',
            effortColor: 'amber',
        },
        {
            id: 'improve_desc',
            label: 'Improve PR Description',
            delta: 8,
            description: 'Add motivation, architecture decision, and design doc link.',
            effort: 'Low',
            effortColor: 'green',
        },
        {
            id: 'reduce_size',
            label: 'Reduce PR Size',
            delta: 12,
            description: 'Split into 3 focused PRs under 300 LOC each.',
            effort: 'High',
            effortColor: 'red',
        },
    ],
};

export function computeProbability(base, activeToggles) {
    let score = base;
    const { addTests, improveDesc, reduceSize } = activeToggles;

    const testDelta = 14;
    const descDelta = 8;
    const sizeDelta = 12;

    if (addTests) score += testDelta;
    if (improveDesc) score += descDelta;
    if (reduceSize) score += sizeDelta;

    return Math.min(99, Math.max(1, score));
}

export function getProbabilityColor(score) {
    if (score >= 75) return { color: '#00ff88', label: 'High', glow: 'shadow-glow-green' };
    if (score >= 50) return { color: '#ffb800', label: 'Moderate', glow: 'shadow-glow-amber' };
    return { color: '#ff3860', label: 'Low', glow: 'shadow-glow-red' };
}

export function getAIExplanation(score, data) {
    if (score >= 75) {
        return `Your PR looks healthy! Test coverage meets standards and the description is clear. Reviewer load is the last friction point — consider tagging an additional reviewer from ${data.repo} to accelerate merge.`;
    }
    if (score >= 50) {
        return `PR is at moderate risk. The ${data.linesAdded} lines added exceed reviewer ${data.reviewers[0]}'s comfort threshold — they reject ${Math.round(61 - (score - 50))}% of PRs this size. Missing tests and a thin description compound the risk.`;
    }
    return `High merge risk detected. ${data.linesAdded} LOC, ${data.testCoverage}% test coverage, and a weak description create a perfect storm. Historical data shows reviewer ${data.reviewers[0]} closes ${Math.round(60 + (50 - score))}% of PRs matching this signature without merging.`;
}
