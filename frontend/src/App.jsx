import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { ClipLoader } from 'react-spinners';
import Select, { createFilter } from 'react-select';
import Modal from 'react-modal';
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

Modal.setAppElement('#root'); // Ensure modal accessibility

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

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

  // Modal state
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [modalTrack, setModalTrack] = useState(null);
  const [modalTrackGenres, setModalTrackGenres] = useState([]);
  const [modalUserGenres, setModalUserGenres] = useState([]);
  const [genreAddValue, setGenreAddValue] = useState('');
  const [genreModalLoading, setGenreModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  // Helper: get Spotify userId (fetch on login, or store in state/localStorage)
  useEffect(() => {
    if (accessToken && !spotifyUserId) {
      axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).then(res => setSpotifyUserId(res.data.id)).catch(() => { });
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
      const response = await axios.post(`${API_BASE_URL}/refresh_token`, { refresh_token: storedRefreshToken });
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
        const res = await axios.get(`${API_BASE_URL}/spotify/user-playlists?access_token=${token}`);
        setPlaylists(res.data);
        setError(null);
        return res;
      }, `${API_BASE_URL}/spotify/user-playlists?access_token=${token}`);
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
    window.location.href = `${API_BASE_URL}/auth/login`;
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
            const res = await axios.get(`${API_BASE_URL}/spotify/artist-genres?${queryParams}`);
            return res.data;
          },
          `${API_BASE_URL}/spotify/artist-genres?${queryParams}`
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
        const res = await axios.get(`${API_BASE_URL}/spotify/artist-genres-lastfm?${queryParams}`);
        return res.data;
      },
      `${API_BASE_URL}/spotify/artist-genres-lastfm?${queryParams}`
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
        async () => await axios.get(`${API_BASE_URL}/spotify/playlist-tracks?access_token=${accessToken}&playlist_id=${playlistId}`),
        `${API_BASE_URL}/spotify/playlist-tracks?access_token=${accessToken}&playlist_id=${playlistId}`
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
            const response = await axios.get(`${API_BASE_URL}/fallback-artist-genres`, {
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
        async () => await axios.post(`${API_BASE_URL} /spotify/create - playlist`, {
          access_token: accessToken,
          name: playlistName,
          trackUris
        }),
        null
      );
      alert(`🎉 Playlist created!\n${res.data.playlistUrl} `);
    } catch {
      setError('Failed to create playlist.');
    }
  };

  const genreOptions = useMemo(() => {
    const genreList = showAllGenres ? genres : genres.filter(g => MAIN_GENRES.includes(g));
    return genreList.map(genre => ({ value: genre, label: genre }));
  }, [genres, showAllGenres]);

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#1a1a1a',
      borderColor: state.isFocused ? '#1DB954' : '#282828',
      color: '#ffffff',
      padding: '0.25rem',
      borderRadius: '0.75rem',
      boxShadow: state.isFocused ? '0 0 0 1px #1DB954' : 'none',
      transition: 'all 0.2s ease',
      '&:hover': { borderColor: '#3a3a3a' }
    }),
    menu: provided => ({
      ...provided,
      backgroundColor: '#141414',
      color: '#ffffff',
      borderRadius: '0.75rem',
      border: '1px solid #282828',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      marginTop: '0.5rem'
    }),
    menuList: provided => ({
      ...provided,
      padding: '0.25rem',
      maxHeight: '200px',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: '#3a3a3a #141414'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#1DB954' : state.isFocused ? '#242424' : 'transparent',
      color: state.isSelected ? '#0a0a0a' : '#ffffff',
      borderRadius: '0.5rem',
      padding: '0.625rem 0.75rem',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease'
    }),
    multiValue: provided => ({
      ...provided,
      backgroundColor: '#1DB95420',
      border: '1px solid #1DB954',
      borderRadius: '9999px',
      padding: '0 0.25rem'
    }),
    multiValueLabel: provided => ({
      ...provided,
      color: '#1DB954',
      fontSize: '0.875rem',
      padding: '0.125rem 0.25rem'
    }),
    multiValueRemove: provided => ({
      ...provided,
      color: '#1DB954',
      borderRadius: '9999px',
      '&:hover': { backgroundColor: '#1DB954', color: '#0a0a0a' }
    }),
    placeholder: provided => ({
      ...provided,
      color: '#6a6a6a'
    }),
    input: provided => ({
      ...provided,
      color: '#ffffff'
    }),
    singleValue: provided => ({
      ...provided,
      color: '#ffffff'
    }),
    noOptionsMessage: provided => ({
      ...provided,
      color: '#6a6a6a'
    })
  };

  // Deduplication logic (single step, backend handles everything)
  const handleDeduplicate = async () => {
    setDedupLoading(true);
    setDedupError(null);
    setDedupResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL} /spotify/deduplicate - playlist`, {
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

  // Helper to fetch user genres for a track
  const fetchUserGenres = async (trackId) => {
    if (!spotifyUserId || !trackId) return [];
    try {
      const res = await axios.get(`${API_BASE_URL} /user/track - genres`, {
        params: { userId: spotifyUserId, trackId }
      });
      return res.data.genres || [];
    } catch (err) {
      console.error('Failed to fetch user genres:', err);
      return [];
    }
  };

  // Open genre modal for a track
  const openGenreModal = async (track) => {
    setModalTrack(track);
    setGenreModalOpen(true);
    setGenreModalLoading(true);
    setModalError(null);
    setModalSuccess(null);
    setModalTrackGenres(track.genres || []);
    try {
      const userGenres = await fetchUserGenres(track.track.id);
      setModalUserGenres(userGenres);
    } catch (err) {
      setModalError('Failed to load user genres.');
    } finally {
      setGenreModalLoading(false);
    }
  };

  // Add a user genre
  const handleAddUserGenre = async () => {
    if (!genreAddValue || !spotifyUserId || !modalTrack) return;
    setGenreModalLoading(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      await axios.post(`${API_BASE_URL} /user/track - genres`, {
        userId: spotifyUserId,
        trackId: modalTrack.track.id,
        genre: genreAddValue
      });
      const updatedGenres = await fetchUserGenres(modalTrack.track.id);
      setModalUserGenres(updatedGenres);
      setModalSuccess('Genre added successfully!');
      setGenreAddValue('');
    } catch (err) {
      setModalError('Failed to add genre.');
      console.error('Add genre error:', err);
    }
    setGenreModalLoading(false);
  };

  // Remove a user genre
  const handleRemoveUserGenre = async (genre) => {
    if (!spotifyUserId || !modalTrack) return;
    setGenreModalLoading(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      await axios.delete(`${API_BASE_URL} /user/track - genres`, {
        data: { userId: spotifyUserId, trackId: modalTrack.track.id, genre }
      });
      const updatedGenres = await fetchUserGenres(modalTrack.track.id);
      setModalUserGenres(updatedGenres);
      setModalSuccess('Genre removed successfully!');
    } catch (err) {
      setModalError('Failed to remove genre.');
      console.error('Remove genre error:', err);
    } finally {
      setGenreModalLoading(false);
    }
  };

  // Song row with modal open on click
  const SongRow = useCallback(({ index, style }) => {
    const item = filteredSongs[index];
    if (!item?.track?.name || !item?.track?.artists) {
      return (
        <div style={style} className="flex items-center p-4 bg-dark-surface rounded-lg">
          <span className="text-gray-400">Invalid track data</span>
        </div>
      );
    }
    return (
      <li style={style} className="flex items-center p-4 bg-dark-surface rounded-lg hover:bg-gray-700 cursor-pointer" onClick={() => openGenreModal(item)}>
        <span className="flex-1 truncate">{item.track.name}</span>
        <span className="text-gray-400 truncate">{item.track.artists.map(a => a.name || 'Unknown Artist').join(', ')}</span>
      </li>
    );
  }, [filteredSongs]);

  return (
    <div className="min-h-screen bg-base text-primary scrollbar-thin">
      {/* Login Screen */}
      {!accessToken ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-md animate-fade-in">
            {/* Logo and Title */}
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center overflow-hidden">
                <img
                  src="/WhatsApp_Image_2025-06-27_at_10.41.04_AM-removebg-preview.png"
                  alt="Spopify Logo"
                  className="w-16 h-16 object-contain"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="text-gradient">Spopify</span>
              </h1>
              <p className="text-secondary text-lg">
                Filter your Spotify playlists by genre
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface flex items-center justify-center">
                  <span className="text-xl">🎵</span>
                </div>
                <p className="text-xs text-muted">Filter by Genre</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface flex items-center justify-center">
                  <span className="text-xl">🧹</span>
                </div>
                <p className="text-xs text-muted">Remove Duplicates</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
                <p className="text-xs text-muted">Create Playlists</p>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="btn-primary text-lg px-12 py-4 rounded-full shadow-glow"
            >
              Login with Spotify
            </button>
          </div>
        </div>
      ) : (
        /* Dashboard */
        <div className="max-w-4xl mx-auto p-6 md:p-8 animate-fade-in">
          {/* Header */}
          <header className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center overflow-hidden">
                <img
                  src="/WhatsApp_Image_2025-06-27_at_10.41.04_AM-removebg-preview.png"
                  alt="Spopify Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-gradient">Spopify</h1>
            </div>
          </header>

          {/* Error Alert */}
          {error && (
            <div className="card bg-error-bg border-error mb-6 animate-slide-up">
              <p className="text-error text-center">{error}</p>
            </div>
          )}

          {/* Playlist Selector */}
          {playlists.length > 0 && (
            <div className="card mb-6">
              <label className="block text-sm font-medium text-secondary mb-3">
                Select a Playlist
              </label>
              <select
                onChange={handlePlaylistSelect}
                value={selectedPlaylist}
                className="select"
              >
                <option value="">Choose a playlist...</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Deduplication Panel */}
          {!selectedPlaylist ? (
            <div className="card text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center">
                <span className="text-2xl">🧹</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Deduplicate Playlist</h3>
              <p className="text-secondary text-sm mb-4 max-w-sm mx-auto">
                Select a playlist above to find and remove duplicate songs.
              </p>
              <button className="btn-secondary opacity-50 cursor-not-allowed" disabled>
                Deduplicate
              </button>
            </div>
          ) : (
            <DedupBar
              dedupLoading={dedupLoading}
              dedupError={dedupError}
              dedupResult={dedupResult}
              handleDeduplicate={handleDeduplicate}
            />
          )}

          {/* Loading Genres */}
          {loadingGenres && (
            <div className="card flex items-center justify-center gap-3 mb-6">
              <ClipLoader color="#1DB954" size={24} />
              <p className="text-secondary">Loading genres for {trackCount} tracks...</p>
            </div>
          )}

          {/* Genre Filter */}
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

          {/* Loading Filter */}
          {loadingFilter && (
            <div className="card flex items-center justify-center gap-3 mb-6">
              <ClipLoader color="#1DB954" size={24} />
              <p className="text-secondary">Filtering songs...</p>
            </div>
          )}

          {/* Filtered Songs */}
          {filteredSongs.length > 0 && !loadingFilter && (
            <div className="card mb-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedGenres.length ? selectedGenres.join(', ') : 'Selected Genres'}
                </h3>
                <span className="tag tag-accent">{filteredSongs.length} songs</span>
              </div>

              <ErrorBoundary>
                <ul className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin -mx-2 px-2">
                  {filteredSongs.map((item, idx) => (
                    <li
                      key={item.track?.id || idx}
                      className="song-row"
                      onClick={() => openGenreModal(item)}
                    >
                      {/* Track Number */}
                      <span className="w-6 text-center text-muted text-sm">{idx + 1}</span>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.track?.name || 'Unknown Track'}</p>
                        <p className="text-sm text-secondary truncate">
                          {item.track?.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                        </p>
                      </div>

                      {/* Genres */}
                      <div className="hidden sm:flex gap-1">
                        {item.genres?.slice(0, 2).map((g, i) => (
                          <span key={i} className="tag tag-default text-xs">{g}</span>
                        ))}
                        {item.genres?.length > 2 && (
                          <span className="tag tag-default text-xs">+{item.genres.length - 2}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ErrorBoundary>

              {/* Create Playlist Section */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-border">
                <input
                  type="text"
                  value={customPlaylistName}
                  onChange={e => setCustomPlaylistName(e.target.value)}
                  placeholder="Enter playlist name..."
                  className="input flex-1"
                />
                <button
                  onClick={createPlaylist}
                  className="btn-primary whitespace-nowrap"
                >
                  <span className="mr-2">✨</span>
                  Create Playlist
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Genre Modal */}
      <Modal
        isOpen={genreModalOpen}
        onRequestClose={() => {
          setGenreModalOpen(false);
          setModalError(null);
          setModalSuccess(null);
        }}
        className="modal-content"
        overlayClassName="modal-overlay"
        ariaHideApp={false}
      >
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
          onClick={() => {
            setGenreModalOpen(false);
            setModalError(null);
            setModalSuccess(null);
          }}
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">Track Genres</h2>

        {modalTrack ? (
          <>
            {/* Track Info */}
            <div className="mb-6 pb-4 border-b border-border">
              <p className="font-semibold text-lg">{modalTrack.track?.name}</p>
              <p className="text-secondary">
                {modalTrack.track?.artists?.map(a => a.name).join(', ')}
              </p>
            </div>

            {/* Auto-detected Genres */}
            <div className="mb-4">
              <p className="text-sm text-muted mb-2">Auto-detected genres</p>
              <div className="flex flex-wrap gap-2">
                {modalTrackGenres.length > 0 ? (
                  modalTrackGenres.map((g, i) => (
                    <span key={g + i} className="tag tag-default">{g}</span>
                  ))
                ) : (
                  <span className="text-muted text-sm">No genres detected</span>
                )}
              </div>
            </div>

            {/* User Genres */}
            <div className="mb-4">
              <p className="text-sm text-muted mb-2">Your custom genres</p>
              <div className="flex flex-wrap gap-2">
                {genreModalLoading ? (
                  <ClipLoader color="#1DB954" size={16} />
                ) : modalUserGenres.length === 0 ? (
                  <span className="text-muted text-sm">None added yet</span>
                ) : (
                  modalUserGenres.map(g => (
                    <span key={g} className="tag tag-accent group">
                      {g}
                      <button
                        className="ml-1.5 opacity-60 hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveUserGenre(g)}
                        title="Remove genre"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Feedback Messages */}
            {modalError && (
              <div className="tag tag-error mb-4">{modalError}</div>
            )}
            {modalSuccess && (
              <div className="tag tag-success mb-4">{modalSuccess}</div>
            )}

            {/* Add Genre */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <select
                value={genreAddValue}
                onChange={e => setGenreAddValue(e.target.value)}
                className="select flex-1"
                disabled={genreModalLoading}
              >
                <option value="">Add a genre...</option>
                {MAIN_GENRES.filter(g => !modalUserGenres.includes(g)).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button
                onClick={handleAddUserGenre}
                className="btn-primary px-4"
                disabled={genreModalLoading || !genreAddValue}
              >
                {genreModalLoading ? <ClipLoader color="#0a0a0a" size={16} /> : '+'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <ClipLoader color="#1DB954" size={24} />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;