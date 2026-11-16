# Coffee & Code Bingo

Bingo cards for Coffee & Code at the Brampton Library. Each visitor gets a
random 5x5 card built from the list in `src/squares.js`; tap a square when you
hear it, five in a row wins.

Static site: plain HTML, CSS and JavaScript, no build step and no server.
Cards are generated in the browser from a seed kept in the URL hash
(`#card=...`); marks are saved in the browser's localStorage.

## Develop

    npm run dev    # serves http://localhost:8080
    npm test       # unit tests for the card and bingo logic

To change what's on the cards, edit `src/squares.js` (any list of 24 or more
unique squares works).
