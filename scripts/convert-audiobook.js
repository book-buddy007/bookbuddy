/**
 * Script to convert audiobooks to YouTube-compatible videos with cover image
 * Usage: node convert-audiobook.js <audio-file> <cover-image> <output-file>
 * 
 * Requirements:
 * - ffmpeg installed and available in PATH
 * - Node.js v14+
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: node convert-audiobook.js <audio-file> <cover-image> <output-file>');
  process.exit(1);
}

const [audioFile, coverImage, outputFile] = args;

// Validate files exist
if (!fs.existsSync(audioFile)) {
  console.error(`Audio file not found: ${audioFile}`);
  process.exit(1);
}

if (!fs.existsSync(coverImage)) {
  console.error(`Cover image not found: ${coverImage}`);
  process.exit(1);
}

console.log('Converting audiobook to YouTube video...');
console.log(`Audio: ${audioFile}`);
console.log(`Cover: ${coverImage}`);
console.log(`Output: ${outputFile}`);

try {
  // Build ffmpeg command
  // This creates a video with the cover image as a static frame
  // and the audio track from the audiobook
  const ffmpegCmd = `ffmpeg -loop 1 -i "${coverImage}" -i "${audioFile}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputFile}"`;
  
  console.log('\nExecuting ffmpeg command...');
  
  // Execute the command
  execSync(ffmpegCmd, { stdio: 'inherit' });
  
  console.log('\nConversion complete!');
  console.log(`Output file: ${outputFile}`);
  
  // Calculate file size
  const stats = fs.statSync(outputFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`File size: ${fileSizeMB} MB`);
  console.log('\nNext steps:');
  console.log('1. Upload the video to YouTube as an unlisted video');
  console.log('2. Copy the YouTube video ID and add it to your database');
  console.log('3. Implement the YoutubeAudioPlayer component to play the audio');
  
} catch (error) {
  console.error('Error during conversion:', error.message);
  process.exit(1);
} 