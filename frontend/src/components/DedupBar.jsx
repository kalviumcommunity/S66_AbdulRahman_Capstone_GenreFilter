import React from 'react';

function DedupBar({
  dedupLoading,
  dedupError,
  dedupResult,
  handleDeduplicate
}) {
  return (
    <div className="mb-8 bg-dark-surface rounded-lg p-6 flex flex-col items-center border border-gray-800 shadow">
      <h3 className="text-lg font-semibold mb-2">Deduplicate Playlist</h3>
      <p className="text-gray-400 mb-4 text-center">Click below to remove duplicate songs from this playlist.</p>
      <button
        className="bg-spotify-green text-dark-bg font-semibold py-2 px-6 rounded-full hover:bg-green-500 mb-4"
        onClick={handleDeduplicate}
        disabled={dedupLoading}
      >
        {dedupLoading ? 'Deduplicating...' : 'Deduplicate'}
      </button>
      {dedupError && <div className="text-red-400 mb-2">{dedupError}</div>}
      {dedupResult && (
        <div className="w-full">
          {dedupResult.removed > 0 ? (
            <div className="text-green-400">Removed {dedupResult.removed} duplicate songs!</div>
          ) : (
            <div className="text-green-400">No duplicates found in this playlist!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default DedupBar;
