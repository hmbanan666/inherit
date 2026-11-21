# Authoring brief for the first React chapter

Build a playable chapter about component state for a JavaScript developer who has used `useState`. Start from [the React repository](https://github.com/facebook/react), choose a revision, and record its commit SHA. Choose the story, scene, player actions, and two connected challenges yourself.

## Player experience

Give the chapter a direct link to a dedicated mode in the existing IDE. On arrival the player can see the scene, edit their implementation, and try the first experiment. Prepare the entire chapter before the player arrives, including checks, hints, and explanations. It must be playable and replayable without an agent session.

Let the player try the same sequence of actions on the reference scene running the selected React revision and on their implementation. When outcomes diverge, show the first action where they differ and the observable result on each side. Accept any implementation that meets the behavioral requirements.

Make the second challenge a new experiment on the first solution. Carry the player's code forward, including a solution that already handles the new case. Let the player request a suggested experiment, an explanation, and finally a worked solution they can continue with.

After each challenge, offer an optional “How React does it” explanation. Answer the question the player just investigated and link to the relevant lines in the pinned React revision.

## Author handoff

Deliver the chapter link, the React revision, and a short record of one end-to-end run. Start with the player's starter code, demonstrate a divergence, make a working change, and enter the second challenge with that same code. Play through its experiment and verify the final behavior. Reopen the chapter for a fresh run and verify that the prepared hints and source links are accessible.

## First playtest

Give the participant the chapter link. After the first challenge, let them decide what to do next without prompting. Watch whether they start the second challenge on their own. Afterwards ask, “What did you want to test?” Count the first loop as successful if they continued to investigate a hunch of their own.
