import React from 'react';
import Select, { createFilter } from 'react-select';

const GenreFilter = ({
  genres,
  showAllGenres,
  setShowAllGenres,
  genreOptions,
  selectedGenres,
  handleGenreChange,
  customSelectStyles,
  handleClearGenres
}) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-2">Filter by Genres</h3>
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setShowAllGenres(v => !v)}
        className={`transition-colors font-semibold rounded-full px-4 py-2 border-2 border-spotify-green focus:outline-none focus:ring-2 focus:ring-spotify-green text-base ${showAllGenres ? 'bg-spotify-green text-black' : 'bg-black text-spotify-green'}`}
        style={{ minWidth: 120 }}
        aria-pressed={showAllGenres}
      >
        {showAllGenres ? 'All Genres' : 'Main Genres'}
      </button>
      <Select
        isMulti
        options={genreOptions}
        value={genreOptions.filter(option => selectedGenres.includes(option.value))}
        onChange={handleGenreChange}
        styles={customSelectStyles}
        placeholder="Select genres..."
        className="flex-1"
        filterOption={createFilter({ ignoreAccents: false })}
        aria-label="Select multiple genres"
      />
      {selectedGenres.length > 0 && (
        <button
          onClick={handleClearGenres}
          className="bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
        >
          Clear All
        </button>
      )}
    </div>
  </div>
);

export default GenreFilter;
