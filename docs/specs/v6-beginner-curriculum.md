# TypeScript from zero

> Removed. [ADR 0030](../adr/0030-packs-removed.md) is the record. This file is the old course, not a mode in the game.

An ordered course for someone opening a code editor for the first time. Read each unit from top to bottom. In Learn, preserve the three short text lines and render the example below them as code. The heading supplies the unit for every lesson beneath it. Each lesson gives its stable id, concept, exercise kind, one-line goal, reason and visible effect, the text and example for Learn, the initial contents of main.ts, successive hint rungs and the checks the player sees.

Allow 3–6 minutes per lesson. Budget four minutes for most lessons and six for the final builds, about three and a half hours of play. Aim for a first visible response within thirty seconds. Got it returns focus to the first TODO. Lines beginning with // are comments for the reader. TODO marks where to work; write the instruction on the line below it. Run can be tried repeatedly. A predict task records a choice in Learn before Run, then shows the actual outcome. The TODO still gives the player a purposeful edit.

| Unit | Lessons | Typical minutes |
| --- | ---: | ---: |
| Calls and strings | 4 | 14 |
| Numbers and output | 4 | 15 |
| Variables and names | 6 | 24 |
| Types and the colon | 5 | 20 |
| Return values | 3 | 12 |
| Choices | 7 | 28 |
| Arrays | 5 | 20 |
| Loops | 5 | 22 |
| Your own functions | 5 | 23 |
| Objects, interfaces and the fair capstone | 8 | 37 |
| **Total** | **52** | **215** |

**Scene kit.** Reuse the village sign and speech bubbles for messages, flower beds and baskets for quantities, the scoreboard for numbers and booleans, the path for lamps and robot movement, and the fair for guests and stalls. Change props and labels to make the reason legible before an edit. An “Input card” comment introduces a named reading supplied by the scene. Draw the same name and value on the prop and expose it as a read-only typed global. The robot’s local remaining counter begins from its distance reading. Change the input card when testing a variant and replay the player’s unchanged file. Keep declarations editable wherever writing them is the lesson. Retry restores those inputs. Preserve each successful scene result in the village panorama. Unit landmarks appear once, including on revisit.

**Teaching and checking.** The Learn text below is player copy. Each example illustrates a different input, situation or previously known operation. Every callable named in a goal or card has hover help. Show only APIs already introduced and those explained by the current card. Built-in scene calls use globals. Checks that mention a language construct inspect its role in the running solution and the resulting scene. Accept equivalent names, spacing and sensible values. Variants exercise the same program from fresh fixtures. A harmless incomplete starter can run. A repair that teaches a compiler error quotes the faulty line in a comment so the starter file itself still compiles.

## Unit 1 · Calls and strings

Unit landmark · a painted welcome arch.

### `hello` · A call and a string

**Write** · Give Mila a greeting at the gate.

**Scene.** Village gate. A visitor is waiting. Mila waves and her bubble displays the greeting.

**Learn**

Code gives the game instructions. Lines beginning with // are comments for you. Write your instruction below the TODO comment.<br>
A function is a job with a name. To call it, write its name followed by parentheses.<br>
Words between matching double quotes make one text value, called a string. Give say some words inside its parentheses.

```ts
say("The lantern is lit.")
```

**Starter**

```ts
// TODO: Give the visitor a greeting in Mila's voice.
```

**Hints**

1. Which job lets Mila speak?
2. Put greeting words of your choice between quotes inside the call.

**Checks** · The player calls say with nonblank words · Mila displays those words and waves

### `sign-spaces` · Characters inside quotes

**Fill** · Print the two-word ferry name on the pier sign.

**Scene.** Pier sign. The ticket reads Moon Ferry. Matching the lettering helps passengers board.

**Learn**

A string keeps the spaces between its quotes.<br>
Uppercase and lowercase letters keep their shapes too.<br>
paintSign prints the string you give it on the wooden board.

```ts
paintSign("East Gate")
```

**Starter**

```ts
// TODO: Letter the sign to match the boat ticket.
```

**Hints**

1. Read both words on the ticket.
2. Make the space part of the text you send to the sign.

**Checks** · The sign matches the ticket

### `call-order` · Sequence

**Predict** · Show the two station calls in departure order.

Prediction before Run · After you add the departure call below the boarding call, which message appears first? Choose boarding or departure.

**Scene.** Platform. The flipboard records each announcement in a separate bubble. The train leaves only after boarding.

**Learn**

The game reads ordinary lines from top to bottom.<br>
Each call finishes its job before the next one starts.<br>
Two calls to say make two entries on this station's board.

```ts
say("Morning")
say("Afternoon")
```

**Starter**

```ts
say("All aboard")
// TODO: Announce departure after boarding.
```

**Hints**

1. Predict which message appears first if you add a call here.
2. Keep the boarding call above your departure announcement.

**Checks** · Boarding appears first · Departure appears second

### `bell-lettering` · Spelling function names

**Fix** · Ring the gate bell using the name on its label.

**Scene.** Village arch. A visitor waits beside a silent bell. A correct call swings the bell.

**Learn**

A function name must match the spelling the game knows.<br>
Capital letters count. An unknown name gets an underline in the editor.<br>
ringBell rings the bell. When a job needs no information its parentheses are empty.

```ts
say("Is anyone home?")
```

**Starter**

