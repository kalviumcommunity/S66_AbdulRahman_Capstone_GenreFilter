import express from 'express';
import cors from 'cors';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import { ChatCohere } from "@langchain/cohere";
import { HumanMessage } from "@langchain/core/messages";

dotenv.config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '100kb' })); // Limit JSON body size

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI,
  FRONTEND_URI,
  MONGODB_URI,
  LASTFM_API_KEY
} = process.env;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected to', MONGODB_URI))
  .catch(err => console.error('MongoDB connection error:', err));

const chat = new ChatCohere({
  apiKey: process.env.COHERE_API_KEY,
  model: "command", // or "command-r" for more creative results
  temperature: 0.8,
});

const UserTrackGenreSchema = new mongoose.Schema({
  userId: String,    // Spotify user id
  trackId: String,   // Spotify track id
  genre: String      // Genre name
}, { collection: 'user_track_genres' });

const UserTrackGenre = mongoose.model('UserTrackGenre', UserTrackGenreSchema);

// Backend schema and model for fallback artist genres
const FallbackArtistSchema = new mongoose.Schema({
  name: String,
  genre: [String] // Updated to array to match your document
}, { collection: 'artists' });

const FallbackArtist = mongoose.model('FallbackArtist', FallbackArtistSchema);

app.get('/auth/login', (req, res) => {
  const scope = 'user-read-private playlist-read-private playlist-modify-public';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI
    }));
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }), {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;
    console.log('New access token issued, expires in:', expires_in);
    res.redirect(`${FRONTEND_URI}?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Callback error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});


app.post('/ai/suggest-playlist-name', async (req, res) => {
  const { genres, baseName } = req.body;
  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'Genres are required' });
  }
  // Helper to check if baseName is meaningful (not empty, not just whitespace, not generic)
  function isMeaningful(str) {
    if (!str) return false;
    const s = str.trim();
    if (!s) return false;
    if (s.length < 3) return false;
    if (/playlist|mix|songs|music/i.test(s) && s.length < 10) return false;
    return true;
  }
  try {
    let prompt;
    if (isMeaningful(baseName)) {
      prompt = `Given the playlist name "${baseName}" and these genres: ${genres.join(', ')}, suggest ONE improved, creative Spotify playlist name that fits both. ONLY return the name, no extra text, no quotes.`;
    } else {
      prompt = `Suggest ONE creative, fun Spotify playlist name for these genres: ${genres.join(', ')}. ONLY return the name, no extra text, no quotes.`;
    }
    const result = await chat.invoke([new HumanMessage(prompt)]);
    res.json({ suggestion: result.content.trim() });
  } catch (err) {
    console.error('LangChain Cohere playlist name error:', err);
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

app.post('/refresh_token', async (req, res) => {
  const { refresh_token } = req.body;
  try {
    console.log('Processing refresh token request');
    const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    }), {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Refresh token successful, new expires_in:', response.data.expires_in);
    res.json(response.data);
  } catch (error) {
    console.error('Refresh token error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

app.get('/spotify/user-playlists', async (req, res) => {
  const { access_token } = req.query;
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    res.json(response.data.items);
  } catch (error) {
    console.error('User playlists error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlists' });
  }
});

app.get('/spotify/playlist-tracks', async (req, res) => {
  const { access_token, playlist_id } = req.query;
  try {
    let allTracks = [];
    let next = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?limit=100`;

    while (next) {
      const response = await axios.get(next, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      allTracks = allTracks.concat(response.data.items);
      next = response.data.next;
    }

    res.json(allTracks);
  } catch (error) {
    console.error('Playlist tracks error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

app.get('/spotify/artist-genres', async (req, res) => {
  const { access_token, artist_ids } = req.query;
  let artistIds;
  try {
    artistIds = JSON.parse(decodeURIComponent(artist_ids)).map(item => item.artistId);
  } catch (error) {
    console.error('Invalid artist_ids format:', error.message);
    return res.status(400).json({ error: 'Invalid artist_ids format' });
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const genres = response.data.artists.map(artist => ({
      artistId: artist.id,
      genres: artist.genres || []
    }));

    res.json(genres);
  } catch (error) {
    console.error('Artist genres error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch artist genres' });
  }
});

app.get('/spotify/artist-genres-lastfm', async (req, res) => {
  console.log('Entered /spotify/artist-genres-lastfm with query:', req.query);
  const { artists } = req.query;
  let artistList;
  try {
    artistList = JSON.parse(decodeURIComponent(artists));
    console.log('Successfully parsed artistList:', artistList.length, 'artists');
  } catch (parseError) {
    console.error('Failed to parse artists format:', parseError.message, 'Raw artists data:', artists);
    return res.status(400).json({ error: 'Invalid artists format' });
  }

  // Define main genres and mapping (should match frontend)
  const MAIN_GENRES = [
    'pop', 'rock', 'hip hop', 'r&b', 'soul', 'jazz', 'blues', 'country', 'folk',
    'electronic', 'dance', 'indie', 'alternative', 'metal', 'punk', 'reggae',
    'classical', 'funk', 'disco', 'rap', 'latin', 'k-pop', 'world'
  ];
  const GENRE_MAPPING = {
    'indie pop': 'pop', 'pop rock': 'pop', 'electropop': 'pop', 'synthpop': 'pop', 'art pop': 'pop',
    'folk pop': 'pop', 'dream pop': 'pop', 'bedroom pop': 'pop', 'hyperpop': 'pop',
    'indie rock': 'rock', 'alternative rock': 'rock', 'psychedelic rock': 'rock', 'post-punk': 'rock',
    'grunge': 'rock', 'shoegaze': 'rock', 'underground hip hop': 'hip hop', 'lo-fi hip hop': 'hip hop',
    'alternative hip hop': 'hip hop', 'chillhop': 'hip hop', 'cloud rap': 'rap', 'gangsta rap': 'rap',
    'trap': 'rap', 'boom bap': 'rap', 'mumble rap': 'rap', 'drill': 'rap', 'neo soul': 'soul',
    'indie r&b': 'r&b', 'alt r&b': 'r&b', 'chill r&b': 'r&b', 'contemporary r&b': 'r&b',
    'smooth jazz': 'jazz', 'fusion jazz': 'jazz', 'bluegrass': 'country', 'alt-country': 'country',
    'indie folk': 'folk', 'folk rock': 'folk', 'techno': 'electronic', 'house': 'electronic',
    'trance': 'electronic', 'dubstep': 'electronic', 'drum and bass': 'electronic', 'ambient': 'electronic',
    'edm': 'electronic', 'future bass': 'electronic', 'synthwave': 'electronic', 'vaporwave': 'electronic',
    'chillout': 'electronic', 'downtempo': 'electronic', 'trip hop': 'electronic', 'dance pop': 'dance',
    'disco house': 'dance', 'garage': 'dance', 'ska': 'punk', 'emo': 'punk', 'hardcore punk': 'punk',
    'death metal': 'metal', 'thrash metal': 'metal', 'black metal': 'metal', 'doom metal': 'metal',
    'neo-psychedelia': 'alternative', 'experimental pop': 'alternative', 'lo-fi': 'electronic',
    'latin pop': 'latin', 'reggaeton': 'latin', 'salsa': 'latin', 'bachata': 'latin', 'cumbia': 'latin',
    'tropical': 'latin', 'korean pop': 'k-pop', 'j-pop': 'world', 'afrobeats': 'world', 'bollywood': 'world',
    'bhangra': 'world', 'flamenco': 'world', 'samba': 'world', 'afrobeat': 'world'
  };

  console.log('LASTFM_API_KEY loaded:', LASTFM_API_KEY ? 'Yes' : 'No');
  try {
    const lastFmGenres = [];
    const batchSize = artistList.length > 20 ? 3 : 5;
    for (let i = 0; i < artistList.length; i += batchSize) {
      const batch = artistList.slice(i, i + batchSize);
      const batchPromises = batch.map(async ({ artistId, name }, index) => {
        let attempt = 0;
        const maxAttempts = 3;
        while (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 400));
          try {
            const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
              params: {
                method: 'artist.getTopTags',
                artist: encodeURIComponent(name),
                api_key: LASTFM_API_KEY,
                format: 'json'
              },
              timeout: 15000
            });
            // Only keep tags that map to a main genre or mapping
            const tags = (response.data.toptags?.tag || [])
              .map(tag => tag.name.toLowerCase())
              .map(genre => GENRE_MAPPING[genre] || (MAIN_GENRES.includes(genre) ? genre : null))
              .filter(Boolean);
            return { artistId, genres: Array.from(new Set(tags)) };
          } catch (fetchError) {
            if (fetchError.response?.status === 429 && attempt < maxAttempts - 1) {
              const retryAfter = fetchError.response.headers['retry-after'] || 2;
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              attempt++;
              continue;
            }
            return { artistId, genres: [] };
          }
        }
        return { artistId, genres: [] };
      });
      const batchResults = await Promise.all(batchPromises);
      lastFmGenres.push(...batchResults);
    }
    res.json(lastFmGenres);
  } catch (overallError) {
    res.status(500).json({ error: 'Failed to fetch Last.fm genres' });
  }
});

