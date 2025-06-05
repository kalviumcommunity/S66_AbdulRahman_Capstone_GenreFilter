Capstone Project: Spotify Playlist Genre Separator
Project Idea
The Spotify Playlist Genre Separator is a web application that allows users to select a Spotify playlist and automatically separate its songs into new playlists based on their genres (e.g., R&B, Pop, Hip Hop). Unlike existing tools that rely on artist-level genres, this app uses song-level genre tags from the Last.fm API to ensure accurate categorization, addressing issues like mislabeling a rap song by an R&B artist. Users can log in with Spotify, select a playlist, filter songs by genre, and create new genre-specific playlists directly in Spotify. The app is built using a MERN stack (MongoDB, Express.js, React, Node.js) with Last.fm integration for genre tagging and caching to optimize performance.
Key Features:

Spotify authentication to access user playlists.
Song-level genre tagging using Last.fm’s track.getTopTags API.
Filtering of non-sense tags (e.g., "ryu owns this song") with a blocklist and tag weighting.
Creation of new Spotify playlists for selected genres.
Caching of genre tags to improve performance.
User-friendly interface with React and Tailwind CSS.

The project aims to provide a seamless music organization experience, solving the problem of inaccurate genre classification in mixed playlists.
Day-by-Day Plan
The capstone project spans 4 weeks (28 days) starting May 26, 2025, covering planning, development, testing, and finalization. The plan assumes a working prototype exists (based on prior work) and focuses on refining, optimizing, and documenting the app.
Week 1: Planning and Setup (May 26 - June 1, 2025)

Day 1 (May 26): Finalize project scope and requirements. Define genre taxonomy (e.g., align with Spotify’s granular genres like "vapor soul"). Research Last.fm tag accuracy and potential fallback APIs (e.g., MusicBrainz).
Day 2 (May 27): Set up project repository with Git. Configure MongoDB for persistent caching (replace JSON file). Update .env with Spotify and Last.fm API keys.
Day 3 (May 28): Review existing code (App.jsx, index.js). Identify areas for optimization (e.g., tag filtering, API call efficiency). Create initial project documentation (README draft).
Day 4 (May 29): Design UI improvements using Tailwind CSS. Plan for responsive design and error handling (e.g., better UX for "Unknown Genre").
Day 5 (May 30): Set up MongoDB schema for caching (track ID, artist, track name, genres). Write scripts to migrate existing JSON cache to MongoDB.
Day 6 (May 31): Test Spotify authentication flow and playlist fetching. Ensure rate limit handling works for large playlists (>100 tracks).
Day 7 (June 1): Weekly review. Test Last.fm API integration for a sample playlist. Document progress and blockers in README.

Week 2: Core Development (June 2 - June 8, 2025)

Day 8 (June 2): Enhance /lastfm/track-tags endpoint to handle "Unknown Genre" issues. Implement fallback query for all track artists (not just the first) to improve tag matching.
Day 9 (June 3): Address "Error fetching tags" issue. Add detailed error logging (e.g., HTTP status, track details) and increase retry attempts for Last.fm rate limits.
Day 10 (June 4): Refine tag filtering. Adjust VALID_GENRES based on testing (e.g., add "k-pop," "jazz fusion"). Update NON_SENSE_TAGS blocklist with new patterns from logs.
Day 11 (June 5): Implement MongoDB caching in /lastfm/track-tags. Store and retrieve genre tags by track ID. Test cache hit/miss performance.
Day 12 (June 6): Add Spotify audio features (e.g., danceability, energy) to validate Last.fm tags (e.g., filter out "rap" for low-energy songs like "WILDFLOWER").
Day 13 (June 7): Update frontend to display multiple genres per song in the UI (e.g., "Pop, Art Pop"). Add loading spinners and progress indicators for large playlists.
Day 14 (June 8): Weekly review. Test app with diverse playlists (e.g., mixed genres, obscure artists). Document performance metrics (e.g., processing time for 100 tracks).

Week 3: Testing and Optimization (June 9 - June 15, 2025)

Day 15 (June 9): Write unit tests for backend endpoints (/spotify/playlist-tracks, /lastfm/track-tags, /spotify/create-playlist) using Jest.
Day 16 (June 10): Write integration tests for Spotify authentication and playlist creation. Test edge cases (e.g., empty playlists, invalid tokens).
Day 17 (June 11): Optimize API calls by batching Spotify audio features requests (max 100 tracks per call). Reduce Last.fm request delays if no rate limits are hit.
Day 18 (June 12): Add user feedback for "Unknown Genre" tracks (e.g., allow manual genre tagging in the UI). Update frontend to handle this feature.
Day 19 (June 13): Conduct user testing with 3-5 sample playlists. Collect feedback on genre accuracy and UI/UX. Log any new non-sense tags.
Day 20 (June 14): Implement MusicBrainz API as a fallback for tracks with no Last.fm tags. Query /recording endpoint for genre metadata.
Day 21 (June 15): Weekly review. Analyze user testing feedback. Prioritize fixes (e.g., genre accuracy, UI bugs). Update README with testing results.

Week 4: Finalization and Presentation (June 16 - June 22, 2025)

Day 22 (June 16): Fix bugs from user testing. Refine genre validation using Spotify audio features (e.g., machine learning classifier for genre inference).
Day 23 (June 17): Polish UI with Tailwind CSS. Ensure responsive design for mobile and desktop. Add error messages for failed API calls.
Day 24 (June 18): Create demo video showcasing app functionality (login, playlist selection, genre filtering, playlist creation). Host on YouTube or local file.
Day 25 (June 19): Write final documentation, including setup instructions, API usage, and limitations (e.g., Last.fm tag noise). Update README.
Day 26 (June 20): Prepare capstone presentation slides. Highlight project goals, technical challenges (e.g., non-sense tags), and solutions (e.g., blocklist, caching).
Day 27 (June 21): Conduct final testing with a large playlist (200+ tracks). Verify playlist creation and genre accuracy. Fix any last-minute bugs.
Day 28 (June 22): Submit capstone project. Deliver presentation to stakeholders or instructors. Archive repository and share demo video.

Dependencies: Requires Spotify and Last.fm API keys, MongoDB, and Node.js/React setup. Ensure .env is configured correctly.