```ts
// The old instruction read ringbell().
// TODO: Call the job printed on the bell label.
```

**Hints**

1. Compare the old instruction with the bell's brass label.
2. Check the letter at the start of the second word.

**Checks** · The bell swings once


## Unit 2 · Numbers and output

Unit landmark · a planted gate bed.

### `flowers` · Number values

**Write** · Plant three flowers by the gate.

**Scene.** Garden. Three marked holes frame the bare gate. Flowers rise in the filled holes.

**Learn**

A number tells the game how many.<br>
Write digits directly in your code. Quoting digits would give the game text.<br>
plant takes a number and grows that many flowers in this bed.

```ts
plant(2)
```

**Starter**

```ts
// TODO: Fill the marked planting holes.
```

**Hints**

1. Count the marks before you write.
2. Give the planting function a number.

**Checks** · All three holes bloom

### `apple-basket` · Addition

**Fill** · Gather both trees’ apples into one basket.

**Scene.** Orchard. Two trees carry two and three apples. The empty basket fills with their combined harvest.

**Learn**

An expression is a piece of code that gives a value.<br>
Between numbers, + adds their amounts. The sum can go inside a call.<br>
fillBasket puts that many apples in the basket.

```ts
plant(1 + 3)
```

**Starter**

```ts
// TODO: Combine the harvests shown on the two tree labels.
```

**Hints**

1. Read a separate number from each label.
2. Send their sum to the basket.

**Checks** · Both tree counts contribute to the sum · The basket shows five apples

### `score-maths` · Arithmetic with groups

**Write** · Score the full rows and deduct the cracked tile.

**Scene.** Scoreboard. Three rows of four tiles are lit. One cracked tile is crossed out. The board flips to the surviving count.

**Learn**

The * sign multiplies numbers and - takes an amount away.<br>
TypeScript does multiplication before subtraction. Parentheses group an expression when you want it worked out first.<br>
showScore displays a number on the board.

```ts
showScore(2 * 5 - 3)
```

**Starter**

```ts
// TODO: Score the tiles that can still be played.
```

**Hints**

1. Each row has the same number of tiles.
2. Find the whole grid's score before deducting the damage.

**Checks** · Row size and damage enter the calculation · Board shows eleven

### `weigh-ticket` · Console output

**Write** · Print a weighing slip for both picnic baskets.

**Scene.** Scale. The picnic carrier needs a written total for baskets marked 4 and 6. The scale printer mirrors numeric Console output on a paper slip.

**Learn**

`console.log` writes a value to the Console so someone can inspect it.<br>
The dot selects the log job belonging to console. Put the value to record in parentheses.<br>
On this scale each logged number also prints on the slip.

```ts
console.log(7 - 2)
```

**Starter**

```ts
// TODO: Print the combined weight for the picnic carrier.
```

**Hints**

1. Read both basket tags.
2. Give the logging call one calculation.

**Checks** · Console shows the total once · The paper slip reads 10


## Unit 3 · Variables and names

Unit landmark · a cottage nameplate.

### `house-sign` · Naming a value with const

**Write** · Put your chosen name on the cottage sign.

**Scene.** Cottage. The courier needs a name to match to the door. The player’s chosen name appears on the post.

**Learn**

const gives a value a name. Write the name after const, then = and the value.<br>
Choose a name that describes the value. Join words without spaces, as in boatName.<br>
In a later call use the name by itself to read the value you stored.

```ts
const boatName = "Minnow"
say(boatName)
```

**Starter**

```ts
// TODO: Store a name for the courier and paint it on the sign.
```

**Hints**

1. Choose both a code name and the words for the sign.
2. Pass the code name to the sign painter.

**Checks** · A const supplies the sign text · The sign carries your chosen name

### `flag` · Reassigning with let

**Fill** · Change the welcome flag before the parade starts.

**Scene.** Gate. A blue rehearsal flag is on the pole. The parade marshal shows a gold swatch. The flag takes its new colour.

**Learn**

A name made with let can hold a different value later.<br>
To change it, write the same name, = and the new value. Leave let off this second line.<br>
hangFlag raises the colour stored at the instant you call it.

```ts
let message = "Wait"
message = "Come in"
```

**Starter**

```ts
let flagColour = "blue"
// TODO: Match the marshal's parade swatch.
hangFlag(flagColour)
```

**Hints**

1. Look at the swatch beside the flagpole.
2. Give the existing variable a fresh value before it is used.

**Checks** · The reassigned variable supplies the flag colour · A gold flag flies

### `fixed-ticket` · Choosing const or let

**Fix** · Keep the printed ticket and update the platform board.

**Scene.** Platform. Printed tickets say West. A diversion sends passengers East. The ticket stays on display beside the changed sign.

**Learn**

A const keeps its first assignment. Assigning again makes the editor report an error.<br>
Use a separate let when one copy needs to change.<br>
Starting the copy from a const reads its value at that moment.

```ts
const original = 4
let remaining = original
remaining = 3
```

**Starter**

```ts
const ticket = "West"
// TODO: Start the board from the ticket, then apply the East diversion.
// TODO: Paint the board with the revised direction.
```

**Hints**

1. Which name must keep the printed direction?
2. Give the board its own changeable copy before repainting.

**Checks** · Ticket remains West · A reassigned copy paints East

### `banner-words` · Joining text

