# Design notes

Rulepath started from a pretty familiar experience: sitting down to play a tabletop RPG, knowing the rules are *somewhere* in the book, and spending more time flipping between sections than actually playing.

I like games with interesting procedures, but those procedures aren't always easy to follow at the table. Rules that make perfect sense when you read them from beginning to end can be surprisingly awkward when you're trying to work out what happens next.

I wanted to see what those rules might look like if they were something you could navigate, rather than just read.

## From prose to procedures

The basic idea is to represent rules as flowcharts. Each procedure is made up of steps, decisions, and connections to other procedures. The graph shows how everything fits together, with the relevant rules and references close at hand.

Importantly, Rulepath isn't trying to play the game for you. It doesn't roll dice, make decisions, or track what your character is doing. I like doing those things myself.

Ironsworn and Cairn Second Edition are good examples because they approach rules quite differently. Both work within the same underlying content model, but their procedures have their own shapes and challenges.

## Making the diagrams readable

One of the trickier parts has been getting the diagrams to communicate more clearly than the original prose. Turning a complicated procedure into an equally complicated flowchart doesn't accomplish much.

I settled on a primarily vertical layout, with the main sequence moving downward, branches moving off to the sides, and return paths looping back to earlier steps.

The layout is generated from the connections in the rules, rather than manually arranging each diagram. That keeps things consistent across games, although handling branches and loops has been an interesting engineering problem in its own right.

I also wanted the diagrams to feel like something you could comfortably read. Different treatments help distinguish decisions, actions, and links to other procedures, while the supporting rules sit alongside the flow instead of being hidden behind another screen.

## Following the thread

Cairn's combat procedure highlighted a problem with the initial approach.

Some decisions send you back to an earlier point in the procedure. The connecting lines showed where to go, but on a long diagram, actually following one could be a pain. You'd find yourself tracing a line across the page, then trying to work out exactly where it ended.

The solution was fairly straightforward: make the decision outcomes navigable.

Clicking an outcome takes you to the corresponding step, moves keyboard focus there, and briefly highlights where you've landed. It's a small interaction, but it makes a real difference to how the diagrams feel to use.

The connectors are still useful for understanding the structure. The links just save you from having to follow every line manually.

## Keeping your place

Another thing I wanted to avoid was losing my place whenever I needed to check a rule.

In a physical book, you might keep a finger between the pages while looking something up. Rulepath takes a similar approach: references open in a sheet over the current procedure, so you can check something and return to exactly where you were.

I used Motion for the transitions, alongside native dialogs and browser navigation. The animation is there to make the relationship between the two views feel natural, not to turn every interaction into an event.

Focus, keyboard navigation, and browser history all matter here too. The interface should behave predictably whether you're using a mouse, keyboard, or the browser's Back button.

## Finding the visual direction

I didn't want Rulepath to look like a traditional dashboard, or like a digital version of any particular game's rulebook.

The direction I landed on is more editorial: prominent typography, generous reading space, and a fairly restrained set of surfaces and borders. The vermilion, cyan, and plum palette gives the app its own identity without competing too much with the rules themselves.

Color also helps distinguish paths through a diagram, but it shouldn't be the only way to understand what's happening. Labels, arrows, and layout do that work too.

There's more detail on the palette and the directions I explored in the [color system](color-system.md).

Ultimately, I want Rulepath to feel like a good reference book with the advantages of software. Something that helps me understand the rules, find what I need, and get back to playing.
