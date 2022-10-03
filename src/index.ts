import { Probot } from "probot";

const WG_ECOSYSTEM_TEAM_NAME = 'wg-ecosystem';
const DOCS_REVIEWER_BOT_LOGIN = 'electron-docs-reviewer[bot]';

enum ReviewState {
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  NEUTRAL = 'NEUTRAL',
}

export = (app: Probot) => {
  app.on('pull_request_review', async (context) => {
    if (!context.payload.review.body?.startsWith('docs:')) return;

    const userDoingReview = context.payload.review.user.login;

    const ecosystemMembers = await context.octokit.teams.listMembersInOrg({
      org: 'electron',
      team_slug: WG_ECOSYSTEM_TEAM_NAME,
    });

    const ecosystemMemberLogins = new Set(ecosystemMembers.data.map((user) => user.login));
    if (!ecosystemMemberLogins.has(userDoingReview)) return;

    const existingReviews = await context.octokit.pulls.listReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: context.payload.pull_request.number,
      per_page: 100,
    });

    let latestReviewsOnly: typeof existingReviews['data'] = [];
    for (const review of existingReviews.data) {
      if (!review.body.startsWith('docs:') && review.user?.login !== DOCS_REVIEWER_BOT_LOGIN) continue;
      latestReviewsOnly = latestReviewsOnly.filter(tReview => tReview.user?.login !== review.user?.login);
      latestReviewsOnly.push(review);
    }

    let resultantState: ReviewState = ReviewState.NEUTRAL;
    for (const review of latestReviewsOnly) {
      if (review.user && ecosystemMemberLogins.has(review.user.login)) {
        if (review.state === 'CHANGES_REQUESTED') {
          resultantState = ReviewState.CHANGES_REQUESTED;
          break;
        }
        if (review.state === 'APPROVED') {
          resultantState = ReviewState.APPROVED;
        }
      }
    }

    let currentState: ReviewState = ReviewState.NEUTRAL;
    const currentBotReview = latestReviewsOnly.find(review => review.user?.login === DOCS_REVIEWER_BOT_LOGIN);
    if (currentBotReview) {
      currentState = currentBotReview.state === 'CHANGES_REQUESTED' ? ReviewState.CHANGES_REQUESTED : currentBotReview.state === 'APPROVED' ? ReviewState.APPROVED : ReviewState.NEUTRAL;
    }

    if (resultantState === ReviewState.APPROVED && currentState !== resultantState) {
        await context.octokit.pulls.createReview({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          pull_number: context.payload.pull_request.number,
          event: 'APPROVE',
          body: 'Approving on behalf of the Electron Docs Team',
        });
    } else if (resultantState === ReviewState.CHANGES_REQUESTED && currentState !== resultantState) {
        await context.octokit.pulls.createReview({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          pull_number: context.payload.pull_request.number,
          event: 'REQUEST_CHANGES',
          body: 'Requesting changes on behalf of the Electron Docs Team',
        });
    } else if (resultantState === ReviewState.NEUTRAL && currentState !== resultantState && currentBotReview) {
      await context.octokit.pulls.dismissReview({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: context.payload.pull_request.number,
        review_id: currentBotReview.id,
        message: 'Dismissing docs review on behalf of the Electron Docs Team',
      });
    }
  });
};