**Write** · Put the team name and its motto on one banner.

**Scene.** Scoreboard. The two strings on the team cards must fit one ribbon. A space separates them on the ribbon.

**Learn**

Between two strings, + joins their text in order.<br>
It adds no spaces. Include a space in a string where you need one.<br>
You can join several pieces in the same expression.

```ts
say("North" + " " + "Gate")
```

**Starter**

```ts
const team = "Otters"
const motto = "swim fast"
// TODO: Join the cards legibly on the banner using paintSign.
```

**Hints**

1. Keep the names of both pieces in your expression.
2. Place a space between them.

**Checks** · Both cards supply the lettering · Ribbon reads Otters swim fast

### `score-caption` · Template strings

**Write** · Label the lane number on the start sign.

**Scene.** Robot track. A marshal holds up a lane number. Its label appears on the sign and follows a changed number.

**Learn**

Backticks mark a template string. It can include values inside its text.<br>
Write a dollar sign and braces around the name or expression to insert.<br>
The inserted number becomes part of the finished string.

```ts
const stops = 4
say(`Stops: ${stops}`)
```

**Starter**

```ts
// Input card: lane is 3.
// TODO: Paint a Lane label followed by a space and the lane number.
```

**Hints**

1. Begin and end the text with backticks.
2. Put the lane variable inside the insertion braces.

**Checks** · The sign reads Lane 3 · Changing lane to 2 updates the label

### `morning` · Writing a named routine

**Write** · Ring the bell and open the shutters together.

**Scene.** Cottage. The bell wakes the household and the opening shutters show someone heard. One morning routine performs both jobs.

**Learn**

You can give a job of your own a name with function.<br>
Put empty parentheses after its name and place its instructions inside braces. That describes the job.<br>
Write its name with parentheses on another line to run it. openShutters swings the windows open.

```ts
function cheer() {
  say("Hooray!")
}
```

**Starter**

```ts
// TODO: Write one morning routine for the bell and shutters.
// TODO: Run your routine.
```

**Hints**

1. Group the two actions inside the same pair of braces.
2. Call the name you chose after its definition.

**Checks** · One player function runs both actions · Bell rings before shutters open


## Unit 4 · Types and the colon

Unit landmark · a typesetter’s kiosk.

### `ticket-type` · The colon and string annotations

**Fill** · Label the ferry destination as text and print it.

**Scene.** Pier. The typesetter wants a text field for a destination. The destination appears on the kiosk sign.

**Learn**

A type describes which values fit a spot in your code.<br>
A colon after a variable name introduces its type. string means text in quotes.<br>
The = still supplies the particular value.

```ts
const bird: string = "wren"
```

**Starter**

```ts
// TODO: Give the pier's destination a text annotation and paint its name.
```

**Hints**

1. The ferry is bound for Cove.
2. Put the type between the variable name and the equals sign.

**Checks** · The destination has a string annotation · Cove appears on the sign

### `number-tag` · Number annotations

**Write** · Give the seed tray a numeric capacity and fill it.

**Scene.** Garden. A seed tray is stamped with six cells. Six shoots appear when the declared capacity reaches the planter.

**Learn**

number is the type for values you can do arithmetic with.<br>
An annotation goes after the name whether the value is text or a number.<br>
Pass the named capacity into the planting job.

```ts
const wheels: number = 2
```

**Starter**

```ts
// TODO: Record the tray's marked capacity with its type and plant that many.
```

**Hints**

1. Find the cell count on the rim.
2. Write its digits after the equals sign.

**Checks** · Capacity is annotated as number · All six cells sprout

### `signal-bit` · Booleans

**Write** · Switch on the green crossing signal.

**Scene.** Path. A duck family waits for a safe crossing. setSignal lights green for true and red for false.

**Learn**

A boolean has exactly two values, true and false.<br>
Write either word without quotes. Its type annotation is boolean.<br>
setSignal takes a boolean and sets the crossing lamp.

```ts
const sleepy: boolean = false
```

**Starter**

```ts
// TODO: Store the crossing permission as a typed value and signal it.
```

**Hints**

1. The ducks have permission to cross.
2. Read your annotated permission into the signal call.

**Checks** · A boolean variable drives the signal · The green lens lights

### `type-slip` · Reading a type error

**Fix** · Repair the rejected score ticket.

**Scene.** Scoreboard. A quoted score jams the reader. A numeric replacement prints a valid score of eight.

**Learn**

Try the rejected ticket in the editor. A red underline marks the part it cannot accept.<br>
In “string is not assignable to number”, string is what you gave and number is what the slot expects.<br>
Read the types, inspect the value, then run the repaired line.

```ts
// A label expects text here.
const gate: string = "4"
```

**Starter**

```ts
// Rejected ticket: const points: number = "8"
// TODO: Repair the ticket as a typed score and show it on the board.
```

**Hints**

1. Compare the quotes on the rejected ticket with its annotation.
2. Keep the annotation and use a value of the expected type.

**Checks** · The repaired score has the expected type · Board prints 8

### `two-inks` · Literal unions

**Fill** · Print the inspector’s approved ink on the sign.

**Scene.** Kiosk. The ink tin bears a blue seal. The sign displays the ink name when the inspector's selection is recorded.

**Learn**

A type can list the exact text values it accepts.<br>
Write the quoted alternatives with a vertical bar between them. This is a union.<br>
A variable with that annotation accepts either listed value.