app.post('/spotify/create-playlist', async (req, res) => {
  const { access_token, name, trackUris } = req.body;
  try {
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const userId = userResponse.data.id;

    const playlistResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      name: name,
      public: true
    }, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const playlistId = playlistResponse.data.id;
    await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      uris: trackUris
    }, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    res.json({ playlistUrl: playlistResponse.data.external_urls.spotify });
  } catch (error) {
    console.error('Create playlist error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.post('/spotify/deduplicate-playlist', async (req, res) => {
  const { access_token, playlist_id } = req.body;
  if (!access_token || !playlist_id) {
    return res.status(400).json({ error: 'Missing access_token or playlist_id' });
  }
  try {
    let allTracks = [];
    let next = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?limit=100`;
    while (next) {
      const response = await axios.get(next, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      allTracks = allTracks.concat(response.data.items);
      next = response.data.next;
    }
    const seen = new Set();
    const uniqueTracks = [];
    allTracks.forEach(item => {
      const key = item.track?.id;
      if (!key) return;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTracks.push(item.track.uri);
      }
    });
    const removeTracks = allTracks.map((item, idx) => ({ uri: item.track.uri, positions: [idx] }));
    if (removeTracks.length > 0) {
      removeTracks.sort((a, b) => b.positions[0] - a.positions[0]);
      await axios.request({
        method: 'DELETE',
        url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
        headers: { 'Authorization': `Bearer ${access_token}` },
        data: { tracks: removeTracks }
      });
    }
    if (uniqueTracks.length > 0) {
      for (let i = 0; i < uniqueTracks.length; i += 100) {
        const batch = uniqueTracks.slice(i, i + 100);
        await axios.post(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
          uris: batch
        }, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
      }
    }
    res.json({ removed: allTracks.length - uniqueTracks.length });
  } catch (error) {
    console.error('Deduplicate playlist error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to deduplicate playlist' });
  }
});

app.post('/spotify/find-duplicates', async (req, res) => {
  const { access_token, playlist_id } = req.body;
  if (!access_token || !playlist_id) {
    return res.status(400).json({ error: 'Missing access_token or playlist_id' });
  }
  try {
    let allTracks = [];
    let next = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?limit=100`;
    while (next) {
      const response = await axios.get(next, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      allTracks = allTracks.concat(response.data.items);
      next = response.data.next;
    }
    const seen = new Map();
    const duplicates = [];
    allTracks.forEach((item, idx) => {
      const key = item.track?.id;
      if (!key) return;
      if (!seen.has(key)) {
        seen.set(key, [idx]);
      } else {
        seen.get(key).push(idx);
      }
    });
    for (const [trackId, positions] of seen.entries()) {
      if (positions.length > 1) {
        positions.slice(1).forEach(pos => {
          const track = allTracks[pos]?.track;
          if (track) {
            duplicates.push({
              uri: track.uri,
              position: pos,
              name: track.name,
              artists: track.artists?.map(a => a.name).join(', ')
            });
          }
        });
      }
    }
    res.json({ duplicates });
  } catch (error) {
    console.error('Find duplicates error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to find duplicates' });
  }
});

