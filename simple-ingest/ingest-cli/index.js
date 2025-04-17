const { Command } = require('commander');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const program = new Command();

program
  .requiredOption('-f, --file <path>', 'Path to the file to upload')
  .requiredOption('-u, --url <url>', 'URL of the ingest worker endpoint')
  .option('-s, --source <source>', 'Source description of the file', 'CLI Upload')
  .option('-t, --type <type>', 'Upload type: "simple" or "post"', 'simple')
  .option('--text <text>', 'Post text (required for post type)')
  .option('--author-id <authorId>', 'Author ID (required for post type)')
  .option('--author-username <username>', 'Author username (required for post type)')
  .option('--tags <tags>', 'Comma-separated tags for post type');

program.parse();
const options = program.opts();

// Ensure the URL points to the new endpoint
const getApiUrl = (url) => {
  // Remove any trailing /ingest or /api/ingest
  const baseUrl = url.replace(/\/(api\/)?ingest$/, '');
  return `${baseUrl}/api/ingest`;
};

async function uploadFile() {
  try {
    // Verify file exists
    if (!fs.existsSync(options.file)) {
      console.error(`File not found: ${options.file}`);
      process.exit(1);
    }

    // Create form data
    const form = new FormData();
    const fileStream = fs.createReadStream(options.file);
    
    if (options.type === 'post') {
      // Validate required fields for post type
      if (!options.text) {
        console.error('--text is required for post type');
        process.exit(1);
      }
      if (!options.authorId) {
        console.error('--author-id is required for post type');
        process.exit(1);
      }
      if (!options.authorUsername) {
        console.error('--author-username is required for post type');
        process.exit(1);
      }

      // Add file to form data
      form.append('files', fileStream);

      // Create post metadata
      const metadata = {
        type: 'post',
        metadata: {
          id: uuidv4(),
          author: {
            id: options.authorId,
            username: options.authorUsername
          },
          content: {
            text: options.text
          },
          timestamp: new Date().toISOString(),
          tags: options.tags ? options.tags.split(',').map(tag => tag.trim()) : []
        }
      };

      form.append('metadata', JSON.stringify(metadata));
    } else {
      // Simple upload
      form.append('files', fileStream);
      form.append('source', options.source);
      form.append('filename', path.basename(options.file));
    }

    // Send request
    const apiUrl = getApiUrl(options.url);
    console.log(`Uploading ${options.file} to ${apiUrl}...`);
    console.log(`Upload type: ${options.type}`);
    
    const response = await axios.post(apiUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
    });

    console.log('Upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Check for deprecation notice
    const deprecationNotice = response.headers['x-deprecation-notice'];
    if (deprecationNotice) {
      console.warn('\nWarning:', deprecationNotice);
    }
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

uploadFile(); 