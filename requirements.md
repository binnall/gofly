# Objective
Static web application that will be used to keep a tally of overall golf scores for a group of friends. The idea is that the app will enable two types of users Admins and users. Users will be able to log in and see a running total of stableford scores.

The app will support a "season".

A user can create a new "match" whereby the scores are captured. This will need to capture the stableford score, the player, the 

Each player will be given a login that works on a surname and pincode.

A match is a round of golf that the players played in.

# Website features

- A leaderboard is presented that lists the running total stableford points, gross score, net score and number of wins based on the results from a match.
- Players can create a match
- Players can add the players to a match
- The handicaps of the player is captured during match creation
- Players can only be added if they have an account
- Admins can create a new player and set a pincode
- Players can add the data required
- Players can log in with their surname and a pincode that is set by the admin
- Admins can create a season that has a start and end date
- Seasons can be set to the default season by the admin
- The default leaderboard only shows the current season
- Filters are on the homescreen to filter bring in previous seasons

# Technical solution

Azure static web app connecting to a supabase db.