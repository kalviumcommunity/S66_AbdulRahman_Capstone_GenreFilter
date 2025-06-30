import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// Spotify OAuth login endpoint
app.get('/auth/login', (req, res) => {
  const scope = 'user-read-private playlist-read-private playlist-modify-public';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: process.env.REDIRECT_URI
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

// Spotify OAuth callback endpoint
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code'
    }), {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const { access_token, refresh_token, expires_in } = response.data;
    res.json({ access_token, refresh_token, expires_in });
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});

// GET user's playlists from Spotify
app.get('/spotify/user-playlists', async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    res.json(response.data.items);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlists' });
  }
});

// GET artist genres from Spotify
app.get('/spotify/artist-genres', async (req, res) => {
  const { access_token, artist_ids } = req.query;
  if (!access_token || !artist_ids) {
    return res.status(400).json({ error: 'Missing access_token or artist_ids' });
  }
  let artistIds;
  try {
    artistIds = JSON.parse(decodeURIComponent(artist_ids)).map(item => item.artistId);
  } catch (error) {
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
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch artist genres' });
  }
});
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^\w\s\-']/gi, '').trim();
}

const UserTrackGenreSchema = new mongoose.Schema({
  userId: String,
  trackId: String,
  genre: String
}, { collection: 'user_track_genres' });

const UserTrackGenre = mongoose.models.UserTrackGenre || mongoose.model('UserTrackGenre', UserTrackGenreSchema);

app.post('/user/track-genres', async (req, res) => {
  const userId = sanitizeString(req.body.userId);
  const trackId = sanitizeString(req.body.trackId);
  const genre = sanitizeString(req.body.genre);
  if (!userId || !trackId || !genre) {
    return res.status(400).json({ error: 'Missing userId, trackId, or genre' });
  }
  if (genre.length > 40) return res.status(400).json({ error: 'Genre too long' });
  try {
    await UserTrackGenre.findOneAndUpdate({ userId, trackId, genre }, {}, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to add genre:', err);
    res.status(500).json({ error: 'Failed to add genre', details: err.message });
  }
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


