import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { ClipLoader } from 'react-spinners';
import Select, { createFilter } from 'react-select';
import DedupBar from './components/DedupBar';
import GenreSelectBar from './components/GenreSelectBar';

const MAIN_GENRES = [
  'pop', 'rock', 'hip hop', 'r&b', 'soul', 'jazz', 'blues', 'country', 'folk',
  'electronic', 'dance', 'indie', 'alternative', 'metal', 'punk', 'reggae',
  'classical', 'funk', 'disco', 'rap', 'latin', 'k-pop', 'world'
];

const GENRE_MAPPING = {
  'indie pop': 'pop',
  'pop rock': 'pop',
  'electropop': 'pop',
  'synthpop': 'pop',
  'art pop': 'pop',
  'folk pop': 'pop',
  'dream pop': 'pop',
  'bedroom pop': 'pop',
  'hyperpop': 'pop',
  'indie rock': 'rock',
  'alternative rock': 'rock',
  'psychedelic rock': 'rock',
  'post-punk': 'rock',
  'grunge': 'rock',
  'shoegaze': 'rock',
  'underground hip hop': 'hip hop',
  'lo-fi hip hop': 'hip hop',
  'alternative hip hop': 'hip hop',
  'chillhop': 'hip hop',
  'cloud rap': 'rap',
  'gangsta rap': 'rap',
  'trap': 'rap',
  'boom bap': 'rap',
  'mumble rap': 'rap',
  'drill': 'rap',
  'neo soul': 'soul',
  'indie r&b': 'r&b',
  'alt r&b': 'r&b',
  'chill r&b': 'r&b',
  'contemporary r&b': 'r&b',
  'smooth jazz': 'jazz',
  'fusion jazz': 'jazz',
  'bluegrass': 'country',
  'alt-country': 'country',
  'indie folk': 'folk',
  'folk rock': 'folk',
  'techno': 'electronic',
  'house': 'electronic',
  'trance': 'electronic',
  'dubstep': 'electronic',
  'drum and bass': 'electronic',
  'ambient': 'electronic',
  'edm': 'electronic',
  'future bass': 'electronic',
  'synthwave': 'electronic',
  'vaporwave': 'electronic',
  'chillout': 'electronic',
  'downtempo': 'electronic',
  'trip hop': 'electronic',
  'dance pop': 'dance',
  'disco house': 'dance',
  'garage': 'dance',
  'ska': 'punk',
  'emo': 'punk',
  'hardcore punk': 'punk',
  'death metal': 'metal',
  'thrash metal': 'metal',
  'black metal': 'metal',
  'doom metal': 'metal',
  'neo-psychedelia': 'alternative',
  'experimental pop': 'alternative',
  'lo-fi': 'electronic',
  'latin pop': 'latin',
  'reggaeton': 'latin',
  'salsa': 'latin',
  'bachata': 'latin',
  'cumbia': 'latin',
  'tropical': 'latin',
  'korean pop': 'k-pop',
  'j-pop': 'world',
  'afrobeats': 'world',
  'bollywood': 'world',
  'bhangra': 'world',
  'flamenco': 'world',
  'samba': 'world',
  'afrobeat': 'world'
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg text-center mb-6">
          Error rendering song list. Please try again.
          <p className="text-sm text-gray-300 mt-2">
            {this.state.error?.message || 'Unknown error occurred'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [spotifyUserId, setSpotifyUserId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [likedSongs, setLikedSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [error, setError] = useState(null);
  const [trackCount, setTrackCount] = useState(0);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupError, setDedupError] = useState(null);
  const [dedupResult, setDedupResult] = useState(null);
  const [showAllGenres, setShowAllGenres] = useState(false); // Toggle for genre dropdown
  const [customPlaylistName, setCustomPlaylistName] = useState(''); // New state for custom playlist name

  // Helper: get Spotify userId (fetch on login, or store in state/localStorage)
  useEffect(() => {
    if (accessToken && !spotifyUserId) {
      axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).then(res => setSpotifyUserId(res.data.id)).catch(() => {});
    }
  }, [accessToken, spotifyUserId]);

  const refreshAccessToken = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
    if (!storedRefreshToken) {
      console.error('No refresh token available');
      setError('Session expired. Please log in again.');
      setAccessToken(null);
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      return null;
    }

    try {
      console.log('Attempting to refresh access token');
      const response = await axios.post('http://localhost:5000/refresh_token', { refresh_token: storedRefreshToken });
      const { access_token, refresh_token, expires_in } = response.data;
      setAccessToken(access_token);
      localStorage.setItem('spotify_access_token', access_token);
      localStorage.setItem('spotify_refresh_token', refresh_token || storedRefreshToken);
      console.log('Access token refreshed successfully, expires in:', expires_in);
      return access_token;
    } catch (err) {
      console.error('Failed to refresh access token:', err.response?.data || err.message);
      setError('Failed to refresh session. Please log in again.');
      setAccessToken(null);
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      return null;
    }
  }, []);

  const fetchWithTokenRefresh = useCallback(async (fetchFn, ...args) => {
    try {
      return await fetchFn(...args);
    } catch (err) {
      if (err.response?.status === 401 || err.message.includes('access token expired')) {
        console.warn('Access token expired, attempting refresh');
        const newToken = await refreshAccessToken();
        if (newToken) {
          args[0] = args[0].replace(/access_token=[^&]*/, `access_token=${newToken}`);
          return await fetchFn(...args);
        }
        throw new Error('Unable to refresh access token');
      }
      throw err;
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    const refresh = params.get('refresh_token');

    const fetchUserPlaylists = async (token) => {
      return fetchWithTokenRefresh(async () => {
        const res = await axios.get(`http://localhost:5000/spotify/user-playlists?access_token=${token}`);
        setPlaylists(res.data);
        setError(null);
        return res;
      }, `http://localhost:5000/spotify/user-playlists?access_token=${token}`);
    };

    if (token && refresh) {
      setAccessToken(token);
      localStorage.setItem('spotify_access_token', token);
      localStorage.setItem('spotify_refresh_token', refresh);
      fetchUserPlaylists(token);
    } else {
      const savedToken = localStorage.getItem('spotify_access_token');
      const savedRefresh = localStorage.getItem('spotify_refresh_token');
      if (savedToken && savedRefresh) {
        setAccessToken(savedToken);
        fetchUserPlaylists(savedToken);
      }
    }
  }, [fetchWithTokenRefresh]);

  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/login';
  };

  const fetchArtistGenresInBatches = async (artistIds) => {
    const batches = [];
    for (let i = 0; i < artistIds.length; i += 25) {
      const batch = artistIds.slice(i, i + 25);
      const queryParams = new URLSearchParams({
        access_token: accessToken,
        artist_ids: encodeURIComponent(JSON.stringify(batch))
      });
      batches.push(
        fetchWithTokenRefresh(
          async () => {
            const res = await axios.get(`http://localhost:5000/spotify/artist-genres?${queryParams}`);
            return res.data;
          },
          `http://localhost:5000/spotify/artist-genres?${queryParams}`
        ).catch(err => {
          console.error(`Artist genre batch ${i / 25 + 1} failed:`, err.response?.data || err.message);
          return [];
        })
      );
      if (i + 25 < artistIds.length) await new Promise(resolve => setTimeout(resolve, 500));
    }
    return (await Promise.all(batches)).flat();
  };

  const fetchLastFmGenres = async (artists) => {
    const queryParams = new URLSearchParams({
      access_token: accessToken,
      artists: encodeURIComponent(JSON.stringify(artists))
    });
    return fetchWithTokenRefresh(
      async () => {
        const res = await axios.get(`http://localhost:5000/spotify/artist-genres-lastfm?${queryParams}`);
        return res.data;
      },
      `http://localhost:5000/spotify/artist-genres-lastfm?${queryParams}`
    ).catch(err => {
      console.error('Last.fm genre fetch failed:', err.response?.data || err.message);
      return [];
    });
  };

  const handlePlaylistSelect = async (e) => {
    const playlistId = e.target.value;
    setSelectedPlaylist(playlistId);
    setError(null);
    setTrackCount(0);
    setLikedSongs([]);
    setGenres([]);
    setFilteredSongs([]);
    setSelectedGenres([]);

    if (!playlistId) return;

    try {
      setLoadingGenres(true);
      const res = await fetchWithTokenRefresh(
        async () => await axios.get(`http://localhost:5000/spotify/playlist-tracks?access_token=${accessToken}&playlist_id=${playlistId}`),
        `http://localhost:5000/spotify/playlist-tracks?access_token=${accessToken}&playlist_id=${playlistId}`
      );
      const songs = res.data;

      if (!songs.length) {
        setError('This playlist is empty.');
        setLoadingGenres(false);
        return;
      }

      setTrackCount(songs.length);

      const artistMap = new Map();
      songs.forEach(item => {
        item.track?.artists?.forEach(artist => {
          if (artist?.id && artist?.name) artistMap.set(artist.id, artist.name);
        });
      });

      const artistIds = Array.from(artistMap.keys()).map(id => ({ artistId: id }));
      if (!artistIds.length) {
        setError('No valid artists found in this playlist.');
        setLoadingGenres(false);
        return;
      }

      // Step 1: Fetch Spotify genres
      const artistGenres = await fetchArtistGenresInBatches(artistIds);
      const artistGenreMap = {};
      const unmappedGenres = new Set();
      artistGenres.forEach(({ artistId, genres }) => {
        const mappedGenres = genres
          .map(genre => {
            const lowerGenre = genre.toLowerCase();
            const mapped = GENRE_MAPPING[lowerGenre] || MAIN_GENRES.find(mg => lowerGenre.includes(mg)) || genre;
            if (!mapped && genre) unmappedGenres.add(genre);
            return mapped || null;
          })
          .filter(genre => genre !== null)
          .filter((genre, index, self) => self.indexOf(genre) === index);
        artistGenreMap[artistId] = mappedGenres.length > 0 ? mappedGenres : null;
      });
      if (unmappedGenres.size > 0) console.warn('Unmapped Spotify genres:', [...unmappedGenres]);

      // Step 2: Fallback to local DB for artists with no genres
      const missingArtistIds = artistIds
        .filter(({ artistId }) => !artistGenreMap[artistId] || artistGenreMap[artistId].length === 0)
        .map(({ artistId }) => artistId);
      if (missingArtistIds.length > 0) {
        // Build a map of artistId -> artistName for missing artists
        const missingArtists = songs.flatMap(item =>
          item.track?.artists?.filter(a => missingArtistIds.includes(a.id)) || []
        );
        // Lowercase/trimmed name map for robust matching
        const artistIdToName = {};
        missingArtists.forEach(a => {
          if (a.id && a.name) artistIdToName[a.id] = a.name.trim().toLowerCase();
        });
        const uniqueNames = [...new Set(Object.values(artistIdToName))];
        if (uniqueNames.length > 0) {
          try {
            const response = await axios.get('http://localhost:5000/fallback-artist-genres', {
              params: { names: JSON.stringify(uniqueNames) }
            });
            const fallbackData = response.data || [];
            // Lowercase/trimmed fallback name for robust matching
            fallbackData.forEach(({ name, genre }) => {
              const fallbackName = name.trim().toLowerCase();
              // Assign fallback genres to all artistIds with this name
              Object.entries(artistIdToName).forEach(([artistId, artistName]) => {
                if (artistName === fallbackName && genre && genre.length > 0) {
                  artistGenreMap[artistId] = genre;
                }
              });
            });
          } catch (err) {
            console.error('Failed to fetch fallback artist genres:', err);
          }
        }
      }

      // Step 3: Initial enrichment with Spotify genres
      let enriched = songs.map(item => {
        const artistIds = item.track?.artists?.map(a => a.id).filter(id => id) || [];
        const genres = [...new Set(artistIds.flatMap(id => artistGenreMap[id] || []))];
        return { ...item, genres: genres.length > 0 ? genres : [] };
      });

      // Step 4: Identify tracks with no genres for Last.fm
      const unknownTracks = enriched
        .map((item, index) => ({
          index,
          trackName: item.track?.name,
          artistIds: item.track?.artists?.map(a => a.id).filter(id => id) || [],
          artistNames: item.track?.artists?.map(a => a.name).filter(name => name) || [],
          hasUnknownGenre: item.genres.length === 0
        }))
        .filter(item => item.hasUnknownGenre);

      if (unknownTracks.length > 0) {
        const artistsToFetch = [...new Set(unknownTracks.flatMap(track => track.artistIds))]
          .map(id => ({ artistId: id, name: artistMap.get(id) }));
        console.log('Fetching Last.fm genres for artists:', artistsToFetch.map(a => a.name));
        const lastFmGenres = await fetchLastFmGenres(artistsToFetch);
        console.log('Last.fm genres returned:', lastFmGenres);

        lastFmGenres.forEach(({ artistId, genres }) => {
          const mappedGenres = genres
            .map(genre => {
              const lowerGenre = genre.toLowerCase();
              const mapped = GENRE_MAPPING[lowerGenre] || MAIN_GENRES.find(mg => lowerGenre.includes(mg)) || genre;
              if (!mapped && genre) unmappedGenres.add(genre);
              return mapped;
            })
            .filter(genre => genre)
            .filter((genre, index, self) => self.indexOf(genre) === index);
          console.log(`Mapped genres for artist ${artistId}:`, mappedGenres);
          artistGenreMap[artistId] = mappedGenres.length > 0 ? mappedGenres : artistGenreMap[artistId] || [];
        });
        if (unmappedGenres.size > 0) console.warn('Unmapped Last.fm genres:', [...unmappedGenres]);
      }

      // Step 5: Re-enrich with Last.fm genres
      enriched = enriched.map(item => {
        const artistIds = item.track?.artists?.map(a => a.id).filter(id => id) || [];
        const genres = [...new Set(artistIds.flatMap(id => artistGenreMap[id] || []))];
        return { ...item, genres: genres.length > 0 ? genres : [] };
      });

      // Step 6: Propagate genres across same artist from Last.fm
      const artistGenreFallback = new Map();
      enriched.forEach(item => {
        const artistIds = item.track?.artists?.map(a => a.id).filter(id => id) || [];
        if (item.genres.length > 0) {
          artistIds.forEach(artistId => {
            if (!artistGenreFallback.has(artistId) || item.genres.length > artistGenreFallback.get(artistId).length) {
              artistGenreFallback.set(artistId, item.genres);
            }
          });
        }
      });

      enriched = enriched.map(item => {
        const artistIds = item.track?.artists?.map(a => a.id).filter(id => id) || [];
        const currentGenres = item.genres;
        const fallbackGenres = artistIds.flatMap(id => artistGenreFallback.get(id) || []);
        const uniqueGenres = [...new Set([...currentGenres, ...fallbackGenres])];
        return { ...item, genres: uniqueGenres.length > 0 ? uniqueGenres : ['Unknown Genre'] };
      });

      setLikedSongs(enriched);

      const genreSet = new Set();
      enriched.forEach(item => item.genres.forEach(g => genreSet.add(g)));

      if (genreSet.size === 1 && genreSet.has('Unknown Genre')) {
        setError('No recognized genres found for artists in this playlist.');
      } else if (!genreSet.size) {
        setError('No genres available for this playlist.');
      } else {
        setGenres([...genreSet].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
      }

      setLoadingGenres(false);
    } catch (err) {
      console.error('Error loading playlist:', err.response?.data || err.message);
      setError('Failed to load playlist tracks or genres.');
      setLoadingGenres(false);
    }
  };

  const handleGenreChange = useCallback((selectedOptions) => {
    const selected = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setSelectedGenres(selected);
    setLoadingFilter(true);

    try {
      setFilteredSongs(selected.length ? likedSongs.filter(item => selected.some(genre => item.genres.includes(genre))) : []);
    } catch {
      setError('Failed to filter songs by genres.');
    } finally {
      setLoadingFilter(false);
    }
  }, [likedSongs]);

  const handleClearGenres = useCallback(() => {
    setSelectedGenres([]);
    setFilteredSongs([]);
  }, []);

  const createPlaylist = async () => {
    if (!filteredSongs.length) {
      setError('No songs selected for the playlist.');
      return;
    }

    const trackUris = filteredSongs.filter(item => item?.track?.uri).map(item => item.track.uri);
    // Use custom name if provided, else default
    const playlistName = customPlaylistName.trim() || (selectedGenres.length ? `My ${selectedGenres.join(', ')} Playlist` : 'My Filtered Playlist');

    try {
      setError(null);
      const res = await fetchWithTokenRefresh(
        async () => await axios.post('http://localhost:5000/spotify/create-playlist', {
          access_token: accessToken,
          name: playlistName,
          trackUris
        }),
        null
      );
      alert(`🎉 Playlist created!\n${res.data.playlistUrl}`);
    } catch {
      setError('Failed to create playlist.');
    }
  };

  const genreOptions = useMemo(() => {
    const genreList = showAllGenres ? genres : genres.filter(g => MAIN_GENRES.includes(g));
    return genreList.map(genre => ({ value: genre, label: genre }));
  }, [genres, showAllGenres]);

  const customSelectStyles = {
    control: provided => ({
      ...provided,
      backgroundColor: '#1F1F1F',
      borderColor: '#1F1F1F',
      color: '#ffffff',
      padding: '0.5rem',
      borderRadius: '0.5rem',
      boxShadow: 'none',
      '&:hover': { borderColor: '#1DB954' },
      '&:focus-within': { borderColor: '#1DB954', boxShadow: '0 0 0 2px #1DB954' }
    }),
    menu: provided => ({
      ...provided,
      backgroundColor: '#121212',
      color: '#ffffff',
      borderRadius: '0.5rem',
      maxHeight: '240px',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { width: '6px', background: 'transparent' },
      '&::-webkit-scrollbar-thumb': { background: '#23272f', borderRadius: '6px' }
    }),
    menuList: provided => ({
      ...provided,
      padding: 0,
      maxHeight: '230px',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { width: '6px', background: 'transparent' },
      '&::-webkit-scrollbar-thumb': { background: '#23272f', borderRadius: '6px' }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#1DB954' : '#121212',
      color: state.isSelected ? '#121212' : '#ffffff',
      '&:hover': { backgroundColor: '#374151' }
    }),
    multiValue: provided => ({
      ...provided,
      backgroundColor: '#374151',
      color: '#ffffff'
    }),
    multiValueLabel: provided => ({
      ...provided,
      color: '#ffffff'
    }),
    multiValueRemove: provided => ({
      ...provided,
      color: '#ffffff',
      '&:hover': { backgroundColor: '#1DB954', color: '#121212' }
    }),
    placeholder: provided => ({
      ...provided,
      color: '#9CA3AF'
    }),
    input: provided => ({
      ...provided,
      color: '#ffffff'
    })
  };

  // Deduplication logic (single step, backend handles everything)
  const handleDeduplicate = async () => {
    setDedupLoading(true);
    setDedupError(null);
    setDedupResult(null);
    try {
      const res = await axios.post('http://localhost:5000/spotify/deduplicate-playlist', {
        access_token: accessToken,
        playlist_id: selectedPlaylist
      });
      setDedupResult({ removed: res.data.removed });
      await handlePlaylistSelect({ target: { value: selectedPlaylist } });
    } catch {
      setDedupError('Failed to deduplicate playlist.');
    }
    setDedupLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white p-6 md:p-8 scrollbar-thin">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center">
          <img src="/WhatsApp_Image_2025-06-27_at_10.41.04_AM-removebg-preview.png" alt="Spopify Logo" className="w-10 h-10 mr-2 rounded-full bg-white" />
          Spopify
        </h1>
      </header>

      {error && (
        <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6 text-center">
          {error}
        </div>
      )}

      {!accessToken ? (
        <button
          onClick={handleLogin}
          className="bg-spotify-green text-dark-bg font-semibold py-2 px-6 rounded-full hover:bg-green-500"
        >
          Login with Spotify
        </button>
      ) : (
        <div className="max-w-3xl mx-auto">
          {playlists.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Select a Playlist</h3>
              <select
                onChange={handlePlaylistSelect}
                value={selectedPlaylist}
                className="w-full bg-dark-surface text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotify-green"
              >
                <option value="">-- Choose Playlist --</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id} className="bg-dark-bg">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Deduplication Feature: Show only when no playlist is selected */}
          {!selectedPlaylist && (
            <div className="mb-8 bg-dark-surface rounded-lg p-6 flex flex-col items-center border border-gray-800 shadow">
              <h3 className="text-lg font-semibold mb-2">Deduplicate Playlist</h3>
              <p className="text-gray-400 mb-4 text-center">Select a playlist to enable deduplication. This feature will help you find and remove duplicate songs from your playlist.</p>
              <button
                className="bg-gray-700 text-white py-2 px-6 rounded-full font-semibold opacity-60 cursor-not-allowed"
                disabled
              >
                Deduplicate
              </button>
            </div>
          )}

          {/* Deduplication Feature: Show when a playlist is selected */}
          {selectedPlaylist && (
            <DedupBar
              dedupLoading={dedupLoading}
              dedupError={dedupError}
              dedupResult={dedupResult}
              handleDeduplicate={handleDeduplicate}
            />
          )}

          {loadingGenres && (
            <div className="flex items-center justify-center mb-6">
              <ClipLoader color="#1DB954" size={30} />
              <p className="ml-3 text-gray-400">Loading genres for {trackCount} tracks...</p>
            </div>
          )}

          {genres.length > 0 && !loadingGenres && (
            <GenreSelectBar
              genres={genres}
              showAllGenres={showAllGenres}
              setShowAllGenres={setShowAllGenres}
              genreOptions={genreOptions}
              selectedGenres={selectedGenres}
              handleGenreChange={handleGenreChange}
              customSelectStyles={customSelectStyles}
              handleClearGenres={handleClearGenres}
            />
          )}

          {loadingFilter && (
            <div className="flex items-center justify-center mb-6">
              <ClipLoader color="#1DB954" size={30} />
              <p className="ml-3 text-gray-400">Loading filtered songs...</p>
            </div>
          )}

          {filteredSongs.length > 0 && !loadingFilter && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Songs in {selectedGenres.length ? selectedGenres.join(', ') : 'Selected Genres'} ({filteredSongs.length})
              </h3>
              <ErrorBoundary>
                <ul>
                  {filteredSongs.map((item, idx) => (
                    <li key={item.track.id || idx} className="flex items-center p-4 bg-dark-surface rounded-lg hover:bg-gray-700">
                      <span className="flex-1 truncate">{item.track.name}</span>
                      <span className="text-gray-400 truncate">{item.track.artists.map(a => a.name || 'Unknown Artist').join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </ErrorBoundary>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="text"
                  value={customPlaylistName}
                  onChange={e => setCustomPlaylistName(e.target.value)}
                  placeholder="Enter playlist name..."
                  className="bg-dark-bg text-white rounded px-3 py-2 flex-1"
                  style={{ minWidth: 200 }}
                />
                <button
                  onClick={createPlaylist}
                  className="bg-spotify-green text-dark-bg font-semibold py-2 px-6 rounded-full hover:bg-green-500"
                >
                  ➕ Create Playlist
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;