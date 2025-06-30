# Spopify - Spotify Playlist Manager

## Overview
Spopify is a full-stack web application designed to enhance the Spotify experience by providing advanced playlist management features. Users can authenticate with Spotify, filter songs by genre, remove duplicate tracks, create new playlists, and generate creative playlist names using AI. This project serves as a capstone submission, demonstrating a range of web development concepts including API integration, React development, and deployment.

## Features
- **Spotify Authentication**: Secure login using Spotify OAuth.
- **Genre Filtering**: Filter playlist tracks based on genres detected from Spotify and Last.fm APIs, with user-defined genre support.
- **Playlist Deduplication**: Identify and remove duplicate songs from playlists.
- **Playlist Creation**: Generate new playlists from filtered songs with customizable names.
- **AI-Powered Suggestions**: Use LangChain.js with Cohere to suggest creative playlist names based on selected genres.
- **User Interaction**: Add or remove custom genres for individual tracks via a modal interface.
- **Responsive UI**: Built with React and styled using Tailwind CSS for a modern, user-friendly design.

## Technologies
- **Frontend**: React, React-Select, Tailwind CSS, InfiniteLoader, ClipLoader
- **Backend**: Node.js, Express, Mongoose (MongoDB)
- **APIs**: Spotify API, Last.fm API
- **AI**: LangChain.js with Cohere
- **Security**: Helmet, Rate Limiting (express-rate-limit)
- **Containerization**: Docker
- **Deployment**: Planned on Render (backend) and Vercel (frontend)

## Prerequisites
- Node.js (v18.x or later)
- MongoDB Atlas account (free tier)
- Spotify Developer Account (for API credentials)
- Last.fm API Key
- Cohere API Key (for AI suggestions)

## Installation

### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/kalviumcommunity/S66_AbdulRahman_Capstone_GenreFilter
   cd S66_AbdulRahman_Capstone_GenreFilter