// Steps 1 to 9 of the journey (src/journey/slides/T01–T09).

export default {
  t01: {
    intro: 'Riverton, population small, needs a new mayor. Five candidates are standing, and {voters} people will vote.',
    groups:
      'To keep things readable, the voters fall into five groups. Everyone in a group ranks the candidates in exactly the same order, so each group has a spokesperson: Frank speaks for 9 voters, Leo for 7, and so on.',
    rules:
      '<strong>Nobody changes their opinion in this story.</strong> What changes, step by step, is the voting system, and now and then how cleverly a group uses it. Watch who becomes mayor.',
    challenge: "Get to know the voters: open each spokesperson's reasons below ({read} of {total}).",
    success: 'You know Riverton now. Keep these five faces in mind.',
    lesson:
      'Every honest ballot in this guide comes from these five rankings. When the mayor changes, it is because the rules changed, or because someone voted tactically. Never because anyone changed their mind.',
    pickEyebrow: 'Before we count anything',
    pickQuestion: 'Knowing what everyone wants, who <em>should</em> be mayor?',
    noted: "Noted: {name}. We'll come back to your choice at the end.",
  },

  t02: {
    intro:
      'The simplest ballot there is: <strong>mark one name</strong>. The name with the most marks wins, majority or not. This is <strong>plurality</strong>, also called first past the post. The UK, the US, Canada and India elect their parliaments this way.',
    ballot: "Each group marks its favourite. That's all the ballot asks.",
    question: 'Who becomes mayor?',
    wins: '{winner} wins with <strong>{votes} of {total}</strong> votes. That is not a majority: most of Riverton marked someone else.',
    lastQuestion: 'Look at the ballots below. How many voters rank {winner} dead last?',
    challenge: 'Answer the second question.',
    success:
      "Leo's 7, Ana's 6 and Margaret's 3: {voters} voters, more than half the town, would rather have anyone but Erik. Plurality never asked them.",
    lesson:
      "Plurality only reads each ballot's first line and throws the rest away. A candidate with a loyal minority can beat a field of candidates the majority likes better.",
    count: 'The count',
    hint: 'Make a prediction to count the votes.',
  },

  t03: {
    shoes:
      "Put yourself in Leo's shoes. Leo's group loves Amira, but Amira is behind. Leo's second choice is Bruno, and Leo's last choice, Erik, is about to win.",
    compromising:
      'Would you still vote Amira? Voting for a "lesser evil" instead of your favourite is called <strong>compromising</strong>. Under plurality it is often the smart move.',
    challenge:
      "You can now change any group's mark: click a name on their ballot. Stop Erik by changing as few groups as possible, and only in ways those groups would welcome.",
    success:
      '{groups} voted tactically, and Riverton gets {winner}. | {groups} voted tactically, and Riverton gets {winner}.',
    otherFixMargaret: "Margaret's 3 voting Amira would have worked too.",
    otherFixLeo: "Leo's 7 voting Bruno would have worked too.",
    lesson:
      "Plurality punishes honesty: voters whose favourite is behind are better off abandoning them. Over time, support drains towards two big parties, which political scientists call <strong>Duverger's law</strong>. Whoever controls the story of who is \"viable\" (polls, media) controls who gets the tactical votes.",
    eyebrow: 'Plurality count, live',
    deadHeat: 'Dead heat: a tie-break decides.',
  },

  t04: {
    withdraw:
      'Now a different experiment. Nobody changes their ballot, but one candidate <strong>withdraws</strong> before the vote. Every voter who had marked them moves their mark to the next name on their list.',
    spoiler: "A candidate who can't win but still decides who does is called a <strong>spoiler</strong>.",
    challenge: "Withdraw a single candidate so that Bruno, everybody's reliable second choice, becomes mayor.",
    success:
      "Without Amira, Leo's 7 votes go to Bruno, who beats Erik 10 to 9. Without meaning to, Amira was the best thing that happened to Erik's campaign.",
    florida:
      'In the 2000 US presidential election, George W. Bush won Florida, and with it the White House, by 537 votes. Ralph Nader, whose voters mostly preferred Al Gore to Bush, won over 97,000 votes there.',
    lesson:
      'In this election {n} candidate is a spoiler: {list}. Want to beat a rival under plurality? Help a look-alike of theirs get on the ballot. | In this election {n} candidates are spoilers: {list}. Want to beat a rival under plurality? Help a look-alike of theirs get on the ballot.',
    spoilerItem: 'without {spoiler}, {winner} would win',
    separator: '; ',
    eyebrow: 'Plurality count, live',
  },

  t05: {
    intro:
      "France elects its president with a fix for plurality's problem. If nobody wins a majority, the top two come back two weeks later for a <strong>runoff</strong>, and everyone votes again, choosing between just those two.",
    roundOne:
      'Round one is the plurality count you already know: Erik 9, Amira 7. Nobody has a majority, so Erik and Amira go to round two. Each group now marks whichever finalist it ranks higher.',
    question: 'Who wins the runoff?',
    challenge: 'Look at the runoff column on each ballot below and check the count.',
    success: '{winner} wins the runoff {won}–{lost}. Same voters, second system, second mayor.',
    lesson:
      'A runoff can never elect someone a majority would vote against one on one, so Erik, who loses every duel, is safe from winning. But a runoff only ever looks at two names, chosen by a plurality count, with all its flaws.',
    hint: 'Make a prediction to hold round two.',
  },

  t06: {
    tabConverts: 'Trap 1: winning votes',
    tabHome: 'Trap 2: staying home',
    converts:
      "Amira's campaign has a great week: some of Frank's group are won over and now put Amira <em>first</em> (then Erik, Bruno, Camille, Daniel). More first-round votes for the winner. What could go wrong?",
    slider: "Frank's group members who switch to Amira: <strong>{n}</strong> of 9",
    sliderAria: 'Converts',
    challengeConverts: 'Find a number of converts that makes Amira <strong>lose</strong>.',
    successConverts:
      "With 4 converts Erik drops to 5 votes, below Camille's 6, so Amira's runoff opponent is no longer Erik but Camille, and Camille wins it 16–14. Amira lost by gaining votes.",
    home: "Frank's group likes Amira least of all five. Use the − button on Frank's card to keep some of them at home on election day.",
    challengeHome: 'Find a way for some voters to get a better mayor by <strong>not voting</strong>.',
    successHome:
      "With {n} of Frank's group at home, Erik falls behind Camille in round one, Camille beats Amira in the runoff, and Frank's group, who rank Camille third and Amira last, are better off for having stayed home.",
    lesson:
      "A runoff is not <strong>monotonic</strong>: extra support can change who you meet in round two and cost you the race. It also fails <strong>participation</strong>: staying home can pay. And it invites <strong>push-over</strong> tactics: Margaret's 3 voters could back Daniel in round one and give Riverton Daniel, whom they prefer to Amira.",
    notice:
      "{n} of Frank's group now vote Amira > Erik > Bruno > Camille > Daniel; Frank's card shows the {rest} who didn't switch. | {n} of Frank's group now vote Amira > Erik > Bruno > Camille > Daniel; Frank's card shows the {rest} who didn't switch.",
  },

  t07: {
    intro:
      "Why make everyone come back for a second round? Ask for a full <strong>ranking</strong> once, and hold all the rounds at once. That's <strong>instant-runoff voting</strong> (IRV), called ranked-choice voting in the US.",
    count:
      "Count first choices. If nobody has a majority, eliminate the candidate with the fewest, and move each of their ballots to that voter's next choice still standing. Repeat. Australia has elected its House of Representatives this way since 1918.",
    question: 'Who is eliminated first?',
    challenge:
      "Step through the count with <strong>Next round</strong>. On each ballot below, the outlined name is where that group's votes count right now.",
    success:
      "Bruno, then Camille, then Amira are eliminated, and their voters' ballots pile up on Daniel: 21 of 30. Third system, third mayor.",
    lesson:
      'Bruno goes out first because almost nobody ranks Bruno first, although Bruno would beat every rival one on one. Instant runoff reads more of the ballot than plurality, but at each step it still counts only first choices, so a broadly liked candidate with few first choices gets squeezed out. This happened in the 2009 mayoral race in Burlington, Vermont, and the city repealed instant runoff the next year.',
    hint: 'Make a prediction to start the count.',
  },

  t08: {
    intro:
      'You would think that showing up and voting honestly can never hurt you. Under instant runoff it can. Use the − and + buttons on the cards to keep some voters at home and watch the count.',
    challenge:
      "Find a group whose members get a better mayor, by their own honest ranking, when some of them <strong>don't vote</strong>.",
    success:
      'With {stayers} at home, the order of eliminations changes and {winner} wins instead of Daniel. They did better by not voting at all.',
    stayers: "{n} of {name}'s group | {n} of {name}'s group",
    lesson:
      "This is the <strong>no-show paradox</strong>: instant runoff fails <em>participation</em>. Two more traps from the same family: if 2 of Leo's group ranked Daniel first, Daniel would <em>lose</em> (to Camille), and if 3 more people like Margaret turned up, they would also hand the town to Camille, whom they like less than Daniel. Both fall out of how eliminations cascade.",
  },

  t09: {
    intro:
      'Runoffs throw ballots around one name at a time. In 1770 the mathematician Jean-Charles de Borda proposed reading the whole ranking at once: give <strong>points</strong>. With five candidates a first place is worth 4 points, a second 3, then 2, 1 and 0. Most points wins.',
    ballots: "The ballots below show what each group's ranking is worth to each candidate.",
    question: 'Who collects the most points?',
    challenge: 'Compare the count with the ballots.',
    success:
      "Camille is nobody's last choice and in everyone's top three except Margaret's, and edges out Bruno 74 to 72. Fourth system, fourth mayor.",
    lesson:
      "Borda rewards candidates many people find acceptable, even if few love them. Notice that Bruno, who beats every rival one on one, still comes second: points and duels don't agree.",
    eyebrow: 'Borda points',
    hint: 'Make a prediction to add up the points.',
  },
}
