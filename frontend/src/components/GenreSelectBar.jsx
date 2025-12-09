import React from 'react';
import Select, { createFilter } from 'react-select';

function GenreSelectBar({
  genres,
  showAllGenres,
  setShowAllGenres,
  genreOptions,
  selectedGenres,
  handleGenreChange,
  customSelectStyles,
  handleClearGenres
}) {
  return (
    <div className="card mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold">Filter by Genre</h3>

        {/* Toggle + Clear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllGenres(v => !v)}
            className={`btn text-sm px-4 py-2 ${showAllGenres
                ? 'bg-accent text-base'
                : 'bg-surface text-secondary border border-border hover:border-border-light'
              }`}
            aria-pressed={showAllGenres}
          >
            {showAllGenres ? 'All Genres' : 'Main Genres'}
          </button>

          {selectedGenres.length > 0 && (
            <button
              onClick={handleClearGenres}
              className="btn-ghost text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <Select
        isMulti
        options={genreOptions}
        value={genreOptions.filter(option => selectedGenres.includes(option.value))}
        onChange={handleGenreChange}
        styles={customSelectStyles}
        placeholder="Search and select genres..."
        className="w-full"
        filterOption={createFilter({ ignoreAccents: false })}
        aria-label="Select multiple genres"
        noOptionsMessage={() => 'No genres found'}
      />

      {/* Selected count */}
      {selectedGenres.length > 0 && (
        <p className="text-sm text-muted mt-3">
          {selectedGenres.length} genre{selectedGenres.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

export default GenreSelectBar;
