import React from 'react';
import { ClipLoader } from 'react-spinners';

function DedupBar({
  dedupLoading,
  dedupError,
  dedupResult,
  handleDeduplicate
}) {
  return (
    <div className="card mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🧹</span>
        </div>

        {/* Content */}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-semibold mb-1">Deduplicate Playlist</h3>
          <p className="text-secondary text-sm">
            Find and remove duplicate songs from this playlist.
          </p>
        </div>

        {/* Button */}
        <button
          className="btn-primary"
          onClick={handleDeduplicate}
          disabled={dedupLoading}
        >
          {dedupLoading ? (
            <>
              <ClipLoader color="#0a0a0a" size={16} className="mr-2" />
              Processing...
            </>
          ) : (
            'Deduplicate'
          )}
        </button>
      </div>

      {/* Error Message */}
      {dedupError && (
        <div className="mt-4 p-3 rounded-xl bg-error-bg border border-error">
          <p className="text-error text-sm text-center">{dedupError}</p>
        </div>
      )}

      {/* Success Message */}
      {dedupResult && (
        <div className="mt-4 p-3 rounded-xl bg-success-bg border border-success">
          <p className="text-success text-sm text-center">
            {dedupResult.removed > 0
              ? `✓ Removed ${dedupResult.removed} duplicate song${dedupResult.removed > 1 ? 's' : ''}!`
              : '✓ No duplicates found in this playlist!'
            }
          </p>
        </div>
      )}
    </div>
  );
}

export default DedupBar;
