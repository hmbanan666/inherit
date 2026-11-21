# Issue tracker

Track issues and specs in `hmbanan666/inherit` using GitHub Issues.

- To publish a ticket or spec, run `gh issue create -R hmbanan666/inherit --title "..." --body-file <path>`.
- To fetch a ticket, run `gh issue view <number> -R hmbanan666/inherit --json number,title,body,labels,comments`.
- Link implementation tickets to their parent spec as GitHub sub-issues.
- Record blockers using GitHub issue dependencies. A ticket is unblocked when all its blockers are closed.
- When closing a ticket, comment with the outcome before closing it.

PRs as a request surface: no.