```ts
let side: "east" | "west" = "west"
```

**Starter**

```ts
// TODO: Define an ink choice limited to blue or gold and print the inspector's choice.
```

**Hints**

1. Use both tin names in the annotation.
2. Read the sealed tin for this sign's value.

**Checks** · Ink is limited to the two permitted strings · The sign reads blue


## Unit 5 · Return values

Unit landmark · an orchard counting table.

### `basket-reading` · Capturing a result

**Write** · Copy the basket’s live count to the scoreboard.

**Scene.** Orchard. The counter faces away from the audience. The scoreboard repeats the basket count, including after a new harvest.

**Learn**

Some functions give a value back to the caller. This value is the result.<br>
basketCount reads the number of apples in the basket. Empty parentheses ask it to take a reading now.<br>
Put a call after = to keep its result in a const, then use that name on the next line.

```ts
const reading = basketCount()
console.log(reading)
```

**Starter**

```ts
// TODO: Take one reading for the audience and display the saved count.
```

**Hints**

1. Read from the basket before updating the board.
2. Give showScore the name holding the result.

**Checks** · One reading supplies the board · Counts 4 and 7 both display correctly

### `rain-reading` · Boolean results

**Predict** · Show the weather sensor’s reading on the rain lamp.

Prediction before Run · With rain falling, will the sensor send true or false?

**Scene.** Garden. A gardener under the awning cannot see the sky. The sensor's lamp shows whether rain is falling.

**Learn**

A function can give back a boolean just as it can give back a number.<br>
isRaining reads the sky and returns true in rain and false under clear skies.<br>
A saved boolean can go straight into a job that takes a boolean.

```ts
const damp = isRaining()
console.log(damp)
```

**Starter**

```ts
// TODO: Read the weather sensor into a name and drive the rain lamp.
```

**Hints**

1. Predict the reading from the clouds in the scene.
2. Use setSignal to display the saved reading.

**Checks** · Rain lights the lamp · Clear sky turns it off

### `spare-seat` · Returning from your own function

**Write** · Show how many seats remain after one reservation.

**Scene.** Picnic. One place at a table is reserved. A chalkboard displays the available places from the table card.

**Learn**

Inside your own function, return sends one value back and ends the call.<br>
The caller chooses what to do with that value.<br>
A function can read a named value declared outside its braces.

```ts
function pair() {
  return 1 + 1
}
```

**Starter**

```ts
// Input card: capacity is 5.
// TODO: Write a function returning the seats left after the reservation.
// TODO: Store its result and show the number.
```

**Hints**

1. Subtract the reserved place inside the function.
2. Call your function and pass the saved answer to showScore.

**Checks** · A returned result supplies the chalkboard · Tables of 5 and 8 show 4 and 7


## Unit 6 · Choices

Unit landmark · a sheltered picnic table.

### `picnic-threshold` · Comparisons

**Write** · Light the picnic signal when three apples can be shared.

**Scene.** Picnic. Three plates wait beside the basket. The signal lights only when there is enough fruit for everyone.

**Learn**

Comparisons ask questions about values. They give a boolean back.<br>
Use > for greater than, < for less than, and >= or <= to include equality. Use === to ask if two values match.<br>
You can save a comparison and give its answer to setSignal.

```ts
const crowded = 8 > 6
```

**Starter**

```ts
const apples = basketCount()
// TODO: Signal whether there is at least one apple per plate.
```

**Hints**

1. Include the basket with exactly three apples.
2. Compare the reading to the number of plates.

**Checks** · The signal is off at two · It lights at three and four

### `weather-watch` · An if block

**Write** · Open the canopy when rain reaches the path.

**Scene.** Path. The folded canopy shelters walkers when the sky turns grey. In sunshine its ropes stay still.

**Learn**

if uses a boolean to decide whether to run some lines.<br>
Put the question in parentheses and the actions inside braces.<br>
openCanopy pulls the shelter across the path.

```ts
if (2 < 3) {
  ringBell()
}
```

**Starter**

```ts
const raining = isRaining()
// TODO: Pull out the shelter when the path needs it.
```

**Hints**

1. Ask the if to read the weather value.
2. Keep the canopy action inside the braces.

**Checks** · Rain opens the shelter · Clear sky leaves the ropes still

### `weather` · Choosing with else

**Fill** · Match the shelter to the weather in either direction.

**Scene.** Path. The keeper may arrive to find the canopy in either position. The ropes extend in rain and fold back in sun.

**Learn**

An else gives an if another path when its question is false.<br>
Write else after the closing brace and put the other action in a new pair of braces.<br>
foldCanopy draws the cover back.

```ts
if (1 > 2) {
  say("High")
} else {
  say("Low")
}
```

**Starter**

```ts
if (isRaining()) {
  openCanopy()
}
// TODO: Retract the canopy in the other weather.
```

**Hints**

1. Attach the other path to the existing choice.
2. Use the job that folds the cover.

**Checks** · Rain keeps walkers covered · Sunshine folds an open canopy

### `podium` · A third outcome

**Write** · Label each podium lane with its medal.

**Scene.** Scoreboard. Runners in positions 1, 2 and 3 look for gold, silver and bronze labels. The board flips to the medal for the lane.

**Learn**