app.post('/spotify/remove-duplicates', async (req, res) => {
  const { access_token, playlist_id, duplicates } = req.body;
  if (!access_token || !playlist_id || !Array.isArray(duplicates)) {
    return res.status(400).json({ error: 'Missing access_token, playlist_id, or duplicates' });
  }
  try {
    const tracksToRemove = duplicates
      .map(d => ({ uri: d.uri, positions: [d.position] }))
      .sort((a, b) => b.positions[0] - a.positions[0]);
    if (tracksToRemove.length === 0) {
      return res.json({ removed: 0 });
    }
    await axios.request({
      method: 'DELETE',
      url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
      headers: { 'Authorization': `Bearer ${access_token}` },
      data: { tracks: tracksToRemove }
    });
    res.json({ removed: tracksToRemove.length });
  } catch (error) {
    console.error('Remove duplicates error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to remove duplicates' });
  }
});

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[^\w\s\-']/gi, '').trim();
};

app.get('/user/track-genres', async (req, res) => {
  const userId = sanitizeString(req.query.userId);
  const trackId = sanitizeString(req.query.trackId);
  if (!userId || !trackId) {
    return res.status(400).json({ error: 'Missing userId or trackId' });
  }
  try {
    const genres = await UserTrackGenre.find({ userId, trackId });
    res.json({ genres: genres.map(g => g.genre) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get genres' });
  }
});

app.post('/user/track-genres', async (req, res) => {
  const userId = sanitizeString(req.body.userId);
  const trackId = sanitizeString(req.body.trackId);
  const genre = sanitizeString(req.body.genre);
  if (!userId || !trackId || !genre) {
    return res.status(400).json({ error: 'Missing userId, trackId, or genre' });
  }
  if (genre.length > 40) return res.status(400).json({ error: 'Genre too long' });
  try {
    const exists = await UserTrackGenre.findOne({ userId, trackId, genre });
    if (exists) return res.json({ success: true });
    await UserTrackGenre.create({ userId, trackId, genre });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add genre' });
  }
});

app.delete('/user/track-genres', async (req, res) => {
  const userId = sanitizeString(req.body.userId);
  const trackId = sanitizeString(req.body.trackId);
  const genre = sanitizeString(req.body.genre);
  if (!userId || !trackId || !genre) {
    return res.status(400).json({ error: 'Missing userId, trackId, or genre' });
  }
  try {
    await UserTrackGenre.deleteOne({ userId, trackId, genre });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove genre' });
  }
});

app.get('/fallback-artist-genres', async (req, res) => {
  let names = req.query.names;
  console.log('Received names for fallback query:', names);
  try {
    names = JSON.parse(names);
    console.log('Parsed names:', names);
  } catch (error) {
    console.error('Invalid names format:', error.message);
    return res.status(400).json({ error: 'Invalid names format' });
  }
  if (!Array.isArray(names) || names.length === 0) {
    console.log('No valid names provided for fallback query');
    return res.json([]);
  }
  try {
    const docs = await FallbackArtist.find({
      name: { $in: names.map(name => new RegExp(`^${name}$`, 'i')) }
    }).lean();
    console.log('Fallback query results:', docs);
    res.json(docs.map(({ name, genre }) => ({ name, genre })));
  } catch (err) {
    console.error('Failed to fetch fallback artist genres:', err);
    res.status(500).json({ error: 'Failed to fetch fallback artist genres' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));