else if asks another question after the first answer was false.<br>
Only the first matching branch runs. A final else catches the remaining case.<br>
Test the most specific cases before that last branch.

```ts
const level: number = 2
if (level < 1) {
  say("Below")
} else if (level === 1) {
  say("Level")
} else {
  say("Above")
}
```

**Starter**

```ts
// Input card: position is 2.
// TODO: Paint the medal for this finishing position.
```

**Hints**

1. Test first and second place separately.
2. Use the remaining path for third.

**Checks** · The middle branch awards silver · First and third show gold and bronze

### `two-keys` · Both conditions with &&

**Write** · Open the start signal only when both judges are ready.

**Scene.** Robot track. Two flags indicate readiness. The robot sees a green start light only when both flags are up.

**Learn**

The && operator joins two boolean questions.<br>
Its answer is true when both sides are true.<br>
One lowered flag is enough to hold the start.

```ts
const bothLit = true && false
```

**Starter**

```ts
// Input card: leftReady is true.
// Input card: rightReady is false.
// TODO: Drive the start signal from both judge flags.
```

**Hints**

1. Try the case where just one judge is ready.
2. Combine the two names into one boolean for setSignal.

**Checks** · Both ready starts the race · Every other pair holds the start

### `either-bell` · Either condition with ||

**Write** · Light the pond alarm when either gate opens.

**Scene.** Pond. Two gates keep ducklings away from the road. Opening either gate makes the warning lens glow.

**Learn**

The `||` operator reads as “or”.<br>
It gives true when at least one side is true, including when both are true.<br>
When both sides are false the result is false.

```ts
const weekend = false || true
```

**Starter**

```ts
// Input card: nearOpen is false.
// Input card: farOpen is true.
// TODO: Use the gate readings to drive the warning lens.
```

**Hints**

1. A single open gate already needs a warning.
2. Pass the combined readings to setSignal.

**Checks** · Either or both gates light the lens · Two closed gates clear it

### `quiet-light` · Negation

**Write** · Show the quiet light while the bell is silent.

**Scene.** Cottage. A sleeping child needs a quiet indicator. The lens is green between rings and dark during a ring.

**Learn**

A leading ! flips a boolean.<br>
It changes true to false and false to true.<br>
You can put it directly in front of a variable name.

```ts
const ready = !false
```

**Starter**

```ts
// Input card: ringing is true.
// TODO: Signal when the room is quiet.
```

**Hints**

1. The lens and the ringing have opposite values.
2. Flip the reading before you send it to the lens.

**Checks** · Silent lights green · Ringing blanks the lens


## Unit 7 · Arrays

Unit landmark · a rack of festival flags.

### `flag-rack` · Array literals

**Write** · Load three flags onto the parade rack in parade order.

**Scene.** Parade. A painted pattern shows gold, blue, gold. Three rack hooks display the list the player sends.

**Learn**

An array holds a sequence of values in order.<br>
Write square brackets around the values and separate neighbours with commas. A repeated value gets its own place.<br>
rackFlags hangs the colours from an array of strings, left to right.

```ts
const boats = ["Pip", "Rose"]
```

**Starter**

```ts
// TODO: Store the parade pattern as a list and hang it on the rack.
```

**Hints**

1. Read the pattern across the hooks.
2. Give rackFlags the name of the entire list.

**Checks** · A single array feeds the rack · All three flags match the pattern

### `duck-index` · Reading an index

**Write** · Call the second duck to the feeding step.

**Scene.** Pond. The three duck tags line up beside a feeding step. The duck whose name Mila says waddles forward.

**Learn**

An index is a position in an array. The first position is numbered zero.<br>
Write the index inside square brackets immediately after the array name.<br>
The result is that one value, which can be used like any other string.

```ts
const shades = ["gold", "blue"]
paintSign(shades[0])
```

**Starter**

```ts
// Input card: queue is ["Dot", "Fern", "Pip"].
// TODO: Call the duck in the second queue position.
```

**Hints**

1. Count positions starting from zero.
2. Give say the value read from the queue.

**Checks** · The second duck reaches the step · A reordered queue calls its new second duck

### `queue-length` · Length

**Predict** · Show the waiting queue size above the landing.

Prediction before Run · With three names on the queue card, will the board show 2 or 3?

**Scene.** Pier. People need to know how many are ahead. The counter follows the queue even when the pier is empty.

**Learn**

An array keeps a count called length.<br>
A dot followed by length reads the count. This is a value, so it needs no parentheses.<br>
An empty array has a length of zero.

```ts
const boats = ["Pip", "Rose"]
console.log(boats.length)
```

**Starter**

```ts
// Input card: waiting is ["Mila", "Jo", "Bo"].
// TODO: Display how many names are waiting.
```

**Hints**

1. Predict the count before pressing Run.
2. Use the list's count for the scoreboard.

**Checks** · Board matches the queue · Empty pier shows zero

### `extra-flag` · Appending with push

**Fill** · Add the late float’s flag at the end of the rack.

**Scene.** Parade. A late float carries a blue pennant. Existing flags keep their places and one new flag appears at the right.

**Learn**

push is a job belonging to an array. It adds one value at the end.<br>
Call it with a dot, the word push, and the new value in parentheses.<br>
The same array now has another entry. A const can still name this array as its contents change.

```ts
const names = ["Bo"]
names.push("Jo")
```

**Starter**

```ts
const flags = ["gold", "gold"]
// TODO: Add the pennant from the late float.
rackFlags(flags)
```

**Hints**

1. Work on the existing array before the rack is filled.
2. Append just the late float's colour.

**Checks** · Original flags stay in order · A blue flag hangs on the last hook

### `typed-tray` · Typed arrays

**Write** · Load only numeric weights onto the weighing tray.

**Scene.** Scale. Its four pockets are labelled 2, 4, 1 and 3. Loading the weights lowers each pocket in turn.

**Learn**

Brackets after a type mean an array whose entries have that type.<br>
number[] accepts numeric entries. string[] accepts words.<br>
loadWeights takes a number array and lays the weights into the tray in order.

```ts
const labels: string[] = ["tea", "jam"]
```

**Starter**

```ts
// TODO: Make a typed list from the pocket labels and load the tray.
```

**Hints**

1. Read the marks from the left.
2. Give the whole list to loadWeights.

**Checks** · The tray list is annotated for numbers · Each pocket holds its marked weight


## Unit 8 · Loops

Unit landmark · a lit path to the fair.

### `neighbours` · Visiting each entry with for…of

**Write** · Greet every neighbour on the path.

**Scene.** Village. Neighbours arrive in the order on the guest card. greet invites one named neighbour into view.

**Learn**

A loop runs its body more than once.<br>
In for (const item of items), the name before of holds one entry at a time from the list after of.<br>
Put the work for that entry inside braces. When the list ends, the loop ends.

```ts
for (const word of ["Go", "Team"]) {
  say(word)
}
```

**Starter**

```ts
// Input card: visitors is ["Mila", "Ren", "Jo"].
// TODO: Invite each listed neighbour onto the path.
```

**Hints**

1. Choose a name for one visitor.
2. Inside the braces give greet that one name.

**Checks** · Guests arrive once in card order · A shorter card invites only its names

### `path-lamps` · A counted for loop

**Write** · Light all five lamps in path order.

**Scene.** Path. Lamps are numbered from one beside the gate to five beside the fair. Each lit pool leads to the next.

**Learn**

A counted for loop has three parts inside parentheses, separated by semicolons.<br>
First make a counter with let. In the middle ask whether another turn should run. Last, update the counter for the next turn.<br>
Use the changing counter in the body. lightLamp takes the number printed on a lamp.

```ts
for (let count = 2; count > 0; count = count - 1) {
  showScore(count)
}
```

**Starter**

```ts
// TODO: Walk the numbered lamps from the gate to the fair and light each one.
```

**Hints**

1. Start at the number nearest the gate.
2. Include the last lamp, and move forward one number after each turn.

**Checks** · A counter visits lamps 1–5 in order · Five separate pools of light appear

### `robot-walk` · A while loop

**Write** · Walk the robot until it reaches the dock.

**Scene.** Robot track. A distance card gives steps to the dock. Each step moves the robot one square closer.

**Learn**

while repeats a block for as long as its question is true.<br>
Test the distance before stepping. Change the value in the block so the loop can finish.<br>
step moves the robot one square. With zero distance it can stay put.

```ts
let tickets = 2
while (tickets > 0) {
  tickets = tickets - 1
}
```

**Starter**

```ts
// Input card: distance is 4.
let remaining = distance
// TODO: Walk to the dock and keep track of the distance left.
```

**Hints**

1. Keep stepping only while a positive distance remains.
2. Reduce the remaining distance on each turn.

**Checks** · Distances one and four stop at the dock · Zero takes no steps

### `lantern-filter` · A choice inside a loop

**Write** · Light only the numbered lamps listed above the flood line.

**Scene.** Path. A tide mark lies between lamp two and lamp three. Only listed lamps on dry ground should glow.

**Learn**

A loop can contain an if block.<br>
The loop visits each entry. The if tests that particular entry and chooses whether to act.<br>
Keep the action inside both pairs of braces to test each lamp separately.

```ts
for (const name of ["Jo", "Ren"]) {
  if (name === "Jo") {
    greet(name)
  }
}
```

**Starter**

```ts
const lampNumbers = [1, 3, 2, 5]
// TODO: Visit the list and light the dry lamps above number two.
```

**Hints**

1. Visit even the entries that stay dark.
2. Check the current number before calling lightLamp.

**Checks** · Listed lamps above two glow · Wet and unlisted lamps stay dark

### `cargo-total` · Accumulating a total

**Write** · Weigh the entire delivery on one scoreboard.

**Scene.** Scale. Several sacks arrive together. The scale pointer swings to the combined weight and returns to zero for an empty delivery.

**Learn**

An accumulator is a variable that keeps a running result.<br>
Start a sum at zero before the loop. On each turn add the current entry to the previous total.<br>
After the loop the total includes every entry, even when the list was empty and the total stayed zero.

```ts
let miles = 3
miles = miles + 2
```

**Starter**

```ts
// Input card: weights is [2, 5, 1].
// TODO: Build up the delivery weight and display the final total once.
```

**Hints**

1. Give the total a name outside the loop.
2. Update it inside, then call showScore after the closing brace.

**Checks** · Every sack contributes once · An empty delivery displays zero


## Unit 9 · Your own functions

Unit landmark · a ribbon-making stall.

### `flower-row` · Parameters and arguments

**Write** · Plant each window box from its size card.

**Scene.** Garden. Two boxes have different widths. On this bench each plant call fills the next box, so the same job must handle two sizes.

**Learn**

A parameter names information a caller gives your function. Write it between the parentheses in the definition.<br>
In TypeScript put a colon and the expected type after that name. Use the parameter inside the body.<br>
An argument is the actual value in a call. Two calls can give the same parameter different values.

```ts
function announce(word: string) {
  say(word)
}
```

**Starter**

```ts
// TODO: Write a planting job that takes a box's width.
// TODO: Use it for the two-cell box and then the four-cell box.
```

**Hints**

1. Choose a number parameter for one width.
2. Call your own function for each signed box.

**Checks** · Both calls use one planting function · Boxes bloom with two and four flowers

### `ribbon-pairs` · Two typed parameters

**Write** · Hang the right number of ribbons for each window plan.

**Scene.** Stall. There are plans for three windows with two ribbons each and two windows with four each. The rails display six and eight ribbons.

**Learn**

A function can ask for two pieces of information. Give each parameter its own name and type, separated by a comma.<br>
When you call it, arguments fill those places from left to right.<br>
hangRibbons hangs a count on the next rail. Work out that count from the two numbers.

```ts
function welcome(first: string, last: string) {
  say(first + " " + last)
}
```

**Starter**

```ts
// TODO: Write one function that dresses a rail from its window and ribbon counts.
// TODO: Run both window plans.
```

**Hints**

1. Name one parameter for each number on a plan.
2. Multiply the parameters inside the job you reuse.

**Checks** · Both rails use one two-parameter job · The rails show six and eight

### `signed-result` · Return type annotations

**Write** · Return the number of pegs needed for a double rack.

**Scene.** Stall. A rack-maker cuts two pegs per hook. The requested hook count changes and the board shows how many pegs to cut.

**Learn**

A colon after the closing parenthesis declares what a function returns.<br>
A function marked number must send a number back on every path that reaches its end.<br>
The caller can keep that returned number and display it.

```ts
function label(): string {
  return "North"
}
```

**Starter**

```ts
// Input card: hooks is 4.
// TODO: Write a function with a numeric input and declared numeric result.
// TODO: Show the returned peg count.
```

**Hints**

1. The parameter annotation belongs inside the parentheses.
2. Put the result annotation outside and return the doubled count.

**Checks** · A declared numeric result feeds the board · Four and seven hooks need eight and fourteen pegs

### `arrow-tag` · Arrow functions

**Write** · Make reusable name tags for the red team.

**Scene.** Scoreboard. Two runners need tags prefixed Red and a space. The sign records each finished tag.

**Learn**

A function can be stored in a const. Write its parameters in parentheses, then => and its body.<br>
With a single expression after the arrow, the function returns that expression’s value.<br>
Call the name holding the function just as you call a named function.

```ts
const double = (n: number) => n * 2
```

**Starter**

```ts
const runners = ["Bea", "Pip"]
// TODO: Write a tag-making arrow function.
// TODO: Print a tag for each runner using paintSign.
```

**Hints**

1. Give your function one text parameter.
2. Use the value it returns for every runner on the list.

**Checks** · A reusable arrow makes the tags · Signs show Red Bea and Red Pip

### `two-jobs` · Calling one helper from another

**Write** · Build a gate announcer that uses your tag maker.

**Scene.** Village gate. The greeter needs a reusable way to create a Guest label and speak it. Both arrivals get a personalised announcement.

**Learn**

One player function can call another.<br>
Let the first function build a value. Inside the second, save that result and use it in an action.<br>
The outer call describes a whole job while each definition stays small.

```ts
function bell() {
  ringBell()
}
function wake() {
  bell()
}
```

**Starter**

```ts
// TODO: Write a helper that returns Guest followed by a space and a name.
// TODO: Write a greeter that uses the helper, then announce Uma and Sol.
```

**Hints**

1. Give each job its own name.
2. The announcement job can ask the label job for the words to say.

**Checks** · The greeter calls the label helper · Both guests hear their own label


## Unit 10 · Objects, interfaces and the fair capstone

Unit landmark · the open village fair.

### `stall-card` · Object literals

**Write** · Give the stall a card with its name and seat count.

**Scene.** Fair. An empty cardholder has spaces for name and seats. postCard copies both fields onto the stand.

**Learn**

An object keeps related values under names called properties.<br>
Inside braces, write a property name, a colon and its value. Separate properties with commas.<br>
postCard displays a card with a name field for text and a seats field for a number.

```ts
const boat = { name: "Pip", decks: 2 }
```

**Starter**

```ts
// TODO: Build and post a card for Kites with three seats.
```

**Hints**

1. Read the field names on the empty cardholder.
2. Give postCard the object you made.

**Checks** · One object supplies both fields · Stand reads Kites with three seats

### `seat-field` · Reading a property

**Fill** · Show the seat count from the booking card.

**Scene.** Fair. A steward at the gate can see a scoreboard but cannot read the tiny booking card. The board mirrors its seats field.

**Learn**

A dot after an object's name lets you read one property.<br>
Write the property name to the right of the dot. The result has that property's type.<br>
Use the number you read in a score call.

```ts
const boat = { name: "Pip" }
say(boat.name)
```

**Starter**

```ts
// Input card: booking is { name: "Tea", seats: 4 }.
// TODO: Display the booked seats for the steward.
```

**Hints**

1. Pick the property that contains a number.
2. Read it from booking and give it to showScore.

**Checks** · The board follows the seats field · A changed booking updates the board

### `guest-shape` · Interfaces

**Write** · Describe a guest card and post the first booking.

**Scene.** Fair. The clerk needs a reusable form for names and party sizes. The first accepted card hangs beside the ledger.

**Learn**

An interface gives a name to an object shape. Put its property names and types inside braces, one per line.<br>
The interface describes fields. A separate object supplies actual values.<br>
Use your interface name after a colon to check a booking against the form.

```ts
interface Lamp {
  lit: boolean
}
```

**Starter**

```ts
// TODO: Describe a Guest with a name and seats.
// TODO: Use that form for Sol's booking for two and post the card.
```

**Hints**

1. Choose a text type for a name and a numeric type for seats.
2. Annotate the object with your interface name.

**Checks** · A Guest interface checks the booking · Sol's card shows two seats

### `guest-helper` · Objects as parameters

**Write** · Give the usher a reusable job for calling a guest’s name.

**Scene.** Fair. The usher receives a whole card from the clerk. Only the guest’s name belongs in the speech bubble.

**Learn**

A function parameter can use an interface as its type.<br>
The caller passes one whole object. Inside the function use a dot to pick the field the job needs.<br>
Two cards with the same shape can go through the same job.

```ts
interface Lamp {
  lit: boolean
}
function display(lamp: Lamp) {
  setSignal(lamp.lit)
}
```

**Starter**

```ts
interface Guest {
  name: string
  seats: number
}
const card: Guest = { name: "Fern", seats: 2 }
// TODO: Write an usher function for a guest card, then call it.
```

**Hints**

1. Give the function a Guest parameter.
2. Read the name inside the function when you call greet.

**Checks** · The helper accepts a Guest · The named visitor walks in

### `guest-ledger` · Arrays of objects

**Write** · Post every booking from the fair ledger.

**Scene.** Fair. The ledger arrives as several cards at once. Each booking becomes a visible card on the rail.

**Learn**

An array can hold objects, including objects checked by an interface.<br>
The game supplies the Guest shape you just practised. Write Guest[] for a list of Guest cards. The fair’s guests() function returns the booked cards in arrival order.<br>
In a for…of loop the name for each entry now holds an entire card.

```ts
const boats = [{ name: "Pip" }, { name: "Rose" }]
say(boats[0].name)
```

**Starter**

```ts
// TODO: Read the booking list and post every card in order.
```

**Hints**

1. Keep the returned list in a const.
2. Give postCard one entry per turn.

**Checks** · Every booking appears in order · An empty ledger posts nothing

### `fair-signs` · Build a sign printer

**Write** · Print one named seat sign for every fair stall.

**Scene.** Fair build 1. Stallholders need signs in the form Tea 4 for a card with name Tea and seats 4. The sign rail fills in booking order.

**Learn**

Start by choosing the input and output of your sign maker.<br>
One card carries everything the sign needs. Your function can return finished text while a loop handles the queue.<br>
Try a one-card ledger first and read what actually appears on the rail.

```ts
const label = `Lane ${2}`
```

**Starter**

```ts
// TODO: Write a function that turns a Guest card into a sign.
// TODO: Use it to paint every booking's sign.
```

**Hints**

1. Choose a Guest parameter and a string result.
2. Put the name and seat count on either side of one space.

**Checks** · One helper formats each card · Signs match both the single and mixed ledgers

### `fair-tables` · Build a seating calculator

**Write** · Set the seat counter from all bookings that need places.

**Scene.** Fair build 2. Standing guests have zero seats. Seated bookings share a bench and the steward needs the total on the board.

**Learn**

Decide which value you need to carry from one turn of your loop to the next.<br>
A function can receive the whole list and return a single number.<br>
Think through an empty ledger before you decide where the total starts.

```ts
const empty: number[] = []
showScore(empty.length)
```

**Starter**

```ts
// TODO: Write a function that totals the seats in a Guest list.
// TODO: Read the ledger and display the result for the steward.
```

**Hints**

1. Use an array of Guest as the parameter type.
2. Add each card's seats and return after the loop has finished.

**Checks** · A function returns the ledger total · Mixed and empty ledgers show their exact totals

### `fair-opening` · Build the opening ceremony

**Write** · Open booked stalls and raise the banner for a seated fair.

**Scene.** Fair build 3. Each booking with seats needs a named stall. The village raises a banner only when at least one stall opens. The final panorama shows the gathered guests.

**Learn**

Plan the ceremony in two parts. Decide what one card needs, then decide what the whole fair earned.<br>
Your function can use comparisons, choices and a count to take both decisions from the same ledger.<br>
openStall takes the stall name. hangBanner raises the welcome banner once.

```ts
if (basketCount() > 0) {
  ringBell()
}
```

**Starter**

```ts
// TODO: Write a ceremony function for a Guest list.
// TODO: Open stalls for seated bookings and raise the banner if any open.
// TODO: Run the ceremony on today's ledger.
```

**Hints**

1. Try a ledger of standing guests before the mixed one.
2. Track openings as you go, then make the banner decision after the loop.

**Checks** · Exactly the seated guests get stalls in order · The banner rises once for a nonempty seated fair
